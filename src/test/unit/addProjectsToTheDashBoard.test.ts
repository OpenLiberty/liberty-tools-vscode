/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// This test runs in plain Node, not inside a real VS Code window.
// The extension's localization helper expects this env var to exist during import.
process.env.VSCODE_NLS_CONFIG = JSON.stringify({ locale: "en" });

// Intercept module loading so we can replace VS Code and localization imports
// with tiny fakes that are easy to reason about in a unit test.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;

// Fake localization helper.
// Instead of reading translation files, return a predictable string that includes:
//   1. the message key the command asked for
//   2. the selected project path passed into localize()
// Example result: "add.project.manually.message.0:/my/project"
const localizeStub = (key: string, selection: string) => `${key}:${selection}`;

// Return a tiny fake module whenever production code imports "vscode" or the i18n helper.
// devCommands.ts imports libertyProject.ts, and that file defines classes that extend
// vscode.TreeItem and create vscode.EventEmitter instances. So this fake must include
// enough of the VS Code API for those imports to load successfully.
Module._load = function(request: string, ...args: any[]) {
    if (request === "vscode") {
        return {
            EventEmitter: class { event = () => {}; fire() {} },
            TreeItemCollapsibleState: { None: 0 },
            TreeItem: class {
                label: string;
                collapsibleState: number;
                tooltip?: string;
                constructor(label: string, collapsibleState?: number) {
                    this.label = label;
                    this.collapsibleState = collapsibleState ?? 0;
                }
            },
            Uri: { file: (p: string) => ({ fsPath: p }) },
            window: {
                showInformationMessage: showInformationMessageStub,
                setStatusBarMessage: () => ({ dispose() {} })
            }
        };
    }
    if (request.endsWith("/util/i18nUtil") || request === "../util/i18nUtil") {
        return {
            localize: localizeStub
        };
    }
    return originalLoad.call(this, request, ...args);
};

import * as assert from "assert";
import * as sinon from "sinon";

// Keep one shared reference to the fake VS Code message API.
// The fake vscode module below returns this same stub, so each test can inspect
// whether addProjectsToTheDashBoard() asked VS Code to show the expected message.
const showInformationMessageStub = sinon.stub();

import { addProjectsToTheDashBoard } from "../../liberty/devCommands";

describe("addProjectsToTheDashBoard", () => {

    afterEach(() => {
        // Reset call history on the shared message stub between tests.
        showInformationMessageStub.resetHistory();
        // Restore console stubs so each test starts clean.
        sinon.restore();
    });

    // Run the same command-wrapper test for all 3 return codes from addUserSelectedPath():
    //   0 = added successfully
    //   1 = project already exists
    //   2 = not a Maven or Gradle project
    [
        { result: 0, expectedMessage: "add.project.manually.message.0:/my/project" },
        { result: 1, expectedMessage: "add.project.manually.message.1:/my/project" },
        { result: 2, expectedMessage: "add.project.manually.message.2:/my/project" }
    ].forEach(({ result, expectedMessage }) => {
        it(`shows the expected message and refreshes the dashboard when addUserSelectedPath returns ${result}`, async () => {
            // Pretend the lower-level worker method already finished and returned this result.
            // This keeps the test focused on the command wrapper behavior only.
            const addUserSelectedPathStub = sinon.stub().resolves(result);

            // addProjectsToTheDashBoard() passes projectProvider.getProjects() into addUserSelectedPath().
            // Return an empty map because the command wrapper does not care about its contents here.
            const getProjectsStub = sinon.stub().returns(new Map());

            // The command should tell the dashboard tree to refresh after it handles the result.
            const fireChangeEventStub = sinon.stub();

            // The command logs success with console.info() and non-success with console.error().
            const consoleInfoStub = sinon.stub(console, "info");
            const consoleErrorStub = sinon.stub(console, "error");

            // Fake ProjectProvider with only the methods addProjectsToTheDashBoard() actually calls.
            const projectProvider = {
                addUserSelectedPath: addUserSelectedPathStub,
                getProjects: getProjectsStub,
                fireChangeEvent: fireChangeEventStub
            } as any;

            // Call the real command wrapper under test.
            await addProjectsToTheDashBoard(projectProvider, "/my/project");

            // ASSERT: the command should pass the selected path and live projects map
            // into addUserSelectedPath().
            assert.equal(addUserSelectedPathStub.calledOnceWithExactly("/my/project", getProjectsStub.firstCall.returnValue), true);

            // ASSERT: the dashboard should be refreshed after the add attempt.
            assert.equal(fireChangeEventStub.calledOnce, true);

            // ASSERT: the user should see the message built from the result code.
            assert.equal(showInformationMessageStub.calledOnceWithExactly(expectedMessage), true);

            // ASSERT: success logs to console.info(); non-success logs to console.error().
            assert.equal(result === 0 ? consoleInfoStub.calledOnceWithExactly(expectedMessage) : consoleErrorStub.calledOnceWithExactly(expectedMessage), true);
        });
    });
});
