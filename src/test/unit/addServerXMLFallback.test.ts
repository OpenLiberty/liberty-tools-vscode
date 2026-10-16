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
import { addServerXMLProjects, ParsedBuildEntry } from "../../liberty/projectDiscovery";
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
});
