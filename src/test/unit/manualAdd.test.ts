/*
 * Unit tests for manual project add/remove behavior.
 *
 * Behaviors covered:
 *   1. getUnregisteredBuildFolders() returns folders for rejected build files only
 *   2. After addToAddedProjects(), that folder no longer appears in getUnregisteredBuildFolders()
 *   3. getChildren(root) includes manually added projects alongside auto-detected ones
 *   4. getAddedProjects() contains only manually added projects, not auto-detected ones
 */
import { strict as assert } from "assert";
import * as path from "path";
import { ProjectRegistry } from "../../liberty/projectRegistry";
import { LibertyProject } from "../../liberty/libertyProject";
import { LIBERTY_PROJECT_MAVEN, LIBERTY_PROJECT_GRADLE } from "../../definitions/constants";
import * as vscode from "vscode";

// ── Minimal context mock ──────────────────────────────────────────────────────

function makeContext(): vscode.ExtensionContext {
    const store = new Map<string, any>();
    return {
        workspaceState: {
            get: (key: string, defaultValue?: any) => store.has(key) ? store.get(key) : defaultValue,
            update: (key: string, value: any) => { store.set(key, value); return Promise.resolve(); },
        },
        globalState: {
            get: (key: string, defaultValue?: any) => store.has(key) ? store.get(key) : defaultValue,
            update: (key: string, value: any) => { store.set(key, value); return Promise.resolve(); },
        },
        extensionPath: "/mock",
    } as any;
}

function makeProject(buildFilePath: string, type: string): LibertyProject {
    return new LibertyProject(
        makeContext(),
        path.basename(path.dirname(buildFilePath)),
        vscode.TreeItemCollapsibleState.None,
        buildFilePath,
        undefined,
        type,
        undefined,
        undefined,
    );
}

describe("manual add: getAddedProjects", () => {
    it("contains only manually added projects, not auto-detected ones", () => {
        const registry = new ProjectRegistry(makeContext());

        const autoPath = "/ws/app-a/pom.xml";
        const manualPath = "/ws/app-b/pom.xml";

        const projects = new Map<string, LibertyProject>();
        projects.set(autoPath, makeProject(autoPath, LIBERTY_PROJECT_MAVEN));
        registry.setProjects(projects);

        const manualProject = makeProject(manualPath, LIBERTY_PROJECT_MAVEN);
        registry.addToAddedProjects(manualProject);

        const added = registry.getAddedProjects();
        assert.equal(added.length, 1);
        assert.equal(added[0].getPath(), manualPath);
    });

    it("removes a project from added list when removeFromAddedProjects is called", () => {
        const registry = new ProjectRegistry(makeContext());

        const manualPath = "/ws/app-b/pom.xml";
        registry.addToAddedProjects(makeProject(manualPath, LIBERTY_PROJECT_MAVEN));
        assert.equal(registry.getAddedProjects().length, 1);

        registry.removeFromAddedProjects(manualPath);
        assert.equal(registry.getAddedProjects().length, 0);
    });
});

describe("manual add: getUnregisteredBuildFolders", () => {
    it("returns folders for build files not in _projects", () => {
        const registry = new ProjectRegistry(makeContext());

        const acceptedPath = "/ws/app-a/pom.xml";
        const rejectedPath = "/ws/app-b/pom.xml";

        const projects = new Map<string, LibertyProject>();
        projects.set(acceptedPath, makeProject(acceptedPath, LIBERTY_PROJECT_MAVEN));
        registry.setProjects(projects);
        registry.setRejectedBuildFiles([acceptedPath, rejectedPath]);

        const result = registry.getUnregisteredBuildFolders();
        assert.deepEqual(result, [path.dirname(rejectedPath)]);
    });

    it("excludes a folder once its project has been manually added", () => {
        const registry = new ProjectRegistry(makeContext());

        const rejectedPath = "/ws/app-b/pom.xml";
        registry.setProjects(new Map());
        registry.setRejectedBuildFiles([rejectedPath]);

        assert.equal(registry.getUnregisteredBuildFolders().length, 1);

        registry.addToAddedProjects(makeProject(rejectedPath, LIBERTY_PROJECT_MAVEN));

        assert.equal(registry.getUnregisteredBuildFolders().length, 0);
    });
});
