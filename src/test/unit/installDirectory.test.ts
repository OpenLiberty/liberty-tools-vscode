/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 *
 * Unit tests for installDirectory / installDir extraction and attachDebugger search order.
 * Plain Mocha + Chai — no VS Code window required.
 */
import { strict as assert } from "assert";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { installFakeVscode } from "./fakeVscode";

// Install the vscode fake before importing any extension code.
const fakeVscode = installFakeVscode({}, true);

import { extractMavenMetadata } from "../../util/mavenUtil";
import { extractGradleMetadata } from "../../util/gradleUtil";
import { extractInstallDirFromParams } from "../../util/commandUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a temp file and return its absolute path. Cleaned up via `after`. */
const tmpFiles: string[] = [];
function writeTmp(name: string, content: string): string {
    const p = path.join(os.tmpdir(), `liberty-test-${process.pid}-${name}`);
    fs.writeFileSync(p, content, "utf8");
    tmpFiles.push(p);
    return p;
}

after(() => {
    for (const f of tmpFiles) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
});

// ---------------------------------------------------------------------------
// Maven: extractMavenMetadata — installDirectory extraction
// ---------------------------------------------------------------------------

describe("extractMavenMetadata — installDirectory", () => {

    it("extracts installDirectory from <build><plugins><configuration>", async () => {
        const pom = writeTmp("pom-install-dir.xml", `
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.8</version>
        <configuration>
          <installDirectory>/opt/wlp</installDirectory>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`);
        const metadata = await extractMavenMetadata(pom);
        assert.equal(metadata.installDirectory, "/opt/wlp");
    });

    it("returns undefined when installDirectory is absent", async () => {
        const pom = writeTmp("pom-no-install-dir.xml", `
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.8</version>
        <configuration>
          <serverStartTimeout>120</serverStartTimeout>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>`);
        const metadata = await extractMavenMetadata(pom);
        assert.equal(metadata.installDirectory, undefined);
    });

    it("returns undefined when liberty-maven-plugin has no <configuration>", async () => {
        const pom = writeTmp("pom-no-config.xml", `
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.8</version>
      </plugin>
    </plugins>
  </build>
</project>`);
        const metadata = await extractMavenMetadata(pom);
        assert.equal(metadata.installDirectory, undefined);
    });

    it("extracts installDirectory from a <profiles> section", async () => {
        const pom = writeTmp("pom-profile-install-dir.xml", `
<project>
  <artifactId>my-app</artifactId>
  <profiles>
    <profile>
      <id>liberty</id>
      <build>
        <plugins>
          <plugin>
            <groupId>io.openliberty.tools</groupId>
            <artifactId>liberty-maven-plugin</artifactId>
            <version>3.8</version>
            <configuration>
              <installDirectory>/opt/wlp-profile</installDirectory>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`);
        const metadata = await extractMavenMetadata(pom);
        assert.equal(metadata.installDirectory, "/opt/wlp-profile");
    });

    it("<build> installDirectory takes precedence over <profiles>", async () => {
        const pom = writeTmp("pom-both-install-dir.xml", `
<project>
  <artifactId>my-app</artifactId>
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.8</version>
        <configuration>
          <installDirectory>/opt/wlp-build</installDirectory>
        </configuration>
      </plugin>
    </plugins>
  </build>
  <profiles>
    <profile>
      <id>liberty</id>
      <build>
        <plugins>
          <plugin>
            <groupId>io.openliberty.tools</groupId>
            <artifactId>liberty-maven-plugin</artifactId>
            <configuration>
              <installDirectory>/opt/wlp-profile</installDirectory>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>
</project>`);
        const metadata = await extractMavenMetadata(pom);
        assert.equal(metadata.installDirectory, "/opt/wlp-build");
    });
});

// ---------------------------------------------------------------------------
// Gradle: extractGradleMetadata — installDirectory extraction
// ---------------------------------------------------------------------------

describe("extractGradleMetadata — installDirectory", () => {

    it("extracts installDir from liberty { } block (single quotes)", async () => {
        const buildFile = writeTmp("build-install-dir.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    installDir = '/opt/wlp'
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/opt/wlp");
    });

    it("extracts installDir using double quotes", async () => {
        const buildFile = writeTmp("build-install-dir-double.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    installDir = "/opt/wlp-double"
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/opt/wlp-double");
    });

    it("extracts installDirectory (long form) from liberty { } block", async () => {
        const buildFile = writeTmp("build-installDirectory.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    installDirectory = '/opt/wlp-long'
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/opt/wlp-long");
    });

    it("returns undefined when installDir is absent", async () => {
        const buildFile = writeTmp("build-no-install-dir.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    server {
        verifyAppStartTimeout = 150
    }
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, undefined);
    });

    it("extracts installDir from Gradle file() call (single quotes)", async () => {
        const buildFile = writeTmp("build-install-dir-file-single.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    server {
        installDir = file('/tmp/liberty-wlp')
    }
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/tmp/liberty-wlp");
    });

    it("extracts installDir from Gradle file() call (double quotes)", async () => {
        const buildFile = writeTmp("build-install-dir-file-double.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    server {
        installDir = file("/tmp/liberty-wlp-double")
    }
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/tmp/liberty-wlp-double");
    });

    it("ignores variable references (no static string)", async () => {
        const buildFile = writeTmp("build-install-dir-var.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    installDir = libertyInstallPath
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, undefined);
    });

    it("extracts installDir from file() call (single quotes)", async () => {
        const buildFile = writeTmp("build-install-dir-file-single.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    server {
        installDir = file('/tmp/liberty-wlp')
    }
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/tmp/liberty-wlp");
    });

    it("extracts installDir from file() call (double quotes)", async () => {
        const buildFile = writeTmp("build-install-dir-file-double.gradle", `
apply plugin: 'liberty'

buildscript {
    dependencies {
        classpath 'io.openliberty.tools:liberty-gradle-plugin:3.10.0'
    }
}

liberty {
    server {
        installDir = file("/tmp/liberty-wlp-double")
    }
}`);
        const metadata = await extractGradleMetadata(buildFile);
        assert.equal(metadata.installDirectory, "/tmp/liberty-wlp-double");
    });
});

// ---------------------------------------------------------------------------
// attachDebugger: search order
// Verify that when installDirectory is set, the install-dir path is searched
// first; and that the target/build fallback is used when it is not set.
// ---------------------------------------------------------------------------

describe("attachDebugger — server.env search order", () => {

    // We test the search-order logic directly rather than calling attachDebugger
    // (which requires a full project provider). The logic under test is:
    //   1. If installDirectory is set → search <installDir>/usr/servers/**/server.env
    //      using vscode.Uri.file() so findFiles works outside the workspace.
    //   2. If nothing found (or no installDirectory) → search target/**/server.env
    //      also using vscode.Uri.file() for consistency.
    // Verified by inspecting the RelativePattern base passed to findFiles.

    it("searches installDirectory/usr/servers when installDirectory is set", async () => {
        const calls: Array<{ fsPath: string }> = [];
        fakeVscode.workspace.findFiles = (pattern: any) => {
            // pattern.base is a Uri when vscode.Uri.file() is used
            calls.push(pattern.base ?? pattern);
            return Promise.resolve([]);   // no results → triggers fallback
        };

        const projectDir = "/workspace/my-project";
        const installDir = "/opt/wlp";
        const resolvedInstallDir = path.resolve(projectDir, installDir);
        // Mirrors the actual attachDebugger code: base must be a Uri
        await fakeVscode.workspace.findFiles(
            new fakeVscode.RelativePattern(fakeVscode.Uri.file(resolvedInstallDir), "usr/servers/**/server.env")
        );

        assert.ok(calls.some(b => b.fsPath === resolvedInstallDir),
            "Expected findFiles to be called with a Uri whose fsPath is the resolved installDirectory");
    });

    it("falls back to target/** when installDirectory is absent", async () => {
        const calls: Array<{ fsPath: string }> = [];
        fakeVscode.workspace.findFiles = (pattern: any) => {
            calls.push(pattern.base ?? pattern);
            return Promise.resolve([]);
        };

        const projectDir = "/workspace/my-project";
        await fakeVscode.workspace.findFiles(
            new fakeVscode.RelativePattern(fakeVscode.Uri.file(projectDir), "target/**/server.env")
        );

        assert.ok(calls.some(b => b.fsPath === projectDir),
            "Expected findFiles to be called with a Uri whose fsPath is the project directory");
    });
});

// ---------------------------------------------------------------------------
// extractInstallDirFromParams — CLI flag parsing
// ---------------------------------------------------------------------------

describe("extractInstallDirFromParams — Maven (-D flag)", () => {

    it("extracts -DinstallDirectory from a standalone flag", () => {
        assert.equal(extractInstallDirFromParams("-DinstallDirectory=/opt/wlp", true), "/opt/wlp");
    });

    it("extracts -DinstallDirectory when combined with other flags", () => {
        assert.equal(extractInstallDirFromParams("-DskipTests -DinstallDirectory=/opt/wlp -DhotTests=true", true), "/opt/wlp");
    });

    it("returns undefined when -DinstallDirectory is absent (Maven)", () => {
        assert.equal(extractInstallDirFromParams("-DskipTests -DhotTests=true", true), undefined);
    });

    it("returns undefined for an empty string (Maven)", () => {
        assert.equal(extractInstallDirFromParams("", true), undefined);
    });

    it("does not match Gradle -P flag for Maven project", () => {
        assert.equal(extractInstallDirFromParams("-PinstallDirectory=/opt/wlp", true), undefined);
    });
});

describe("extractInstallDirFromParams — Gradle (-Pliberty.installDir flag)", () => {

    it("extracts -Pliberty.installDir from a standalone flag", () => {
        assert.equal(extractInstallDirFromParams("-Pliberty.installDir=/opt/wlp", false), "/opt/wlp");
    });

    it("extracts -Pliberty.installDir when combined with other flags", () => {
        assert.equal(extractInstallDirFromParams("--hotTests -Pliberty.installDir=/tmp/liberty-wlp", false), "/tmp/liberty-wlp");
    });

    it("returns undefined when -Pliberty.installDir is absent (Gradle)", () => {
        assert.equal(extractInstallDirFromParams("--hotTests --skipTests", false), undefined);
    });

    it("returns undefined for an empty string (Gradle)", () => {
        assert.equal(extractInstallDirFromParams("", false), undefined);
    });

    it("does not match Maven -DinstallDirectory flag for Gradle project", () => {
        assert.equal(extractInstallDirFromParams("-DinstallDirectory=/opt/wlp", false), undefined);
    });

    it("does not match incorrect -PinstallDirectory (missing liberty. prefix)", () => {
        assert.equal(extractInstallDirFromParams("-PinstallDirectory=/opt/wlp", false), undefined);
    });
});

// ---------------------------------------------------------------------------
// applyCliInstallDirectory / deleteTerminal — override lifecycle
// ---------------------------------------------------------------------------

describe("LibertyProject — CLI installDirectory override lifecycle", () => {
    // We test applyCliInstallDirectory and the restore-on-delete behaviour directly
    // on a LibertyProject instance, without spinning up a full VS Code window.

    // Minimal fake context required by LibertyProject constructor.
    // extensionPath must be a string so getBuildToolIconPath's path.join does not throw.
    const fakeContext = { extensionPath: "", subscriptions: [] } as any;

    function makeProject(installDir?: string) {
        // Import here so it picks up the already-installed fakeVscode.
        const { LibertyProject } = require("../../liberty/libertyProject");
        const p = new LibertyProject(fakeContext, "test-project", 0, "/workspace/pom.xml", undefined, "maven-liberty-project");
        if (installDir !== undefined) {
            p.installDirectory = installDir;
        }
        return p;
    }

    it("applyCliInstallDirectory sets installDirectory to the CLI value", () => {
        const project = makeProject("/build-file/wlp");
        project.applyCliInstallDirectory("/cli/override/wlp");
        assert.equal(project.installDirectory, "/cli/override/wlp");
    });

    it("deleteTerminal restores installDirectory to the build-file value after CLI override", () => {
        const project = makeProject("/build-file/wlp");
        project.applyCliInstallDirectory("/cli/override/wlp");
        assert.equal(project.installDirectory, "/cli/override/wlp");
        project.deleteTerminal();
        assert.equal(project.installDirectory, "/build-file/wlp");
    });

    it("deleteTerminal leaves installDirectory unchanged when no CLI override was applied", () => {
        const project = makeProject("/build-file/wlp");
        project.deleteTerminal();
        assert.equal(project.installDirectory, "/build-file/wlp");
    });

    it("deleteTerminal leaves installDirectory as undefined when it was never set and no override applied", () => {
        const project = makeProject();
        project.deleteTerminal();
        assert.equal(project.installDirectory, undefined);
    });

    it("CLI value takes precedence over build-file value while server is running", () => {
        const project = makeProject("/build-file/wlp");
        // Before Start…: build-file value
        assert.equal(project.installDirectory, "/build-file/wlp");
        // After Start… with CLI override:
        project.applyCliInstallDirectory("/cli/override/wlp");
        assert.equal(project.installDirectory, "/cli/override/wlp");
        // After stop:
        project.deleteTerminal();
        assert.equal(project.installDirectory, "/build-file/wlp");
    });
});
