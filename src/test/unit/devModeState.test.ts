/*
 * Unit tests for isDevMode flag and filterProjects state-based filtering.
 * These tests run with plain mocha + chai — no VS Code instance required.
 */
import { strict as assert } from "assert";
import { LibertyProject } from "../../liberty/libertyProject";
import { filterProjects, devModeRequirement } from "../../util/helperUtil";

// Minimal vscode.ExtensionContext stub — only what LibertyProject constructor needs
const stubContext: any = {
    extensionPath: "",
    workspaceState: { get: () => undefined, update: () => Promise.resolve() },
    globalState: { get: () => undefined, update: () => Promise.resolve() },
    subscriptions: [],
};

const None = 0;

function makeProject(contextValue: string): LibertyProject {
    const p = new LibertyProject(stubContext, "test-project", None, "/fake/path", "start", contextValue);
    p.isLibertyEnabled = true;
    return p;
}

// ---------------------------------------------------------------------------
// isDevMode flag
// ---------------------------------------------------------------------------

describe("LibertyProject.isDevMode", () => {
    it("defaults to false on a new project", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(project.isDevMode, false);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — stop command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.stop", () => {
    it("includes projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = true;
        assert.equal(filterProjects([project], "liberty.dev.stop").length, 1);
    });

    it("excludes projects where isDevMode is false", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = false;
        assert.equal(filterProjects([project], "liberty.dev.stop").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — run.tests command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.run.tests", () => {
    it("includes projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = true;
        assert.equal(filterProjects([project], "liberty.dev.run.tests").length, 1);
    });

    it("excludes projects where isDevMode is false", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = false;
        assert.equal(filterProjects([project], "liberty.dev.run.tests").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — debug and custom commands
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.debug", () => {
    it("includes projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = true;
        assert.equal(filterProjects([project], "liberty.dev.debug").length, 1);
    });

    it("excludes projects where isDevMode is false", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = false;
        assert.equal(filterProjects([project], "liberty.dev.debug").length, 0);
    });
});

describe("filterProjects - liberty.dev.custom", () => {
    it("excludes projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = true;
        assert.equal(filterProjects([project], "liberty.dev.custom").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — start.container command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.start.container", () => {
    it("includes container projects where isDevMode is false", () => {
        const project = makeProject("libertyProject:maven:container");
        project.isDevMode = false;
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 1);
    });

    it("excludes container projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven:container");
        project.isDevMode = true;
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 0);
    });

    it("excludes non-container projects regardless of isDevMode", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = false;
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 0);
    });
});

describe("filterProjects - liberty.dev.start", () => {
    it("includes projects where isDevMode is false", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = false;
        const result = filterProjects([project], "liberty.dev.start");
        assert.equal(result.length, 1);
    });

    it("excludes projects where isDevMode is true", () => {
        const project = makeProject("libertyProject:maven");
        project.isDevMode = true;
        const result = filterProjects([project], "liberty.dev.start");
        assert.equal(result.length, 0);
    });
});

// ---------------------------------------------------------------------------
// devModeRequirement helper
// ---------------------------------------------------------------------------

describe("devModeRequirement", () => {
    it("returns true for stop (must be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.stop"), true);
    });
    it("returns true for run.tests (must be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.run.tests"), true);
    });
    it("returns true for debug (must be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.debug"), true);
    });
    it("returns false for start (must NOT be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.start"), false);
    });
    it("returns false for custom (must NOT be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.custom"), false);
    });
    it("returns false for start.container (must NOT be running)", () => {
        assert.equal(devModeRequirement("liberty.dev.start.container"), false);
    });
    it("returns undefined for open.build.file (no restriction)", () => {
        assert.equal(devModeRequirement("liberty.dev.open.build.file"), undefined);
    });
});
