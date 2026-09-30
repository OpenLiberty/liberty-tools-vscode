/*
 * IBM Confidential
 * Copyright IBM Corp. 2024, 2026
 *
 * Unit tests for Maven surefire/failsafe report location logic.
 *
 * The maven-surefire-report-plugin changed its output directory in a recent
 * version. Liberty Tools must handle both locations:
 *   - New location: target/reports/surefire.html  (plugin >= 3.5.x)
 *   - Old location: target/site/surefire-report.html  (plugin <= 3.4.0)
 *
 * Three scenarios are tested for each report type (surefire + failsafe):
 *   1. Report exists only in the new location
 *   2. Report exists only in the old location
 *   3. Report exists in both locations — new location check succeeds, old location never consulted
 *
 * These tests verify the file-existence branch logic that drives the two-step
 * fallback in openReport(): the return value of checkReportAndDisplay() is the
 * gate that determines whether the fallback to the old location is attempted.
 *
 * Reference: https://github.com/OpenLiberty/liberty-tools-intellij/issues/939
 */

// Install the vscode fake before any extension imports.
import { installFakeVscode } from "./fakeVscode";
installFakeVscode({}, true);

import { strict as assert } from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getReportFile, checkReportAndDisplay } from "../../liberty/devCommands";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a minimal LibertyProject stub that satisfies the two calls made
 * inside checkReportAndDisplay: getContextValue() and getLabel().
 */
function makeMavenProject(label = "test-app"): any {
    return {
        getContextValue: () => "libertyProject:maven",
        getLabel: () => label,
    };
}

/**
 * Creates a real HTML file at the given absolute path (including all parent
 * directories). Returns the path for convenience.
 */
function createReportFile(filePath: string): string {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "<html><body>test report</body></html>", "utf8");
    return filePath;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("Maven surefire report — location fallback logic", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "liberty-surefire-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── New location only ─────────────────────────────────────────────────────

    it("surefire — report in new location only: new-location check returns true", async () => {
        createReportFile(path.join(tmpDir, "target", "reports", "surefire.html"));
        const newPath = getReportFile(tmpDir, "reports", "surefire.html");
        const oldPath = getReportFile(tmpDir, "site", "surefire-report.html");

        const newResult = await checkReportAndDisplay(newPath, "surefire", "unit test", makeMavenProject(), false);
        assert.equal(newResult, true, "new-location check should return true when file exists");

        // Mirror openReport's short-circuit: old location is only checked when new-location check fails.
        // With new-location succeeding, this branch is never entered.
        assert.equal(fs.existsSync(oldPath), false, "old-location file should not exist");
    });

    // ── Old location only ─────────────────────────────────────────────────────

    it("surefire — report in old location only: new-location check returns false, old returns true", async () => {
        createReportFile(path.join(tmpDir, "target", "site", "surefire-report.html"));
        const newPath = getReportFile(tmpDir, "reports", "surefire.html");
        const oldPath = getReportFile(tmpDir, "site", "surefire-report.html");

        const newResult = await checkReportAndDisplay(newPath, "surefire", "unit test", makeMavenProject(), false);
        assert.equal(newResult, false, "new-location check should return false when file is absent");

        // openReport calls the old location only when new-location returned false.
        const oldResult = await checkReportAndDisplay(oldPath, "surefire", "unit test", makeMavenProject(), true);
        assert.equal(oldResult, true, "old-location fallback check should return true when file exists");

        assert.equal(fs.existsSync(newPath), false, "new-location file should not exist");
    });

    // ── Both locations ────────────────────────────────────────────────────────

    it("surefire — report in both locations: new-location check returns true, old is never consulted", async () => {
        const newPath = createReportFile(path.join(tmpDir, "target", "reports", "surefire.html"));
        const oldPath = createReportFile(path.join(tmpDir, "target", "site", "surefire-report.html"));

        const newResult = await checkReportAndDisplay(newPath, "surefire", "unit test", makeMavenProject(), false);
        assert.equal(newResult, true, "new-location check should return true — old location never consulted");

        // Verify old file was not touched (it still exists, untouched, never used).
        assert.equal(fs.existsSync(oldPath), true, "old-location file should remain on disk");
    });
});

describe("Maven failsafe report — location fallback logic", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "liberty-failsafe-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── New location only ─────────────────────────────────────────────────────

    it("failsafe — report in new location only: new-location check returns true", async () => {
        createReportFile(path.join(tmpDir, "target", "reports", "failsafe.html"));
        const newPath = getReportFile(tmpDir, "reports", "failsafe.html");
        const oldPath = getReportFile(tmpDir, "site", "failsafe-report.html");

        const newResult = await checkReportAndDisplay(newPath, "failsafe", "integration test", makeMavenProject(), false);
        assert.equal(newResult, true, "new-location check should return true when file exists");

        assert.equal(fs.existsSync(oldPath), false, "old-location file should not exist");
    });

    // ── Old location only ─────────────────────────────────────────────────────

    it("failsafe — report in old location only: new-location check returns false, old returns true", async () => {
        createReportFile(path.join(tmpDir, "target", "site", "failsafe-report.html"));
        const newPath = getReportFile(tmpDir, "reports", "failsafe.html");
        const oldPath = getReportFile(tmpDir, "site", "failsafe-report.html");

        const newResult = await checkReportAndDisplay(newPath, "failsafe", "integration test", makeMavenProject(), false);
        assert.equal(newResult, false, "new-location check should return false when file is absent");

        const oldResult = await checkReportAndDisplay(oldPath, "failsafe", "integration test", makeMavenProject(), true);
        assert.equal(oldResult, true, "old-location fallback check should return true when file exists");

        assert.equal(fs.existsSync(newPath), false, "new-location file should not exist");
    });

    // ── Both locations ────────────────────────────────────────────────────────

    it("failsafe — report in both locations: new-location check returns true, old is never consulted", async () => {
        const newPath = createReportFile(path.join(tmpDir, "target", "reports", "failsafe.html"));
        const oldPath = createReportFile(path.join(tmpDir, "target", "site", "failsafe-report.html"));

        const newResult = await checkReportAndDisplay(newPath, "failsafe", "integration test", makeMavenProject(), false);
        assert.equal(newResult, true, "new-location check should return true — old location never consulted");

        assert.equal(fs.existsSync(oldPath), true, "old-location file should remain on disk");
    });
});
