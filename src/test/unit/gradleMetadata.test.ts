/*
 * Unit tests for extractGradleMetadata — the metadata stamping layer.
 * Tests cover the fields that downstream pipeline stages depend on:
 *   isAggregator, isLibertyEnabled, contextValue, projectName, parentProjectName
 *
 * All tests use parsed content directly (no filesystem reads beyond test fixtures).
 */
import { strict as assert } from "assert";
import { extractGradleMetadata } from "../../util/gradleUtil";
import { LIBERTY_PROJECT_GRADLE } from "../../definitions/constants";

// ── Fixture parsed content ────────────────────────────────────────────────────

const NO_LIBERTY_BUILD: any = {};
const LIBERTY_BUILD: any = {
    plugins: [{ id: "io.openliberty.tools.gradle.Liberty", version: "3.0" }]
};
const SETTINGS_WITH_SUBPROJECTS: any = {
    "rootProject.name": "my-root",
    include: ["app-one-ear", "app-two-ear"]
};
const SETTINGS_NO_SUBPROJECTS: any = {
    "rootProject.name": "my-root"
};

// Real project paths for parentProjectName resolution (requires filesystem)
const REAL_ROOT = "/Users/dshi/test/multi-module-test-projects/bob-nested-gradle-ears";
const REAL_CHILD = `${REAL_ROOT}/application-one/app-one-ear/build.gradle`;

// ── Aggregator with no Liberty (bob-nested-gradle-ears root pattern) ──────────

describe("extractGradleMetadata — no-Liberty aggregator root", () => {
    it("isAggregator is true when settings has subprojects", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.isAggregator, true);
    });

    it("contextValue is LIBERTY_PROJECT_GRADLE (not empty) for aggregator with no Liberty", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.contextValue, LIBERTY_PROJECT_GRADLE);
    });

    it("isLibertyEnabled is false — aggregator has no Liberty plugin itself", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.isLibertyEnabled, false);
    });

    it("projectName is extracted from settings rootProject.name", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.projectName, "my-root");
    });

    it("subprojects are populated from settings include", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.ok(metadata.subprojects.includes("app-one-ear"));
        assert.ok(metadata.subprojects.includes("app-two-ear"));
    });
});

// ── Liberty-enabled aggregator root ───────────────────────────────────────────

describe("extractGradleMetadata — Liberty aggregator root", () => {
    it("isAggregator is true", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.isAggregator, true);
    });

    it("isLibertyEnabled is true", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.isLibertyEnabled, true);
    });

    it("contextValue is LIBERTY_PROJECT_GRADLE", async () => {
        const metadata = await extractGradleMetadata("/workspace/build.gradle", LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.contextValue, LIBERTY_PROJECT_GRADLE);
    });
});

// ── Standalone Liberty child (no subprojects) ─────────────────────────────────

describe("extractGradleMetadata — Liberty child, no subprojects", () => {
    it("isAggregator is false", async () => {
        const metadata = await extractGradleMetadata("/workspace/app-one-ear/build.gradle", LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.isAggregator, false);
    });

    it("isLibertyEnabled is true", async () => {
        const metadata = await extractGradleMetadata("/workspace/app-one-ear/build.gradle", LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.isLibertyEnabled, true);
    });

    it("contextValue is LIBERTY_PROJECT_GRADLE", async () => {
        const metadata = await extractGradleMetadata("/workspace/app-one-ear/build.gradle", LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.contextValue, LIBERTY_PROJECT_GRADLE);
    });
});

// ── Non-Liberty, non-aggregator (shared-ejb pattern) ─────────────────────────

describe("extractGradleMetadata — no Liberty, no subprojects", () => {
    it("isAggregator is false", async () => {
        const metadata = await extractGradleMetadata("/workspace/shared-ejb/build.gradle", NO_LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.isAggregator, false);
    });

    it("isLibertyEnabled is false", async () => {
        const metadata = await extractGradleMetadata("/workspace/shared-ejb/build.gradle", NO_LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.isLibertyEnabled, false);
    });

    it("contextValue is empty — not a Liberty project", async () => {
        const metadata = await extractGradleMetadata("/workspace/shared-ejb/build.gradle", NO_LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        assert.equal(metadata.contextValue, "");
    });
});

// ── parentProjectName resolution (real filesystem) ────────────────────────────
// Verifies that a child in bob-nested-gradle-ears resolves its parent name
// by reading the parent directory's settings.gradle from disk.

describe("extractGradleMetadata — parentProjectName resolution", () => {
    it("child resolves parentProjectName from parent settings.gradle", async () => {
        const metadata = await extractGradleMetadata(REAL_CHILD, LIBERTY_BUILD, SETTINGS_NO_SUBPROJECTS);
        console.log("    parentProjectName:", metadata.parentProjectName);
        assert.equal(metadata.parentProjectName, "bob-nested-gradle-ears");
    });

    it("root has no parentProjectName", async () => {
        const metadata = await extractGradleMetadata(`${REAL_ROOT}/build.gradle`, NO_LIBERTY_BUILD, SETTINGS_WITH_SUBPROJECTS);
        assert.equal(metadata.parentProjectName, undefined);
    });
});
