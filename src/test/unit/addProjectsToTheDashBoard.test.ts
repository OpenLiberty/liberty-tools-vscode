/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// This test runs in plain Node, not inside a real VS Code window.
import { installFakeVscode } from "./fakeVscode";
import * as sinon from "sinon";

// Keep one shared reference to the fake VS Code message API so each test can
// inspect whether addProjectsToTheDashBoard() asked VS Code to show the right message.
const showInformationMessageStub = sinon.stub();

// Install the shared vscode fake, must happen before any extension imports.
// Pass our sinon stub so the fake window.showInformationMessage is observable.
installFakeVscode({ showInformationMessage: showInformationMessageStub });

import * as assert from "assert";
import { addProjectsToTheDashBoard } from "../../liberty/devCommands";

describe("addProjectsToTheDashBoard", () => {

    afterEach(() => {
        showInformationMessageStub.resetHistory();
        sinon.restore();
    });

    // Run the same wrapper test for all 3 return codes from addUserSelectedPath():
    //   0 = added successfully
    //   1 = project already exists
    //   2 = not a Maven or Gradle project
    [
        { result: 0, expectedMessage: "add.project.manually.message.0:/my/project" },
        { result: 1, expectedMessage: "add.project.manually.message.1:/my/project" },
        { result: 2, expectedMessage: "add.project.manually.message.2:/my/project" }
    ].forEach(({ result, expectedMessage }) => {
        it(`shows the expected message and refreshes the dashboard when addUserSelectedPath returns ${result}`, async () => {
            const addUserSelectedPathStub = sinon.stub().resolves(result);
            const getProjectsStub = sinon.stub().returns(new Map());
            const fireChangeEventStub = sinon.stub();
            const consoleInfoStub = sinon.stub(console, "info");
            const consoleErrorStub = sinon.stub(console, "error");

            const projectProvider = {
                addUserSelectedPath: addUserSelectedPathStub,
                getProjects: getProjectsStub,
                fireChangeEvent: fireChangeEventStub
            } as any;

            await addProjectsToTheDashBoard(projectProvider, "/my/project");

            assert.equal(addUserSelectedPathStub.calledOnceWithExactly("/my/project", getProjectsStub.firstCall.returnValue), true);
            assert.equal(fireChangeEventStub.calledOnce, true);
            assert.equal(showInformationMessageStub.calledOnceWithExactly(expectedMessage), true);
            assert.equal(result === 0 ? consoleInfoStub.calledOnceWithExactly(expectedMessage) : consoleErrorStub.calledOnceWithExactly(expectedMessage), true);
        });
    });
});
