/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2025
 *
 * Unit tests for custom test report path resolution.
 * Plain mocha + chai, no VS Code instance required.
 *
 * Covers:
 *   - resolveMavenReportPath() — pure helper, no mocking needed
 *   - getGradleTestReport()   — tests the customPath early-return and the
 *                               default-path fallback (g2js returns undefined)
 */
import * as path from "path";
import { strict as assert } from "assert";

// ── Module-level mock for gradle-to-js ────────────────────────────────────────
// We intercept gradle-to-js/lib/parser so tests never hit disk.  The mock is
// installed before any test module that pulls in gradleUtil is loaded.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;

// Mutable so individual tests can control what parseFile resolves.
let g2jsResult: string | undefined = undefined;

Module._load = function (request: string, ...args: any[]) {
    if (request === "gradle-to-js/lib/parser") {
        return {
            parseFile: () =>
                Promise.resolve({
                    // Simulate build.gradle with no custom destination.
                    // Tests that need a custom dest can set g2jsResult via the
                    // helper below; for the tests here undefined is sufficient.
                    "test.reports.html.destination": g2jsResult,
                }),
        };
    }
    return originalLoad.apply(this, [request, ...args]);
};

// Evict cached gradleUtil so the mock takes effect even when another test file
// in this Mocha run has already loaded it.
Object.keys(require.cache).forEach((key) => {
    if (key.includes("gradleUtil") || key.includes("devCommands")) {
        delete require.cache[key];
    }
});

// Lazy imports — must happen AFTER the Module._load hook is installed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveMavenReportPath } = require("../../liberty/devCommands");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getGradleTestReport } = require("../../util/gradleUtil");

// ── resolveMavenReportPath ─────────────────────────────────────────────────────

describe("resolveMavenReportPath()", () => {
    const projectRoot = "/home/user/myapp";

    describe("when customPath is absent or empty", () => {
        it("returns empty string for undefined", () => {
            assert.strictEqual(resolveMavenReportPath(projectRoot, undefined), "");
        });

        it("returns empty string for empty string", () => {
            assert.strictEqual(resolveMavenReportPath(projectRoot, ""), "");
        });
    });

    describe("when customPath is an absolute path", () => {
        it("returns the absolute path unchanged (surefire-style)", () => {
            const abs = "/custom/reports/surefire.html";
            assert.strictEqual(resolveMavenReportPath(projectRoot, abs), abs);
        });

        it("returns the absolute path unchanged (failsafe-style)", () => {
            const abs = "/opt/ci/failsafe-report.html";
            assert.strictEqual(resolveMavenReportPath(projectRoot, abs), abs);
        });
    });

    describe("when customPath is a relative path", () => {
        it("resolves relative path against projectRoot", () => {
            const expected = path.resolve(projectRoot, "reports/surefire.html");
            assert.strictEqual(
                resolveMavenReportPath(projectRoot, "reports/surefire.html"),
                expected,
            );
        });

        it("resolves deep relative path against projectRoot", () => {
            const expected = path.resolve(projectRoot, "target/custom/failsafe.html");
            assert.strictEqual(
                resolveMavenReportPath(projectRoot, "target/custom/failsafe.html"),
                expected,
            );
        });
    });
});

// ── getGradleTestReport — customPath early-return ─────────────────────────────

describe("getGradleTestReport() with a non-empty customPath", () => {
    it("returns customPath immediately without touching build.gradle", async () => {
        const customPath = "/my/custom/gradle/index.html";
        // Passing a non-existent gradlePath to confirm it is never opened.
        const result = await getGradleTestReport(
            "/does/not/exist/build.gradle",
            "/does/not/exist",
            customPath,
        );
        assert.strictEqual(result, customPath);
    });

    it("returns customPath even when it looks like a relative path string", async () => {
        // The function accepts the value as-is; path handling is the caller's job.
        const customPath = "build/custom/tests/index.html";
        const result = await getGradleTestReport(
            "/some/build.gradle",
            "/some",
            customPath,
        );
        assert.strictEqual(result, customPath);
    });
});

// ── getGradleTestReport — default fallback ────────────────────────────────────

describe("getGradleTestReport() with no customPath", () => {
    it("falls back to the default path when build.gradle has no custom destination", async () => {
        // g2jsResult is undefined (set at module level), so parseFile resolves a
        // build file with no 'test.reports.html.destination' key.
        g2jsResult = undefined;
        const projectRoot = "/home/user/myapp";
        const result = await getGradleTestReport(
            "/home/user/myapp/build.gradle",
            projectRoot,
            // customPath intentionally omitted
        );
        const expectedDefault = path.join(
            projectRoot,
            "build",
            "reports",
            "tests",
            "test",
            "index.html",
        );
        assert.strictEqual(result, expectedDefault);
    });
});
