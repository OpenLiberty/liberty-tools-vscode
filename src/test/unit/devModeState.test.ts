/*
 * Unit tests for DevModeState and filterProjects state-based filtering.
 * These tests run with plain mocha + chai — no VS Code instance required.
 */
import { strict as assert } from "assert";
import { LibertyProject, DevModeState } from "../../liberty/libertyProject";
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
    const p = new LibertyProject(stubContext, "test-project", None, "/fake/path", undefined, contextValue);
    p.isLibertyEnabled = true;
    return p;
}

// ---------------------------------------------------------------------------
// DevModeState
// ---------------------------------------------------------------------------

describe("LibertyProject.state", () => {
    it("defaults to undefined (stopped) on a new project", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(project.state, undefined);
    });

    it("setState('starting') sets state to starting", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Starting);
        assert.equal(project.state, DevModeState.Starting);
    });

    it("setState('started') sets state to started", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        assert.equal(project.state, DevModeState.Running);
    });

    it("setState('stopping') sets state to stopping", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Stopping);
        assert.equal(project.state, DevModeState.Stopping);
    });

    it("setState(undefined) clears state back to stopped", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        project.setState(undefined);
        assert.equal(project.state, undefined);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — stop command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.stop", () => {
    it("includes projects where state is 'started'", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        assert.equal(filterProjects([project], "liberty.dev.stop").length, 1);
    });

    it("includes projects where state is 'starting'", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Starting);
        assert.equal(filterProjects([project], "liberty.dev.stop").length, 1);
    });

    it("excludes projects where state is undefined (stopped)", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(filterProjects([project], "liberty.dev.stop").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — run.tests command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.run.tests", () => {
    it("includes projects where state is defined", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        assert.equal(filterProjects([project], "liberty.dev.run.tests").length, 1);
    });

    it("excludes projects where state is undefined", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(filterProjects([project], "liberty.dev.run.tests").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — debug and custom commands
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.debug", () => {
    it("includes projects where state is defined", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        assert.equal(filterProjects([project], "liberty.dev.debug").length, 1);
    });

    it("excludes projects where state is undefined", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(filterProjects([project], "liberty.dev.debug").length, 0);
    });
});

describe("filterProjects - liberty.dev.custom", () => {
    it("excludes projects where state is defined", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
        assert.equal(filterProjects([project], "liberty.dev.custom").length, 0);
    });
});

// ---------------------------------------------------------------------------
// filterProjects — start.container command
// ---------------------------------------------------------------------------

describe("filterProjects - liberty.dev.start.container", () => {
    it("includes container projects where state is undefined", () => {
        const project = makeProject("libertyProject:maven:container");
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 1);
    });

    it("excludes container projects where state is defined", () => {
        const project = makeProject("libertyProject:maven:container");
        project.setState(DevModeState.Running);
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 0);
    });

    it("excludes non-container projects regardless of state", () => {
        const project = makeProject("libertyProject:maven");
        assert.equal(filterProjects([project], "liberty.dev.start.container").length, 0);
    });
});

describe("filterProjects - liberty.dev.start", () => {
    it("includes projects where state is undefined", () => {
        const project = makeProject("libertyProject:maven");
        const result = filterProjects([project], "liberty.dev.start");
        assert.equal(result.length, 1);
    });

    it("excludes projects where state is defined", () => {
        const project = makeProject("libertyProject:maven");
        project.setState(DevModeState.Running);
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
