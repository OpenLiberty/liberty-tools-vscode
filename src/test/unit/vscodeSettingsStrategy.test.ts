/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;

// We need a mutable reference so individual tests can override getConfiguration.
let getConfigurationImpl: (section?: string, scope?: any) => any = () => ({ get: () => undefined });

const fakeVscodeRef = {
    Uri: { file: (p: string) => ({ fsPath: p }) },
    workspace: {
        getConfiguration: (section?: string, scope?: any) => getConfigurationImpl(section, scope),
        onDidChangeConfiguration: () => ({ dispose() {} }),
    },
};

// Evict cached modules so our hook takes effect even when another test file
// in this Mocha run has already loaded jdk-utils or vscode-settings-strategy.
Object.keys(require.cache).forEach(key => {
    if (key.includes("jdk-utils") || key.includes("vscode-settings-strategy")) {
        delete require.cache[key];
    }
});

Module._load = function(request: string, ...args: any[]) {
    if (request === "jdk-utils") {
        return {
            // getRuntime always returns a fixed Java 17 result so version
            // lookups never hit disk. Tests control settings via getConfigurationImpl.
            getRuntime: async (path: string) => ({
                homedir: path,
                hasJavac: true,
                version: { java_version: "17.0.0", major: 17 },
            }),
            findRuntimes: async () => [],
        };
    }
    if (request === "vscode") {
        return fakeVscodeRef;
    }
    return originalLoad.call(this, request, ...args);
};

import * as assert from "assert";
import { vscodeSettingsStrategy } from "../../util/java-detection/strategies/vscode-settings-strategy";

// helpers ──────────────────────────────────────────────────────────────────

/** Build a fake workspace.getConfiguration() that returns the given key→value map. */
function fakeConfig(values: Record<string, any>) {
    return { get: (key: string) => values[key] ?? undefined };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("vscodeSettingsStrategy", () => {

    afterEach(() => {
        getConfigurationImpl = () => ({ get: () => undefined });
    });

    describe("Returns empty array when nothing is configured", () => {
        it("returns [] when all settings are undefined", async () => {
            getConfigurationImpl = () => fakeConfig({});
            const result = await vscodeSettingsStrategy.detect();
            assert.deepStrictEqual(result, []);
        });
    });

    describe("java.configuration.runtimes", () => {
        it("returns a single installation and marks it as default (only entry)", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.configuration.runtimes": [
                    { name: "JavaSE-17", path: "/jdks/java-17" }
                ]
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].path, "/jdks/java-17");
            assert.strictEqual(result[0].name, "JavaSE-17");
            assert.strictEqual(result[0].isDefault, true);
            assert.ok(result[0].sources.includes("vscode-settings"));
        });

        it("marks the first entry as default when no entry has default:true", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.configuration.runtimes": [
                    { name: "JavaSE-11", path: "/jdks/java-11" },
                    { name: "JavaSE-17", path: "/jdks/java-17" },
                ]
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].isDefault, true);
            assert.strictEqual(result[1].isDefault, undefined);
        });

        it("respects an explicit default:true flag", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.configuration.runtimes": [
                    { name: "JavaSE-11", path: "/jdks/java-11" },
                    { name: "JavaSE-17", path: "/jdks/java-17", default: true },
                    { name: "JavaSE-21", path: "/jdks/java-21" },
                ]
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].isDefault, undefined);
            assert.strictEqual(result[1].isDefault, true);
            assert.strictEqual(result[2].isDefault, undefined);
        });

        it("skips entries with no path", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.configuration.runtimes": [
                    { name: "JavaSE-17" }, // no path — should be skipped
                    { name: "JavaSE-21", path: "/jdks/java-21" },
                ]
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].path, "/jdks/java-21");
        });
    });

    describe("Single string settings", () => {
        it("returns an installation from java.jdt.ls.java.home", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.jdt.ls.java.home": "/jdks/java-17"
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].path, "/jdks/java-17");
            assert.ok(result[0].sources.includes("vscode-settings"));
        });

        it("returns an installation from xml.java.home", async () => {
            getConfigurationImpl = () => fakeConfig({
                "xml.java.home": "/jdks/java-21"
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].path, "/jdks/java-21");
        });

        it("ignores empty string settings", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.jdt.ls.java.home": "   " // whitespace only
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.deepStrictEqual(result, []);
        });
    });

    describe("Combining runtimes + string settings", () => {
        it("returns both java.configuration.runtimes and java.jdt.ls.java.home entries", async () => {
            getConfigurationImpl = () => fakeConfig({
                "java.configuration.runtimes": [
                    { name: "JavaSE-11", path: "/jdks/java-11", default: true }
                ],
                "java.jdt.ls.java.home": "/jdks/java-17",
            });
            const result = await vscodeSettingsStrategy.detect();
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].path, "/jdks/java-11");
            assert.strictEqual(result[0].isDefault, true);
            assert.strictEqual(result[1].path, "/jdks/java-17");
        });
    });

    describe("Scope is passed through to getConfiguration", () => {
        it("calls getConfiguration with the provided scope URI", async () => {
            let capturedScope: any;
            getConfigurationImpl = (_section, scope) => {
                capturedScope = scope;
                return fakeConfig({});
            };
            const fakeUri = { fsPath: "/my/project/pom.xml" } as any;
            await vscodeSettingsStrategy.detect(fakeUri);
            assert.strictEqual(capturedScope, fakeUri);
        });
    });
});
