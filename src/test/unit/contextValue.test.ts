/*
 * Unit tests for computeContextValue and view/item/context when-clause regexes.
 * These tests run with plain mocha — no VS Code instance required.
 */
import { strict as assert } from "assert";
import { computeContextValue } from "../../util/helperUtil";
import { DevModeState } from "../../liberty/libertyProject";

// ---------------------------------------------------------------------------
// computeContextValue
// ---------------------------------------------------------------------------

describe("computeContextValue — state undefined (stopped)", () => {
    it("returns base unchanged when not running", () => {
        assert.equal(computeContextValue("libertyProject:maven", undefined), "libertyProject:maven");
    });
});

describe("computeContextValue — state 'started'", () => {
    it("appends :running when started", () => {
        assert.equal(computeContextValue("libertyProject:maven", DevModeState.Running), "libertyProject:maven:running");
    });
});

describe("computeContextValue — state 'starting' or 'stopping'", () => {
    it("does not append :running when starting", () => {
        assert.equal(computeContextValue("libertyProject:maven", DevModeState.Starting), "libertyProject:maven");
    });
    it("does not append :running when stopping", () => {
        assert.equal(computeContextValue("libertyProject:maven", DevModeState.Stopping), "libertyProject:maven");
    });
});

describe("computeContextValue — aggregator", () => {
    it("never appends :running to an aggregator", () => {
        assert.equal(computeContextValue("libertyProject:maven:aggregator", DevModeState.Running), "libertyProject:maven:aggregator");
    });
});

// ---------------------------------------------------------------------------
// when-clause regexes (mirror of package.json patterns)
// ---------------------------------------------------------------------------

const LEAF_NOT_RUNNING = /^libertyProject(?!.*:running)(?!.*:aggregator)/;
const LEAF_RUNNING     = /^libertyProject.*:running/;
const AGGREGATOR       = /^libertyProject.*:aggregator/;

describe("when-clause regex — leaf not running (start/custom/start.container)", () => {
    it("matches a stopped maven leaf", () => {
        assert.ok(LEAF_NOT_RUNNING.test("libertyProject:maven"));
    });
    it("matches a stopped gradle leaf", () => {
        assert.ok(LEAF_NOT_RUNNING.test("libertyProject:gradle"));
    });
    it("matches a stopped container leaf", () => {
        assert.ok(LEAF_NOT_RUNNING.test("libertyProject:maven:container"));
    });
    it("does not match a running leaf", () => {
        assert.ok(!LEAF_NOT_RUNNING.test("libertyProject:maven:running"));
    });
    it("does not match an aggregator", () => {
        assert.ok(!LEAF_NOT_RUNNING.test("libertyProject:maven:aggregator"));
    });
});

describe("when-clause regex — leaf running (stop/run.tests/debug)", () => {
    it("matches a running maven leaf", () => {
        assert.ok(LEAF_RUNNING.test("libertyProject:maven:running"));
    });
    it("matches a running gradle leaf", () => {
        assert.ok(LEAF_RUNNING.test("libertyProject:gradle:running"));
    });
    it("does not match a stopped leaf", () => {
        assert.ok(!LEAF_RUNNING.test("libertyProject:maven"));
    });
    it("does not match an aggregator", () => {
        assert.ok(!LEAF_RUNNING.test("libertyProject:maven:aggregator"));
    });
});

describe("when-clause regex — aggregator (all commands)", () => {
    it("matches a maven aggregator", () => {
        assert.ok(AGGREGATOR.test("libertyProject:maven:aggregator"));
    });
    it("matches a gradle aggregator", () => {
        assert.ok(AGGREGATOR.test("libertyProject:gradle:aggregator"));
    });
    it("does not match a leaf", () => {
        assert.ok(!AGGREGATOR.test("libertyProject:maven"));
    });
    it("does not match a running leaf", () => {
        assert.ok(!AGGREGATOR.test("libertyProject:maven:running"));
    });
});
