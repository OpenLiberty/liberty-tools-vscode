/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 *
 * Regression test for the "server.xml-only children should be suppressed when
 * a sibling has the Liberty plugin explicitly applied" fix.
 *
 * Scenario
 * --------
 * Parent POM declares configDirectory in <pluginManagement> (no Liberty plugin
 * in <build><plugins>).  Three child modules exist:
 *   - child-a: explicitly applies the liberty-maven-plugin → should appear
 *   - child-b: no plugin, but has a server.xml at the configured location → should be hidden
 *   - child-c: no plugin, no server.xml → never Liberty-enabled, should be hidden
 *
 * Before the fix:   child-a and child-b both appeared in the tree.
 * After the fix:    only child-a appears; child-b and child-c are suppressed.
 */

import { installFakeVscode, FakeVscode } from "./fakeVscode";
const fakeVscode: FakeVscode = installFakeVscode({}, true);

import { strict as assert } from "assert";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { discoverWorkspace } from "../../liberty/projectDiscovery";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "liberty-child-suppression-test-"));
}

function createFile(filePath: string, content = ""): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function listFiles(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { listFiles(p, out); } else { out.push(p); }
    }
    return out;
}

function mockFindFiles(tmpDir: string): void {
    fakeVscode.workspace.findFiles = async (pattern: any) => {
        const suffix = String(pattern.pattern).replace(/^\*\*\//, "").split("/").join(path.sep);
        return listFiles(tmpDir)
            .filter(f => f.endsWith(path.sep + suffix) || f === path.join(tmpDir, suffix))
            .map(f => ({ fsPath: f }));
    };
}

const fakeContext: any = {
    subscriptions: [],
    workspaceState: { get: () => undefined, update: () => Promise.resolve() },
    extensionPath: ""
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("child suppression when a sibling has explicit Liberty plugin", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = makeTmpDir();
        fakeVscode.workspace.workspaceFolders = [{ uri: { fsPath: tmpDir } }];
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fakeVscode.workspace.workspaceFolders = undefined;
        fakeVscode.workspace.findFiles = () => Promise.resolve([]);
    });

    it("hides server.xml-only children when a sibling explicitly applies the Liberty plugin (Maven)", async () => {
        // Parent: aggregator with configDirectory in pluginManagement
        createFile(path.join(tmpDir, "pom.xml"), `
<project>
  <groupId>g</groupId><artifactId>parent</artifactId><version>1</version>
  <packaging>pom</packaging>
  <modules>
    <module>child-a</module>
    <module>child-b</module>
    <module>child-c</module>
  </modules>
  <build>
    <pluginManagement>
      <plugins>
        <plugin>
          <groupId>io.openliberty.tools</groupId>
          <artifactId>liberty-maven-plugin</artifactId>
          <version>3.10.0</version>
          <configuration>
            <configDirectory>src/main/liberty/config</configDirectory>
          </configuration>
        </plugin>
      </plugins>
    </pluginManagement>
  </build>
</project>`);

        // child-a: explicitly applies the Liberty plugin — should appear
        createFile(path.join(tmpDir, "child-a", "pom.xml"), `
<project>
  <parent><groupId>g</groupId><artifactId>parent</artifactId><version>1</version></parent>
  <artifactId>child-a</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>`);
        createFile(path.join(tmpDir, "child-a", "src", "main", "liberty", "config", "server.xml"), "<server/>");

        // child-b: no plugin, but has server.xml at the inherited configDirectory — should be hidden
        createFile(path.join(tmpDir, "child-b", "pom.xml"), `
<project>
  <parent><groupId>g</groupId><artifactId>parent</artifactId><version>1</version></parent>
  <artifactId>child-b</artifactId>
</project>`);
        createFile(path.join(tmpDir, "child-b", "src", "main", "liberty", "config", "server.xml"), "<server/>");

        // child-c: no plugin, no server.xml — never Liberty-enabled, already hidden
        createFile(path.join(tmpDir, "child-c", "pom.xml"), `
<project>
  <parent><groupId>g</groupId><artifactId>parent</artifactId><version>1</version></parent>
  <artifactId>child-c</artifactId>
</project>`);

        mockFindFiles(tmpDir);

        const result = await discoverWorkspace(fakeContext, [{ uri: { fsPath: tmpDir } } as any], new Map());

        const childA = result.projects.get(path.join(tmpDir, "child-a", "pom.xml"));
        const childB = result.projects.get(path.join(tmpDir, "child-b", "pom.xml"));
        const parentProject = result.projects.get(path.join(tmpDir, "pom.xml"));

        assert.ok(parentProject, "parent aggregator must be in projects");
        assert.ok(childA, "child-a must be in projects");
        assert.ok(childA!.isLibertyEnabled, "child-a (explicit plugin) must be Liberty-enabled");
        assert.ok(childA!.hasLibertyPlugin, "child-a must have hasLibertyPlugin=true");

        // child-b has a server.xml at the right path but no explicit plugin — must be suppressed
        if (childB) {
            assert.equal(childB.isLibertyEnabled, false,
                "child-b (server.xml only, sibling has plugin) must be suppressed");
        }

        // The tree under the aggregator must show only child-a
        const visibleChildren = (parentProject?.children ?? []).filter(c => c.isLibertyEnabled);
        assert.equal(visibleChildren.length, 1, "only child-a should be visible under the aggregator");
        assert.equal(visibleChildren[0].path, path.join(tmpDir, "child-a", "pom.xml"));
    });
});
