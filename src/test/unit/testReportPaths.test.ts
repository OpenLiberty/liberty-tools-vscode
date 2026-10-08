/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
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
// Set to a plain object to simulate the parsed build.gradle structure.
// Each test that needs specific keys should assign a new object here.
// Default simulates a build.gradle with no custom destination keys.
let g2jsBuildFile: Record<string, any> = {};

Module._load = function (request: string, ...args: any[]) {
    if (request === "gradle-to-js/lib/parser") {
        return {
            parseFile: () => Promise.resolve(g2jsBuildFile),
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMavenReportOutputDirectory } = require("../../util/mavenUtil");

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
    beforeEach(() => { g2jsBuildFile = {}; });

    it("falls back to the default path when build.gradle has no custom destination keys", async () => {
        // g2jsBuildFile is empty — no destination or outputLocation keys set.
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

// ── getGradleTestReport — Gradle 7 destination key ────────────────────────────

describe("getGradleTestReport() — Gradle 7 destination keys", () => {
    beforeEach(() => { g2jsBuildFile = {}; });

    it("uses flat 'test.reports.html.destination' key (Gradle 7)", async () => {
        // build.gradle value is a directory; function appends index.html
        g2jsBuildFile = { "test.reports.html.destination": "/custom/g7/flat" };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g7/flat/index.html");
    });

    it("uses nested test['reports.html.destination'] key (Gradle 7)", async () => {
        g2jsBuildFile = { test: { "reports.html.destination": "/custom/g7/nested" } };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g7/nested/index.html");
    });

    it("uses deep test.reports['html.destination'] key (Gradle 7 — actual g2js shape)", async () => {
        // gradle-to-js parses `test { reports { html.destination = "..." } }` as:
        // { test: { reports: { "html.destination": "..." } } }
        g2jsBuildFile = { test: { reports: { "html.destination": "/custom/g7/deep" } } };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g7/deep/index.html");
    });
});

// ── getGradleTestReport — Gradle 8/9 outputLocation keys ─────────────────────

describe("getGradleTestReport() — Gradle 8/9 outputLocation keys", () => {
    beforeEach(() => { g2jsBuildFile = {}; });

    it("uses flat 'test.reports.html.outputLocation' key (Gradle 8/9)", async () => {
        // build.gradle value is a directory; function appends index.html
        g2jsBuildFile = { "test.reports.html.outputLocation": "/custom/g9/flat" };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g9/flat/index.html");
    });

    it("uses nested test['reports.html.outputLocation'] key (Gradle 8/9)", async () => {
        g2jsBuildFile = { test: { "reports.html.outputLocation": "/custom/g9/nested" } };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g9/nested/index.html");
    });

    it("uses deep test.reports['html.outputLocation'] key (Gradle 8/9 — actual g2js shape)", async () => {
        // gradle-to-js parses `test { reports { html.outputLocation = "..." } }` as:
        // { test: { reports: { "html.outputLocation": "..." } } }
        g2jsBuildFile = { test: { reports: { "html.outputLocation": "/custom/g9/deep" } } };
        const result = await getGradleTestReport("/build.gradle", "/root");
        assert.strictEqual(result, "/custom/g9/deep/index.html");
    });
});

// ── getGradleTestReport — variable guard ──────────────────────────────────────

describe("getGradleTestReport() — Gradle variable guard", () => {
    const projectRoot = "/home/user/myapp";
    const expectedDefault = path.join(projectRoot, "build", "reports", "tests", "test", "index.html");

    beforeEach(() => { g2jsBuildFile = {}; });

    it("falls back to default when destination contains a $ variable (flat key)", async () => {
        g2jsBuildFile = { "test.reports.html.destination": "$buildDir/custom/index.html" };
        const result = await getGradleTestReport("/build.gradle", projectRoot);
        assert.strictEqual(result, expectedDefault);
    });

    it("falls back to default when outputLocation contains a $ variable (nested key)", async () => {
        g2jsBuildFile = { test: { "reports.html.outputLocation": "${project.buildDir}/reports" } };
        const result = await getGradleTestReport("/build.gradle", projectRoot);
        assert.strictEqual(result, expectedDefault);
    });

    it("falls back to default when outputLocation contains a $ variable (deep reports block)", async () => {
        g2jsBuildFile = { test: { reports: { "html.outputLocation": "$buildDir/custom" } } };
        const result = await getGradleTestReport("/build.gradle", projectRoot);
        assert.strictEqual(result, expectedDefault);
    });
});

// ── getGradleTestReport — taskName = "integrationTest" ───────────────────────

describe("getGradleTestReport() — integrationTest taskName", () => {
    const projectRoot = "/home/user/myapp";

    beforeEach(() => { g2jsBuildFile = {}; });

    it("default path uses integrationTest segment when taskName is integrationTest", async () => {
        const expected = path.join(projectRoot, "build", "reports", "tests", "integrationTest", "index.html");
        const result = await getGradleTestReport("/build.gradle", projectRoot, undefined, "integrationTest");
        assert.strictEqual(result, expected);
    });

    it("uses integrationTest flat destination key (Gradle 7)", async () => {
        // build.gradle value is a directory; function appends index.html
        g2jsBuildFile = { "integrationTest.reports.html.destination": "/custom/it" };
        const result = await getGradleTestReport("/build.gradle", projectRoot, undefined, "integrationTest");
        assert.strictEqual(result, "/custom/it/index.html");
    });

    it("uses integrationTest nested outputLocation key (Gradle 8/9)", async () => {
        g2jsBuildFile = { integrationTest: { "reports.html.outputLocation": "/custom/it9" } };
        const result = await getGradleTestReport("/build.gradle", projectRoot, undefined, "integrationTest");
        assert.strictEqual(result, "/custom/it9/index.html");
    });

    it("falls back to default when integrationTest destination contains a variable", async () => {
        const expected = path.join(projectRoot, "build", "reports", "tests", "integrationTest", "index.html");
        g2jsBuildFile = { "integrationTest.reports.html.destination": "$buildDir/it/index.html" };
        const result = await getGradleTestReport("/build.gradle", projectRoot, undefined, "integrationTest");
        assert.strictEqual(result, expected);
    });

    it("does not pick up the test task's key when taskName is integrationTest", async () => {
        // Only the 'test' task key is set — integration test should fall back to its own default.
        g2jsBuildFile = { "test.reports.html.destination": "/custom/test/index.html" };
        const expected = path.join(projectRoot, "build", "reports", "tests", "integrationTest", "index.html");
        const result = await getGradleTestReport("/build.gradle", projectRoot, undefined, "integrationTest");
        assert.strictEqual(result, expected);
    });
});

// ── getMavenReportOutputDirectory ─────────────────────────────────────────────

// Minimal pom.xml helpers — build only the XML needed for each scenario.
function makePomWithReportPlugin(artifactId: string, outputDir?: string): string {
    const configBlock = outputDir !== undefined
        ? `<configuration><outputDirectory>${outputDir}</outputDirectory></configuration>`
        : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>${artifactId}</artifactId>
        ${configBlock}
      </plugin>
    </plugins>
  </build>
</project>`;
}

function makePomWithoutPlugin(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>`;
}

describe("getMavenReportOutputDirectory()", () => {
    const SUREFIRE  = "maven-surefire-report-plugin";
    const FAILSAFE  = "maven-failsafe-report-plugin";

    it("returns undefined when the report plugin is absent from pom.xml", () => {
        const xml = makePomWithoutPlugin();
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), undefined);
    });

    it("returns undefined when the plugin has no <configuration> block", () => {
        const xml = makePomWithReportPlugin(SUREFIRE); // no outputDir arg → no <configuration>
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), undefined);
    });

    it("returns the plain path for maven-surefire-report-plugin", () => {
        const xml = makePomWithReportPlugin(SUREFIRE, "custom/surefire-reports");
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), "custom/surefire-reports");
    });

    it("returns the plain absolute path for maven-failsafe-report-plugin", () => {
        const xml = makePomWithReportPlugin(FAILSAFE, "/opt/ci/failsafe-reports");
        assert.strictEqual(getMavenReportOutputDirectory(xml, FAILSAFE), "/opt/ci/failsafe-reports");
    });

    it("returns undefined when <outputDirectory> contains a Maven variable", () => {
        const xml = makePomWithReportPlugin(SUREFIRE, "${project.build.directory}/custom-reports");
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), undefined);
    });

    it("does not match a different plugin in the same pom.xml", () => {
        // Asking for surefire but only failsafe is configured — should return undefined.
        const xml = makePomWithReportPlugin(FAILSAFE, "custom/failsafe-reports");
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), undefined);
    });

    it("trims leading/trailing whitespace from the returned path", () => {
        const xml = makePomWithReportPlugin(SUREFIRE, "  target/my-reports  ");
        assert.strictEqual(getMavenReportOutputDirectory(xml, SUREFIRE), "target/my-reports");
    });
});
