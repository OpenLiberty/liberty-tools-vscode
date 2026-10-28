/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { installFakeVscode, FakeVscode } from "./fakeVscode";

const fakeVscode: FakeVscode = installFakeVscode({}, true);

import { strict as assert } from "assert";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { addServerXMLProjects, discoverWorkspace, ParsedBuildEntry } from "../../liberty/projectDiscovery";
import { LibertyProject } from "../../liberty/libertyProject";

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "liberty-fallback-test-"));
}

function createFile(filePath: string, content = ""): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

describe("addServerXMLProjects fallback (tree-climb)", () => {
    let tmpDir: string;
    const fakeContext: any = {
        subscriptions: [],
        workspaceState: { get: () => undefined, update: () => Promise.resolve() },
        extensionPath: ""
    };

    beforeEach(() => {
        tmpDir = makeTmpDir();
        fakeVscode.workspace.workspaceFolders = [{ uri: { fsPath: tmpDir } }];
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fakeVscode.workspace.workspaceFolders = undefined;
        fakeVscode.workspace.findFiles = () => Promise.resolve([]);
    });

    it("discovers pom.xml via tree-climb fallback from non-standard server.xml path", async () => {
        const pomFile = path.join(tmpDir, "module-a", "pom.xml");
        const customServerXML = path.join(tmpDir, "module-a", "custom-config-dir", "server.xml");

        // Write a valid minimal POM
        const pomContent = `
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>test</groupId>
  <artifactId>module-a</artifactId>
  <version>1.0</version>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>`;

        createFile(pomFile, pomContent);
        createFile(customServerXML, "<server></server>");

        // Mock findFiles
        fakeVscode.workspace.findFiles = async (pattern: any) => {
            if (pattern.pattern.includes("src/main/liberty/config/server.xml")) {
                return [];
            } else if (pattern.pattern.includes("**/server.xml")) {
                return [{ fsPath: customServerXML }];
            }
            return [];
        };

        const projectsMap = new Map<string, LibertyProject>();
        const existingProjects = new Map<string, LibertyProject>();
        const allEntries: ParsedBuildEntry[] = [];

        await addServerXMLProjects(fakeContext, projectsMap, existingProjects, allEntries);

        // Verify module-a/pom.xml is discovered and added to both projectsMap and allEntries
        assert.ok(projectsMap.has(pomFile), "projectsMap should have the discovered POM");
        assert.equal(allEntries.length, 1, "allEntries should have exactly 1 entry");
        assert.equal(allEntries[0].path, pomFile);
        assert.equal(allEntries[0].type, "maven");
        assert.ok(allEntries[0].xmlString?.includes("<artifactId>module-a</artifactId>"));
    });

    it("discovers build.gradle via tree-climb fallback from non-standard server.xml path", async () => {
        const gradleFile = path.join(tmpDir, "module-b", "build.gradle");
        const customServerXML = path.join(tmpDir, "module-b", "custom-config-dir", "server.xml");

        // Write a Gradle file containing Liberty plugin text
        const gradleContent = `
plugins {
    id 'io.openliberty.tools.gradle.Liberty'
}
`;

        createFile(gradleFile, gradleContent);
        createFile(customServerXML, "<server></server>");

        // Mock findFiles
        fakeVscode.workspace.findFiles = async (pattern: any) => {
            if (pattern.pattern.includes("src/main/liberty/config/server.xml")) {
                return [];
            } else if (pattern.pattern.includes("**/server.xml")) {
                return [{ fsPath: customServerXML }];
            }
            return [];
        };

        const projectsMap = new Map<string, LibertyProject>();
        const existingProjects = new Map<string, LibertyProject>();
        const allEntries: ParsedBuildEntry[] = [];

        await addServerXMLProjects(fakeContext, projectsMap, existingProjects, allEntries);

        // Verify module-b/build.gradle is discovered
        assert.ok(projectsMap.has(gradleFile), "projectsMap should have the discovered Gradle file");
        assert.equal(allEntries.length, 1, "allEntries should have exactly 1 entry");
        assert.equal(allEntries[0].path, gradleFile);
        assert.equal(allEntries[0].type, "gradle");
    });

    // ── helpers for the scenarios below ──────────────────────────────────────

    const LIBERTY_PLUGIN = `<plugin><groupId>io.openliberty.tools</groupId><artifactId>liberty-maven-plugin</artifactId>`;
    const pluginMgmtConfig = (dir: string) =>
        `<build><pluginManagement><plugins>${LIBERTY_PLUGIN}<configuration><configDirectory>${dir}</configDirectory></configuration></plugin></plugins></pluginManagement></build>`;

    function listFiles(dir: string, out: string[] = []): string[] {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) { listFiles(p, out); } else { out.push(p); }
        }
        return out;
    }

    /** findFiles fake that globs "**\/<suffix>" under tmpDir. */
    function mockFindFiles(): void {
        fakeVscode.workspace.findFiles = async (pattern: any) => {
            const suffix = String(pattern.pattern).replace(/^\*\*\//, "").split("/").join(path.sep);
            return listFiles(tmpDir)
                .filter(f => f.endsWith(path.sep + suffix) || f === path.join(tmpDir, suffix))
                .map(f => ({ fsPath: f }));
        };
    }

    // ── inheritance / guard / placeholders ───────────────────────────────────

    it("enables a child module that inherits configDirectory from its parent's pluginManagement", async () => {
        createFile(path.join(tmpDir, "pom.xml"),
            `<project><groupId>g</groupId><artifactId>parent</artifactId><version>1</version><packaging>pom</packaging>
             <modules><module>child</module></modules>${pluginMgmtConfig("src/main/custom")}</project>`);
        createFile(path.join(tmpDir, "child", "pom.xml"),
            `<project><parent><groupId>g</groupId><artifactId>parent</artifactId><version>1</version></parent><artifactId>child</artifactId></project>`);
        createFile(path.join(tmpDir, "child", "src", "main", "custom", "server.xml"), "<server/>");
        mockFindFiles();

        const result = await discoverWorkspace(fakeContext, [{ uri: { fsPath: tmpDir } } as any], new Map());

        const child = result.projects.get(path.join(tmpDir, "child", "pom.xml"));
        assert.ok(child, "child should be a project");
        assert.equal(child!.isLibertyEnabled, true);
        assert.deepEqual(result.rootProjects.map(r => r.path), [path.join(tmpDir, "pom.xml")]);
    });

    it("discovers a nested pom whose only Liberty signal is a pluginManagement configDirectory, even when a root project exists", async () => {
        // A root-level project exists, which used to disable the whole fallback.
        createFile(path.join(tmpDir, "pom.xml"),
            `<project><groupId>g</groupId><artifactId>root</artifactId><version>1</version>
             <build><plugins>${LIBERTY_PLUGIN}</plugin></plugins></build></project>`);
        createFile(path.join(tmpDir, "app", "pom.xml"),
            `<project><groupId>g</groupId><artifactId>app</artifactId><version>1</version>${pluginMgmtConfig("src/main/custom")}</project>`);
        createFile(path.join(tmpDir, "app", "src", "main", "custom", "server.xml"), "<server/>");
        mockFindFiles();

        const result = await discoverWorkspace(fakeContext, [{ uri: { fsPath: tmpDir } } as any], new Map());

        const app = result.projects.get(path.join(tmpDir, "app", "pom.xml"));
        assert.ok(app, "app should be discovered through the fallback");
        assert.equal(app!.isLibertyEnabled, true);
    });

    it("discovers a pom whose configDirectory uses ${project.basedir}", async () => {
        createFile(path.join(tmpDir, "app", "pom.xml"),
            `<project><groupId>g</groupId><artifactId>app</artifactId><version>1</version>${pluginMgmtConfig("${project.basedir}/cfg")}</project>`);
        createFile(path.join(tmpDir, "app", "cfg", "server.xml"), "<server/>");
        mockFindFiles();

        const result = await discoverWorkspace(fakeContext, [{ uri: { fsPath: tmpDir } } as any], new Map());

        const app = result.projects.get(path.join(tmpDir, "app", "pom.xml"));
        assert.ok(app, "app should be discovered");
        assert.equal(app!.isLibertyEnabled, true);
    });

    it("does not register a pom that has neither the plugin nor a server.xml in its configDirectory", async () => {
        createFile(path.join(tmpDir, "app", "pom.xml"),
            `<project><groupId>g</groupId><artifactId>app</artifactId><version>1</version>${pluginMgmtConfig("src/main/custom")}</project>`);
        // server.xml exists elsewhere, not at the configDirectory
        createFile(path.join(tmpDir, "app", "other", "server.xml"), "<server/>");
        mockFindFiles();

        const result = await discoverWorkspace(fakeContext, [{ uri: { fsPath: tmpDir } } as any], new Map());

        assert.equal(result.projects.has(path.join(tmpDir, "app", "pom.xml")), false);
    });

    // ── Gradle stamping for already-known projects ───────────────────────────

    it("pushes a stampable entry (regexBuildFile) for an existing Gradle project found via the standard path", async () => {
        const gradleFile = path.join(tmpDir, "app", "build.gradle");
        const serverXML = path.join(tmpDir, "app", "src", "main", "liberty", "config", "server.xml");
        createFile(gradleFile, "plugins { id 'io.openliberty.tools.gradle.Liberty' }\n");
        createFile(serverXML, "<server/>");
        fakeVscode.workspace.findFiles = async (pattern: any) =>
            String(pattern.pattern).includes("src/main/liberty/config/server.xml") ? [{ fsPath: serverXML }] : [];

        const existing = new Map<string, LibertyProject>([[gradleFile, {} as LibertyProject]]);
        const allEntries: ParsedBuildEntry[] = [];
        await addServerXMLProjects(fakeContext, new Map(), existing, allEntries);

        assert.equal(allEntries.length, 1);
        assert.ok(allEntries[0].regexBuildFile, "existing Gradle entries must carry regexBuildFile so stampProjects stamps them");
    });

    it("pushes a stampable entry (regexBuildFile) for an existing Gradle project found via the tree-climb", async () => {
        const gradleFile = path.join(tmpDir, "app", "build.gradle");
        const serverXML = path.join(tmpDir, "app", "custom", "server.xml");
        createFile(gradleFile, "plugins { id 'io.openliberty.tools.gradle.Liberty' }\n");
        createFile(serverXML, "<server/>");
        mockFindFiles();

        const existing = new Map<string, LibertyProject>([[gradleFile, {} as LibertyProject]]);
        const allEntries: ParsedBuildEntry[] = [];
        await addServerXMLProjects(fakeContext, new Map(), existing, allEntries);

        assert.equal(allEntries.length, 1);
        assert.ok(allEntries[0].regexBuildFile);
    });

    // ── errors are surfaced, not swallowed ───────────────────────────────────

    it("rejects when a build file found by the tree-climb cannot be read (pom.xml)", async () => {
        // A directory named pom.xml makes readFile fail with EISDIR.
        fs.mkdirSync(path.join(tmpDir, "app", "pom.xml"), { recursive: true });
        createFile(path.join(tmpDir, "app", "custom", "server.xml"), "<server/>");
        mockFindFiles();

        await assert.rejects(
            addServerXMLProjects(fakeContext, new Map(), new Map(), []),
            (err: any) => err.code === "EISDIR"
        );
    });

    it("rejects when a build file found by the tree-climb cannot be read (build.gradle)", async () => {
        fs.mkdirSync(path.join(tmpDir, "app", "build.gradle"), { recursive: true });
        createFile(path.join(tmpDir, "app", "custom", "server.xml"), "<server/>");
        mockFindFiles();

        await assert.rejects(
            addServerXMLProjects(fakeContext, new Map(), new Map(), []),
            (err: any) => err.code === "EISDIR"
        );
    });

    it("rejects when an existing Gradle project's build file cannot be read", async () => {
        const gradleFile = path.join(tmpDir, "app", "build.gradle");
        fs.mkdirSync(gradleFile, { recursive: true });
        createFile(path.join(tmpDir, "app", "custom", "server.xml"), "<server/>");
        mockFindFiles();

        const existing = new Map<string, LibertyProject>([[gradleFile, {} as LibertyProject]]);
        await assert.rejects(
            addServerXMLProjects(fakeContext, new Map(), existing, []),
            (err: any) => err.code === "EISDIR"
        );
    });
});
