/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// Testing mimicked from app-mod-vscode-extension repo but uses mocha instead of jest
// Installs the vscode module fake before any extension imports.
import { installFakeVscode } from "./fakeVscode";
installFakeVscode();

import * as assert from "assert";
import { JavaSelector, IJavaInstallation } from "../../util/javaSelector";


function makeJava(path: string, majorVersion: number, sources: string[], extras: Partial<IJavaInstallation> = {}): IJavaInstallation {
    return { path, version: `${majorVersion}.0.0`, majorVersion, sources, ...extras };
}


describe("JavaSelector", () => {

    let selector: JavaSelector;

    beforeEach(() => {
        selector = JavaSelector.getInstance();
        selector.clearCache();
    });

    describe("Singleton pattern", () => {
        it("getInstance() returns the same instance on every call", () => {
            const a = JavaSelector.getInstance();
            const b = JavaSelector.getInstance();
            assert.strictEqual(a, b);
        });
    });

    describe("findFirstValid. Error when no candidates qualify", () => {
        it("throws when the cache is empty", async () => {
            selector._setCacheForTesting([]);
            await assert.rejects(
                () => selector.findFirstValid(21),
                /No Java installation found/
            );
        });

        it("throws when every candidate is below minVersion", async () => {
            selector._setCacheForTesting([
                makeJava("/java8",  8,  ["vscode-settings"]),
                makeJava("/java11", 11, ["vscode-settings"]),
            ]);
            await assert.rejects(
                () => selector.findFirstValid(21),
                /No Java installation found/
            );
        });
    });

    // findFirstValid
    describe("findFirstValid. Skips below minVersion, returns first valid", () => {
        it("skips Java 17 and returns Java 21 when minVersion is 21", async () => {
            selector._setCacheForTesting([
                makeJava("/java17", 17, ["vscode-settings"]),
                makeJava("/java21", 21, ["vscode-settings"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/java21");
            assert.strictEqual(result.majorVersion, 21);
        });

        it("returns the first candidate when all qualify", async () => {
            selector._setCacheForTesting([
                makeJava("/java21", 21, ["vscode-settings"]),
                makeJava("/java26", 26, ["vscode-settings"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/java21");
        });
    });

    describe("findFirstValid. Source priority ordering", () => {
        it("prefers redhat.java (priority 0) over vscode-settings (priority 1)", async () => {
            // Inject already-sorted candidates (as detectAllJavaInstallations would produce)
            selector._setCacheForTesting([
                makeJava("/redhat-jre", 21, ["redhat.java"]),
                makeJava("/vscode-default", 21, ["vscode-settings"], { isDefault: true }),
                makeJava("/system", 21, ["system-path"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/redhat-jre");
        });

        it("falls through redhat.java (Java 17) to find Java 21 elsewhere", async () => {
            selector._setCacheForTesting([
                makeJava("/redhat-jre", 17, ["redhat.java"]),
                makeJava("/vscode-default", 21, ["vscode-settings"], { isDefault: true }),
                makeJava("/system", 21, ["system-path"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/vscode-default");
            assert.strictEqual(result.majorVersion, 21);
        });

        it("prefers vscode-settings default (priority 1) over non-default vscode-settings (priority 2)", async () => {
            selector._setCacheForTesting([
                makeJava("/vscode-default", 21, ["vscode-settings"], { isDefault: true }),
                makeJava("/vscode-other",   21, ["vscode-settings"]),
                makeJava("/java-home",       21, ["system-path", "JAVA_HOME"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/vscode-default");
        });

        it("prefers JAVA_HOME (priority 3) over system scan (priority 5)", async () => {
            selector._setCacheForTesting([
                makeJava("/java-home",   21, ["system-path", "JAVA_HOME"]),
                makeJava("/system-scan", 21, ["system-path"]),
            ]);
            const result = await selector.findFirstValid(21);
            assert.strictEqual(result.path, "/java-home");
        });
    });

    describe("findFirstValid. Strategy injection", () => {
        it("uses injected strategy results and sorts by priority", async () => {
            const mockStrategy = {
                name: "mock",
                async detect() {
                    return [
                        makeJava("/system-java",  21, ["system-path"]),
                        makeJava("/redhat-java",  21, ["redhat.java"]),
                        makeJava("/vscode-java",  21, ["vscode-settings"], { isDefault: true }),
                    ];
                }
            };
            selector._setStrategiesForTesting([mockStrategy]);
            selector.clearCache();
            const result = await selector.findFirstValid(21);
            // redhat.java is priority 0
            assert.strictEqual(result.path, "/redhat-java");
        });

        it("merges duplicate paths from multiple strategies and combines sources", async () => {
            const mockStrategy = {
                name: "mock",
                async detect() {
                    return [
                        makeJava("/shared", 21, ["system-path"]),
                        makeJava("/shared", 21, ["redhat.java"]),
                    ];
                }
            };
            selector._setStrategiesForTesting([mockStrategy]);
            selector.clearCache();
            await selector.findFirstValid(21);
            const cache: IJavaInstallation[] = (selector as any).cache;
            assert.strictEqual(cache.length, 1);
            assert.ok(cache[0].sources.includes("system-path"));
            assert.ok(cache[0].sources.includes("redhat.java"));
        });
    });

    describe("findForProject. Per-project terminal resolution", () => {

        afterEach(() => {
            // Reset per-project strategies after each test
            selector._setPerProjectStrategiesForTesting([
                { name: "reset", async detect() { return []; } }
            ]);
        });

        it("returns empty string when no candidates are found", async () => {
            selector._setPerProjectStrategiesForTesting([
                { name: "mock", async detect() { return []; } }
            ]);
            const fakeUri = { fsPath: "/some/project/pom.xml" } as any;
            const result = await selector.findForProject(fakeUri);
            assert.strictEqual(result, "");
        });

        it("returns the path of the highest-priority candidate", async () => {
            // vscode-settings default (priority 1) should beat JAVA_HOME (priority 3)
            selector._setPerProjectStrategiesForTesting([
                {
                    name: "mock",
                    async detect() {
                        return [
                            makeJava("/java-home",      17, ["system-path", "JAVA_HOME"]),
                            makeJava("/vscode-default", 17, ["vscode-settings"], { isDefault: true }),
                        ];
                    }
                }
            ]);
            const fakeUri = { fsPath: "/some/project/pom.xml" } as any;
            const result = await selector.findForProject(fakeUri);
            assert.strictEqual(result, "/vscode-default");
        });
    });
});
