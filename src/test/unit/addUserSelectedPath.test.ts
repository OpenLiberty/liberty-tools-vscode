// This test runs in plain Node, not inside a real VS Code window.
// Set the minimum localization config early so extension imports do not crash.
process.env.VSCODE_NLS_CONFIG = JSON.stringify({ locale: "en" });

// When production code imports "vscode", return a tiny fake object instead.
// We only provide the pieces ProjectProvider touches during this test.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;
Module._load = function(request: string, ...args: any[]) {
    if (request === "vscode") {
        return {
            // ProjectProvider creates an EventEmitter in its constructor.
            EventEmitter: class { event = () => {}; fire() {} },
            TreeItemCollapsibleState: { None: 0 },
            TreeItem: class { constructor(label: string) { (this as any).label = label; } },
            Uri: { file: (p: string) => ({ fsPath: p }) },
            // refresh() temporarily shows a status bar message and later disposes it.
            window: {
                setStatusBarMessage: () => ({ dispose() {} })
            }
        };
    }
    return originalLoad.call(this, request, ...args);
};


import * as assert from "assert";
import * as sinon from "sinon";

import { ProjectProvider } from "../../liberty/libertyProject";
import { DashboardData } from "../../liberty/dashboard";

// Fake ExtensionContext for ProjectProvider.
// addUserSelectedPath() reads saved dashboard data from workspaceState and saves updates back to it.
const fakeContext: any = {
    workspaceState: {
        // Start with empty stored dashboard data.
        get: () => new DashboardData([], []),
        // Stubbed so each test can check whether a save happened.
        update: sinon.stub()
    },
    globalState: {
        get: () => undefined,
        update: sinon.stub(),
    }
};

describe("addUserSelectedPath", () => {

    let provider: ProjectProvider;

    before(() => {
        // Create the real ProjectProvider instance that owns addUserSelectedPath().
        provider = new ProjectProvider(fakeContext);
    });

    afterEach(() => {
        // Reset Sinon-created stubs so one test's fake behavior does not leak into another.
        sinon.restore();
    });

    // ─── Test 1 ───────────────────────────────────────────────────────────────
    // Scenario: the user manually picks a Maven project that is not already in the dashboard.
    // The add should succeed, update the live project map, and save the change.
    it("returns 0 and adds project to map when valid pom.xml exists", async () => {

        // These two stubs model the successful Maven path inside createLibertyProject().
        // existsSyncStub() means "pretend pom.xml exists".
        const existsSyncStub = sinon.stub().returns(true);
        // readFileStub() means "pretend reading pom.xml returned this XML".
        const readFileStub = sinon.stub().resolves(`<project><artifactId>my-app</artifactId></project>`);

        // Replace ProjectProvider's internal createLibertyProject() helper for this test only.
        // That keeps the test focused on addUserSelectedPath(): when project creation succeeds,
        // does it add the project, save it, and return the success code?
        (provider as any).createLibertyProject = async () => {
            if (existsSyncStub()) {
                await readFileStub();
                // Return the smallest fake project object addUserSelectedPath() needs.
                return {
                    getPath: () => "/my/project/pom.xml",
                    getLabel: () => "my-app",
                    getContextValue: () => "libertyMavenProject"
                };
            }
            // If project creation fails, the real helper would return undefined.
            return undefined;
        };

        // This map represents the live set of projects currently shown in the Liberty dashboard.
        // Start empty to model "project was not already in the dashboard".
        const existingProjects = new Map();

        // Call the real method under test.
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        // ASSERT
        // 0 means the manual add succeeded.
        assert.equal(result, 0);
        // The project should now appear in the live dashboard map.
        assert.equal(existingProjects.has("/my/project/pom.xml"), true);
        // The dashboard update should also be persisted to workspace storage.
        assert.equal(fakeContext.workspaceState.update.called, true);
    });

    // ─── Test 2 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder that is already in the Liberty dashboard.
    // addUserSelectedPath() should detect the duplicate and refuse to add it again.
    it("returns 1 and adds nothing when project already exists", async () => {

        // Clear any save calls left over from earlier tests.
        fakeContext.workspaceState.update.resetHistory();

        // provider.getProjects() is the provider's internal "already in the dashboard" map.
        // Put this path in the map first to simulate a project that Liberty Tools already knows about.
        const dashboardProjects = provider.getProjects();
        dashboardProjects.set("/my/project/pom.xml", {} as any);

        // This separate map is the live map passed into addUserSelectedPath().
        // It starts empty because this test is checking that nothing new gets added.
        const existingProjects = new Map();

        // Try to manually add the same project again.
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        // ASSERT
        // 1 means "project already exists".
        assert.equal(result, 1);

        // Because the project was a duplicate, addUserSelectedPath() should not add anything new.
        assert.equal(existingProjects.size, 0);

        // Because nothing changed, it should not save anything to workspace storage.
        assert.equal(fakeContext.workspaceState.update.called, false);

        // Clean up the provider's internal dashboard map so other tests stay isolated.
        dashboardProjects.clear();
    });

    // ─── Test 3 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder that is not a Maven or Gradle project.
    // The add should fail without changing dashboard state.
    it("returns 2 and adds nothing when no build file exists", async () => {

        // Clear any save calls recorded by earlier tests.
        fakeContext.workspaceState.update.resetHistory();
        // Force project creation to fail to model a folder with no pom.xml or build.gradle.
        (provider as any).createLibertyProject = async () => undefined;
    
        const existingProjects = new Map();
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        // ASSERT
        // 2 means the selected folder is not a Maven or Gradle project.
        assert.equal(result, 2);
        // Nothing should be added to the live dashboard map.
        assert.equal(existingProjects.size, 0);
        // Nothing should be saved because the add failed.
        assert.equal(fakeContext.workspaceState.update.called, false);
    });

});
