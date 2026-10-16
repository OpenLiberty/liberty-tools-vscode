/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 *
 * Unit tests for extractConfigDirectoryFromPom in mavenUtil.ts.
 * Plain mocha, no VS Code instance required.
 *
 * Scenarios tested:
 *   - configDirectory declared in <build><plugins>
 *   - configDirectory declared in <build><pluginManagement> (parent pom pattern)
 *   - configDirectory declared in a <profiles><profile><build><plugins> block
 *   - Liberty plugin present but no configDirectory → returns undefined
 *   - Liberty plugin absent entirely → returns undefined
 *   - Relative path returned as-is (caller is responsible for resolution)
 *   - Absolute path returned as-is
 */

import { strict as assert } from "assert";
import { extractConfigDirectoryFromPom } from "../../util/mavenUtil";

// ── helpers ───────────────────────────────────────────────────────────────────

function buildPluginsBlock(configDir: string | undefined): string {
    const configElement = configDir
        ? `          <configDirectory>${configDir}</configDirectory>`
        : "          <serverStartTimeout>120</serverStartTimeout>";
    return `
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.10.0</version>
        <configuration>
${configElement}
        </configuration>
      </plugin>
    </plugins>
  </build>`;
}

function buildPluginManagementBlock(configDir: string): string {
    return `
  <build>
    <pluginManagement>
      <plugins>
        <plugin>
          <groupId>io.openliberty.tools</groupId>
          <artifactId>liberty-maven-plugin</artifactId>
          <version>3.10.0</version>
          <configuration>
            <configDirectory>${configDir}</configDirectory>
          </configuration>
        </plugin>
      </plugins>
    </pluginManagement>
  </build>`;
}

function buildProfileBlock(configDir: string): string {
    return `
  <profiles>
    <profile>
      <id>liberty-profile</id>
      <build>
        <plugins>
          <plugin>
            <groupId>io.openliberty.tools</groupId>
            <artifactId>liberty-maven-plugin</artifactId>
            <version>3.10.0</version>
            <configuration>
              <configDirectory>${configDir}</configDirectory>
            </configuration>
          </plugin>
        </plugins>
      </build>
    </profile>
  </profiles>`;
}

function wrapProject(inner: string): string {
    return `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0</version>
${inner}
</project>`;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("extractConfigDirectoryFromPom", () => {

    // ── <build><plugins> ──────────────────────────────────────────────────────

    it("returns configDirectory when declared in <build><plugins>", () => {
        const xml = wrapProject(buildPluginsBlock("src/main/liberty/custom-config"));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "src/main/liberty/custom-config");
    });

    it("returns an absolute path as-is when declared in <build><plugins>", () => {
        const absolutePath = "/opt/app/liberty-config";
        const xml = wrapProject(buildPluginsBlock(absolutePath));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, absolutePath);
    });

    it("returns a relative path as-is (resolution is the caller's responsibility)", () => {
        const xml = wrapProject(buildPluginsBlock("liberty"));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "liberty");
    });

    // ── <build><pluginManagement> ─────────────────────────────────────────────

    it("returns configDirectory when declared in <build><pluginManagement>", () => {
        const xml = wrapProject(buildPluginManagementBlock("src/liberty/config"));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "src/liberty/config");
    });

    it("prefers <build><plugins> over <build><pluginManagement> when both are present", () => {
        const both = buildPluginsBlock("plugins-dir") + buildPluginManagementBlock("pluginmgmt-dir");
        const xml = wrapProject(both);
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "plugins-dir");
    });

    // ── <profiles> ────────────────────────────────────────────────────────────

    it("returns configDirectory when declared inside a <profiles><profile><build><plugins> block", () => {
        const xml = wrapProject(buildProfileBlock("profile-config"));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "profile-config");
    });

    it("returns configDirectory from <build><plugins> and ignores a profile that also declares one", () => {
        const combined = buildPluginsBlock("main-config") + buildProfileBlock("profile-config");
        const xml = wrapProject(combined);
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "main-config");
    });

    // ── Liberty plugin present, no configDirectory ────────────────────────────

    it("returns undefined when the Liberty plugin is present but has no configDirectory", () => {
        const xml = wrapProject(buildPluginsBlock(undefined));
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, undefined);
    });

    it("returns undefined when the Liberty plugin has an empty <configuration> block", () => {
        const xml = wrapProject(`
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.10.0</version>
        <configuration/>
      </plugin>
    </plugins>
  </build>`);
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, undefined);
    });

    // ── Liberty plugin absent ─────────────────────────────────────────────────

    it("returns undefined when no Liberty plugin is present at all", () => {
        const xml = wrapProject(`
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.11.0</version>
      </plugin>
    </plugins>
  </build>`);
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, undefined);
    });

    it("returns undefined for a pom with no <build> section", () => {
        const xml = wrapProject("");
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, undefined);
    });

    // ── Edge / error cases ────────────────────────────────────────────────────

    it("returns undefined for invalid (non-XML) input", () => {
        const result = extractConfigDirectoryFromPom("this is not xml at all");
        assert.equal(result, undefined);
    });

    it("returns undefined for an empty string", () => {
        const result = extractConfigDirectoryFromPom("");
        assert.equal(result, undefined);
    });

    it("trims whitespace from the configDirectory value", () => {
        const xml = wrapProject(`
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <configuration>
          <configDirectory>  my-config-dir  </configDirectory>
        </configuration>
      </plugin>
    </plugins>
  </build>`);
        const result = extractConfigDirectoryFromPom(xml);
        assert.equal(result, "my-config-dir");
    });
});
