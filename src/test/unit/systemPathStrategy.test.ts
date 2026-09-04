/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// Testing mimicked from app-mod-vscode-extension repo but uses mocha instead of jest
// Stub jdk-utils before any extension imports.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;

// Mutable so individual tests can replace findRuntimes behaviour.
let findRuntimesImpl: () => Promise<any[]> = async () => [];

// Evict jdk-utils and system-path-strategy from cache so our hook is used
// instead of whatever was cached by an earlier test file in this run.
Object.keys(require.cache).forEach(key => {
    if (key.includes("jdk-utils") || key.includes("system-path-strategy")) {
        delete require.cache[key];
    }
});

Module._load = function(request: string, ...args: any[]) {
    if (request === "jdk-utils") {
        return { findRuntimes: () => findRuntimesImpl() };
    }
    if (request === "vscode") {
        return {
            Uri: { file: (p: string) => ({ fsPath: p }) },
            workspace: { getConfiguration: () => ({ get: () => undefined }) },
        };
    }
    return originalLoad.call(this, request, ...args);
};

import * as assert from "assert";
import { systemPathStrategy } from "../../util/java-detection/strategies/system-path-strategy";

// test systemPathStrategy.detect(), which calls jdk-utils.findRuntimes() to scan JAVA_HOME, JDK_HOME, Homebrew, etc

describe("systemPathStrategy", () => {

    afterEach(() => {
        findRuntimesImpl = async () => [];
    });

    it("returns [] when findRuntimes returns nothing", async () => {
        findRuntimesImpl = async () => [];
        const result = await systemPathStrategy.detect();
        assert.deepStrictEqual(result, []);
    });

    it("maps a single IJavaRuntime to an IJavaInstallation", async () => {
        findRuntimesImpl = async () => ([{
            homedir: "/usr/lib/jvm/java-17",
            hasJavac: true,
            version: { java_version: "17.0.5", major: 17 },
        }]);
        const result = await systemPathStrategy.detect();
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].path, "/usr/lib/jvm/java-17");
        assert.strictEqual(result[0].version, "17.0.5");
        assert.strictEqual(result[0].majorVersion, 17);
        assert.strictEqual(result[0].isJdk, true);
        assert.ok(result[0].sources.includes("system-path"));
    });

    it("maps multiple runtimes", async () => {
        findRuntimesImpl = async () => ([
            { homedir: "/jdk11", hasJavac: true,  version: { java_version: "11.0.7", major: 11 } },
            { homedir: "/jdk17", hasJavac: true,  version: { java_version: "17.0.5", major: 17 } },
        ]);
        const result = await systemPathStrategy.detect();
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].path, "/jdk11");
        assert.strictEqual(result[1].path, "/jdk17");
    });

    it("tags JAVA_HOME in sources when isJavaHomeEnv is true", async () => {
        findRuntimesImpl = async () => ([{
            homedir: "/jdk17", hasJavac: true,
            version: { java_version: "17.0.5", major: 17 },
            isJavaHomeEnv: true,
        }]);
        const result = await systemPathStrategy.detect();
        assert.ok(result[0].sources.includes("system-path"));
        assert.ok(result[0].sources.includes("JAVA_HOME"));
    });

    it("tags JDK_HOME in sources when isJdkHomeEnv is true", async () => {
        findRuntimesImpl = async () => ([{
            homedir: "/jdk21", hasJavac: true,
            version: { java_version: "21.0.1", major: 21 },
            isJdkHomeEnv: true,
        }]);
        const result = await systemPathStrategy.detect();
        assert.ok(result[0].sources.includes("system-path"));
        assert.ok(result[0].sources.includes("JDK_HOME"));
    });

    it("does not tag JAVA_HOME or JDK_HOME for a plain system scan entry", async () => {
        findRuntimesImpl = async () => ([{
            homedir: "/jdk21", hasJavac: true,
            version: { java_version: "21.0.1", major: 21 },
        }]);
        const result = await systemPathStrategy.detect();
        assert.deepStrictEqual(result[0].sources, ["system-path"]);
    });

    it("returns [] when findRuntimes throws", async () => {
        findRuntimesImpl = async () => { throw new Error("system error"); };
        const result = await systemPathStrategy.detect();
        assert.deepStrictEqual(result, []);
    });
});
