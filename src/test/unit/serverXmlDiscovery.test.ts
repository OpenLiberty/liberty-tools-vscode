/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 *
 * Unit tests for the server.xml-based Liberty signal in project discovery.
 * Plain mocha, no VS Code instance required.
 *
 * Scenario: An aggregator pom.xml with a sub-module that has
 *   src/main/liberty/config/server.xml but no Liberty plugin declared
 *   in either the aggregator or the child pom.
 *
 * The aggregator should still surface in the Liberty dashboard because
 * hasServerXML() promotes isLibertyEnabled=true for the child during
 * stampProjects(), and linkProjects() propagates that up via hasLibertyDescendants().
 */

import { strict as assert } from "assert";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { hasServerXML } from "../../liberty/projectDiscovery";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "liberty-serverxml-test-"));
}

function createFile(filePath: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "");
}

// ── hasServerXML ──────────────────────────────────────────────────────────────

describe("hasServerXML", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = makeTmpDir();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns true when server.xml exists at the standard path (Maven)", () => {
        const pomFile = path.join(tmpDir, "pom.xml");
        const serverXML = path.join(tmpDir, "src", "main", "liberty", "config", "server.xml");
        createFile(pomFile);
        createFile(serverXML);

        assert.ok(hasServerXML(pomFile));
    });

    it("returns true when server.xml exists at the standard path (Gradle)", () => {
        const buildFile = path.join(tmpDir, "build.gradle");
        const serverXML = path.join(tmpDir, "src", "main", "liberty", "config", "server.xml");
        createFile(buildFile);
        createFile(serverXML);

        assert.ok(hasServerXML(buildFile));
    });

    it("returns false when server.xml is absent", () => {
        const pomFile = path.join(tmpDir, "pom.xml");
        createFile(pomFile);

        assert.equal(hasServerXML(pomFile), false);
    });

    it("returns false when server.xml is at a non-standard path (missing 'config' segment)", () => {
        const pomFile = path.join(tmpDir, "pom.xml");
        const wrongPath = path.join(tmpDir, "src", "main", "liberty", "server.xml");
        createFile(pomFile);
        createFile(wrongPath);

        assert.equal(hasServerXML(pomFile), false);
    });
});
