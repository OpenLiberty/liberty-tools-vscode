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
import { ProjectRegistry } from "../../liberty/projectRegistry";
import { DashboardData } from "../../liberty/dashboard";
import * as projectDiscovery from "../../liberty/projectDiscovery";

// Fake ExtensionContext for ProjectRegistry.
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

    let provider: ProjectRegistry;

    before(() => {
        provider = new ProjectRegistry(fakeContext);
    });

    afterEach(() => {
        sinon.restore();
    });

    // ─── Test 1 ───────────────────────────────────────────────────────────────
    // Scenario: the user manually picks a Maven project not already in the dashboard.
    it("returns 0 and adds project to map when valid pom.xml exists", async () => {
        const fakeProject = {
            getPath: () => "/my/project/pom.xml",
            getLabel: () => "my-app",
            getContextValue: () => "libertyMavenProject"
        } as any;
        sinon.stub(projectDiscovery, "createLibertyProjectFromPath").resolves(fakeProject);

        const result = await provider.addUserSelectedPath("/my/project");

        assert.equal(result, 0);
        assert.equal(provider.getAddedProjects().some(p => p.getPath() === "/my/project/pom.xml"), true);
        assert.equal(fakeContext.workspaceState.update.called, true);

        // Clean up so next tests start empty.
        (provider as any)._addedProjects.clear();
        fakeContext.workspaceState.update.resetHistory();
    });

    // ─── Test 2 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder that is already in the Liberty dashboard.
    it("returns 1 and adds nothing when project already exists", async () => {
        fakeContext.workspaceState.update.resetHistory();

        // Simulate a project already registered.
        (provider as any)._projects.set("/my/project/pom.xml", {} as any);

        const result = await provider.addUserSelectedPath("/my/project");

        assert.equal(result, 1);
        assert.equal(fakeContext.workspaceState.update.called, false);

        (provider as any)._projects.clear();
    });

    // ─── Test 3 ───────────────────────────────────────────────────────────────
    // Scenario: the user picks a folder with no pom.xml or build.gradle.
    it("returns 2 and adds nothing when no build file exists", async () => {
        fakeContext.workspaceState.update.resetHistory();
        sinon.stub(projectDiscovery, "createLibertyProjectFromPath").resolves(undefined);

        const result = await provider.addUserSelectedPath("/my/project");

        assert.equal(result, 2);
        assert.equal(provider.getAddedProjects().length, 0);
        assert.equal(fakeContext.workspaceState.update.called, false);
    });

});
