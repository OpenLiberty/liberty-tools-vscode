/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 *
 * Unit tests for user-configured debug port detection:
 *   - WLP_DEBUG_ADDRESS in server.env text / the source server.env file
 *   - dev-mode debug flag construction for Maven and Gradle
 * (A Maven pom <libertyDebugPort> is not read by the extension: the plugin already honors it
 *  and it takes precedence over -DdebugPort. Gradle has no build-file source.)
 * Plain Mocha + Chai — no VS Code window required.
 */
import { strict as assert } from "assert";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { installFakeVscode } from "./fakeVscode";

// Install the vscode fake before importing any extension code.
installFakeVscode({}, true);

import {
    parseDebugPortFromServerEnv,
    readDebugPortFromSourceServerEnv,
    resolveDebugPort,
    buildDevModeDebugPortFlag,
    SOURCE_SERVER_ENV_RELATIVE_PATH,
} from "../../util/serverEnvUtil";
import {
    DEFAULT_DEVMODE_DEBUG_PORT,
    MAVEN_DEVMODE_DEBUG_PORT_PREFIX,
    GRADLE_DEVMODE_DEBUG_PORT_PREFIX,
} from "../../definitions/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tmpPaths: string[] = [];

function writeTmp(name: string, content: string): string {
    const p = path.join(os.tmpdir(), `liberty-test-${process.pid}-${name}`);
    fs.writeFileSync(p, content, "utf8");
    tmpPaths.push(p);
    return p;
}

function makeTmpProjectDir(name: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `liberty-test-${process.pid}-${name}-`));
    tmpPaths.push(dir);
    return dir;
}

after(() => {
    for (const p of tmpPaths) {
        try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ }
    }
});

// ---------------------------------------------------------------------------
// parseDebugPortFromServerEnv
// ---------------------------------------------------------------------------

describe("parseDebugPortFromServerEnv", () => {

    it("parses a single WLP_DEBUG_ADDRESS line", () => {
        assert.equal(parseDebugPortFromServerEnv("WLP_DEBUG_ADDRESS=8888\n"), "8888");
    });

    it("last occurrence wins when the key is duplicated", () => {
        const text = "WLP_DEBUG_ADDRESS=8888\nFOO=bar\nWLP_DEBUG_ADDRESS=7777\n";
        assert.equal(parseDebugPortFromServerEnv(text), "7777");
    });

    it("tolerates CRLF line endings", () => {
        const text = "FOO=bar\r\nWLP_DEBUG_ADDRESS=8888\r\n";
        assert.equal(parseDebugPortFromServerEnv(text), "8888");
    });

    it("tolerates CRLF with duplicate lines (last wins)", () => {
        const text = "WLP_DEBUG_ADDRESS=8888\r\nWLP_DEBUG_ADDRESS=7777\r\n";
        assert.equal(parseDebugPortFromServerEnv(text), "7777");
    });

    it("ignores commented-out lines", () => {
        const text = "# WLP_DEBUG_ADDRESS=1111\nWLP_DEBUG_ADDRESS=8888\n#WLP_DEBUG_ADDRESS=2222\n";
        assert.equal(parseDebugPortFromServerEnv(text), "8888");
    });

    it("returns undefined when only a comment mentions the key", () => {
        assert.equal(parseDebugPortFromServerEnv("# WLP_DEBUG_ADDRESS=8888\n"), undefined);
    });

    it("ignores blank lines", () => {
        assert.equal(parseDebugPortFromServerEnv("\n\n  \nWLP_DEBUG_ADDRESS=8888\n\n"), "8888");
    });

    it("returns undefined when there is no match", () => {
        assert.equal(parseDebugPortFromServerEnv("FOO=bar\nBAZ=1\n"), undefined);
    });

    it("returns undefined for empty text", () => {
        assert.equal(parseDebugPortFromServerEnv(""), undefined);
    });

    it("returns undefined when the value is not numeric", () => {
        assert.equal(parseDebugPortFromServerEnv("WLP_DEBUG_ADDRESS=abc\n"), undefined);
    });

    it("keeps the earlier valid value when a later line is invalid", () => {
        assert.equal(parseDebugPortFromServerEnv("WLP_DEBUG_ADDRESS=8888\nWLP_DEBUG_ADDRESS=abc\n"), "8888");
    });
});

// ---------------------------------------------------------------------------
// readDebugPortFromSourceServerEnv
// ---------------------------------------------------------------------------

describe("readDebugPortFromSourceServerEnv", () => {

    it("returns undefined when the source server.env does not exist", () => {
        const dir = makeTmpProjectDir("no-server-env");
        assert.equal(readDebugPortFromSourceServerEnv(dir), undefined);
    });

    it("reads WLP_DEBUG_ADDRESS from src/main/liberty/config/server.env", () => {
        const dir = makeTmpProjectDir("with-server-env");
        const configDir = path.join(dir, "src", "main", "liberty", "config");
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, "server.env"), "WLP_DEBUG_ADDRESS=8888\r\nWLP_DEBUG_ADDRESS=9999\r\n", "utf8");
        assert.equal(readDebugPortFromSourceServerEnv(dir), "9999");
    });

    it("returns undefined when the file has no WLP_DEBUG_ADDRESS", () => {
        const dir = makeTmpProjectDir("server-env-no-match");
        const configDir = path.join(dir, "src", "main", "liberty", "config");
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(path.join(configDir, "server.env"), "FOO=bar\n", "utf8");
        assert.equal(readDebugPortFromSourceServerEnv(dir), undefined);
    });
});

// ---------------------------------------------------------------------------
// Flag builder: buildDevModeDebugPortFlag
// ---------------------------------------------------------------------------

describe("buildDevModeDebugPortFlag", () => {

    it("builds Maven flag using MAVEN_DEVMODE_DEBUG_PORT_PREFIX", () => {
        assert.equal(buildDevModeDebugPortFlag(true, "8888"), "-DdebugPort=8888");
        assert.equal(buildDevModeDebugPortFlag(true, DEFAULT_DEVMODE_DEBUG_PORT), "-DdebugPort=7777");
    });

    it("builds Gradle flag using GRADLE_DEVMODE_DEBUG_PORT_PREFIX", () => {
        assert.equal(buildDevModeDebugPortFlag(false, "8888"), "--libertyDebugPort=8888");
        assert.equal(buildDevModeDebugPortFlag(false, DEFAULT_DEVMODE_DEBUG_PORT), "--libertyDebugPort=7777");
    });

    it("matches default constants byte-for-byte with no custom port", () => {
        assert.equal(buildDevModeDebugPortFlag(true, "7777"), `${MAVEN_DEVMODE_DEBUG_PORT_PREFIX}=7777`);
        assert.equal(buildDevModeDebugPortFlag(false, "7777"), `${GRADLE_DEVMODE_DEBUG_PORT_PREFIX}=7777`);
    });
});

// ---------------------------------------------------------------------------
// Resolution helper: resolveDebugPort
// ---------------------------------------------------------------------------

describe("resolveDebugPort", () => {

    it("returns the server.env port when WLP_DEBUG_ADDRESS is configured", () => {
        const dir = makeTmpProjectDir("resolve-server-env");
        const serverEnvPath = path.join(dir, SOURCE_SERVER_ENV_RELATIVE_PATH);
        fs.mkdirSync(path.dirname(serverEnvPath), { recursive: true });
        fs.writeFileSync(serverEnvPath, "WLP_DEBUG_ADDRESS=8888\n", "utf8");

        assert.equal(resolveDebugPort(dir), "8888");
    });

    it("returns default 7777 when no server.env exists", () => {
        const dir = makeTmpProjectDir("resolve-default");
        const resolved = resolveDebugPort(dir);
        assert.equal(resolved, DEFAULT_DEVMODE_DEBUG_PORT);
        assert.equal(resolved, "7777");
    });

    it("returns default 7777 when server.env exists but has no WLP_DEBUG_ADDRESS", () => {
        const dir = makeTmpProjectDir("resolve-server-env-no-port");
        const serverEnvPath = path.join(dir, SOURCE_SERVER_ENV_RELATIVE_PATH);
        fs.mkdirSync(path.dirname(serverEnvPath), { recursive: true });
        fs.writeFileSync(serverEnvPath, "SOME_OTHER_VAR=value\n", "utf8");

        assert.equal(resolveDebugPort(dir), "7777");
    });
});

// ---------------------------------------------------------------------------
// End-to-end resolution & flag generation: Maven & Gradle
// ---------------------------------------------------------------------------

describe("Dev mode debug flag resolution (Maven & Gradle)", () => {

    function projectDirWithServerEnv(name: string, port: string | undefined): string {
        const dir = makeTmpProjectDir(name);
        if (port !== undefined) {
            const serverEnvPath = path.join(dir, SOURCE_SERVER_ENV_RELATIVE_PATH);
            fs.mkdirSync(path.dirname(serverEnvPath), { recursive: true });
            fs.writeFileSync(serverEnvPath, `WLP_DEBUG_ADDRESS=${port}\n`, "utf8");
        }
        return dir;
    }

    it("Maven: server.env port produces -DdebugPort=<port>", () => {
        const resolvedPort = resolveDebugPort(projectDirWithServerEnv("maven-e2e-server-env", "9999"));
        assert.equal(resolvedPort, "9999");
        assert.equal(buildDevModeDebugPortFlag(true, resolvedPort), "-DdebugPort=9999");
    });

    it("Maven: default 7777 produces -DdebugPort=7777 when nothing is configured", () => {
        const resolvedPort = resolveDebugPort(projectDirWithServerEnv("maven-e2e-default", undefined));
        assert.equal(resolvedPort, "7777");
        assert.equal(buildDevModeDebugPortFlag(true, resolvedPort), "-DdebugPort=7777");
    });

    it("Gradle: server.env port produces --libertyDebugPort=<port>", () => {
        const resolvedPort = resolveDebugPort(projectDirWithServerEnv("gradle-e2e-server-env", "9999"));
        assert.equal(resolvedPort, "9999");
        assert.equal(buildDevModeDebugPortFlag(false, resolvedPort), "--libertyDebugPort=9999");
    });

    it("Gradle: default 7777 produces --libertyDebugPort=7777 when nothing is configured", () => {
        const resolvedPort = resolveDebugPort(projectDirWithServerEnv("gradle-e2e-default", undefined));
        assert.equal(resolvedPort, "7777");
        assert.equal(buildDevModeDebugPortFlag(false, resolvedPort), "--libertyDebugPort=7777");
    });
});

// ---------------------------------------------------------------------------
// Attach debugger port selection (tryAttach / attachDebugger)
// ---------------------------------------------------------------------------

describe("Attach debugger port selection (tryAttach / attachDebugger)", () => {

    it("selects port from a single WLP_DEBUG_ADDRESS line in generated server.env", () => {
        const filePath = writeTmp("server-env-single.env", "WLP_DEBUG_ADDRESS=7777\n");
        const port = parseDebugPortFromServerEnv(fs.readFileSync(filePath, "utf8"));
        assert.equal(port, "7777");
    });

    it("last occurrence wins when server.env contains duplicate WLP_DEBUG_ADDRESS lines", () => {
        // User's configured 8888 line followed by Liberty's appended 7777 line
        const filePath = writeTmp("server-env-dup.env", "WLP_DEBUG_ADDRESS=8888\nWLP_DEBUG_ADDRESS=7777\n");
        const port = parseDebugPortFromServerEnv(fs.readFileSync(filePath, "utf8"));
        assert.equal(port, "7777");
    });

    it("last occurrence wins when Liberty's line is followed by user's line", () => {
        const filePath = writeTmp("server-env-dup-rev.env", "WLP_DEBUG_ADDRESS=7777\nWLP_DEBUG_ADDRESS=8888\n");
        const port = parseDebugPortFromServerEnv(fs.readFileSync(filePath, "utf8"));
        assert.equal(port, "8888");
    });

    it("returns undefined when server.env has no match (triggers wait in tryAttach / error in attachDebugger)", () => {
        const filePath = writeTmp("server-env-no-match.env", "JAVA_HOME=/opt/java\nJVM_ARGS=-Xmx512m\n");
        const port = parseDebugPortFromServerEnv(fs.readFileSync(filePath, "utf8"));
        assert.equal(port, undefined);
    });

    it("returns undefined for empty server.env (file created but not yet written)", () => {
        const filePath = writeTmp("server-env-empty.env", "");
        const port = parseDebugPortFromServerEnv(fs.readFileSync(filePath, "utf8"));
        assert.equal(port, undefined);
    });
});
