/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// This test runs in plain Node, not inside a real VS Code window.
import { installFakeVscode } from "./fakeVscode";
import * as sinon from "sinon";

// Install the shared vscode fake — must happen before any extension imports.
installFakeVscode();

import * as assert from "assert";
import { ProjectProvider } from "../../liberty/libertyProject";
import { DashboardData } from "../../liberty/dashboard";

// Fake ExtensionContext for ProjectProvider.
// addUserSelectedPath() reads saved dashboard data from workspaceState and saves updates back.
const fakeContext: any = {
    workspaceState: {
        get: () => new DashboardData([], []),
        update: sinon.stub()
    },
    globalState: {
        get: () => undefined,
        update: sinon.stub()
    }
};

describe("addUserSelectedPath", () => {

    let provider: ProjectProvider;

    before(() => {
        provider = new ProjectProvider(fakeContext);
    });

    afterEach(() => {
        sinon.restore();
    });

    // ─── Test 1 ───────────────────────────────────────────────────────────────
    // Scenario: the user manually picks a Maven project not already in the dashboard.
    it("returns 0 and adds project to map when valid pom.xml exists", async () => {
        (provider as any).createLibertyProject = async () => ({
            getPath: () => "/my/project/pom.xml",
            getLabel: () => "my-app",
            getContextValue: () => "libertyMavenProject"
        });

        const existingProjects = new Map();
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        assert.equal(result, 0);
        assert.equal(existingProjects.has("/my/project/pom.xml"), true);
        assert.equal(fakeContext.workspaceState.update.called, true);
    });

    // ─── Test 2 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder that is already in the Liberty dashboard.
    it("returns 1 and adds nothing when project already exists", async () => {
        fakeContext.workspaceState.update.resetHistory();

        const dashboardProjects = provider.getProjects();
        dashboardProjects.set("/my/project/pom.xml", {} as any);

        const existingProjects = new Map();
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        assert.equal(result, 1);
        assert.equal(existingProjects.size, 0);
        assert.equal(fakeContext.workspaceState.update.called, false);

        dashboardProjects.clear();
    });

    // ─── Test 3 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder with no pom.xml or build.gradle.
    it("returns 2 and adds nothing when no build file exists", async () => {
        fakeContext.workspaceState.update.resetHistory();
        (provider as any).createLibertyProject = async () => undefined;

        const existingProjects = new Map();
        const result = await provider.addUserSelectedPath("/my/project", existingProjects);

        assert.equal(result, 2);
        assert.equal(existingProjects.size, 0);
        assert.equal(fakeContext.workspaceState.update.called, false);
    });

});
