/*
 * Unit tests for Maven multi-module discovery.
 * Plain mocha + chai, no VS Code instance required.
 *
 * Variables:
 *   PL = Parent is Liberty enabled
 *   CL = Child is Liberty enabled
 *   PM = Parent -> Child: Parent lists child in <modules>
 *   CP = Parent <- Child: Child declares <parent>
 *
 *  Group | PL | CL | PM | CP | Expected
 * -------|----|----|----|----|-----------------------------------------
 *    1   |  Y |  Y |  Y |  Y | Parent aggregator, child actionable
 *    2   |  Y |  N |  Y |  Y | Parent aggregator, child inherits Liberty
 *    3   |  N |  Y |  Y |  Y | Parent display-only aggregator, child actionable
 *    4   |  N |  N |  Y |  Y | Both excluded (no Liberty anywhere)
 *    5   |  Y |  N |  Y |  N | No link. Parent standalone, child excluded
 *    6   |  N |  Y |  N |  Y | No link. Child standalone, parent excluded
 *
 */
import { strict as assert } from "assert";
import { validParentPom, validPom, collectChildParentArtifactIds } from "../../util/mavenUtil";
import { LIBERTY_PROJECT_MAVEN } from "../../definitions/constants";

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeParentPom(hasLiberty: boolean, hasModules: boolean): string {
  const libertyPlugin = hasLiberty ? `
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.0</version>
      </plugin>
    </plugins>
  </build>` : "";
  const modules = hasModules ? `
  <modules>
    <module>child-module</module>
  </modules>` : "";
  return `<project>
  <artifactId>my-parent</artifactId>
  <packaging>pom</packaging>${modules}${libertyPlugin}
</project>`;
}

function makeChildPom(hasLiberty: boolean, hasParentRef: boolean): string {
  const libertyPlugin = hasLiberty ? `
  <build>
    <plugins>
      <plugin>
        <groupId>io.openliberty.tools</groupId>
        <artifactId>liberty-maven-plugin</artifactId>
        <version>3.0</version>
      </plugin>
    </plugins>
  </build>` : "";
  const parentRef = hasParentRef ? `
  <parent>
    <artifactId>my-parent</artifactId>
  </parent>` : "";
  return `<project>
  <artifactId>child-module</artifactId>${parentRef}${libertyPlugin}
</project>`;
}

// childrenMap used by validPom — maps parentArtifactId -> [module names]
const CHILDREN_MAP_WITH_CHILD = new Map([["my-parent", ["child-module"]]]);
const EMPTY_CHILDREN_MAP = new Map<string, string[]>();

// ── Group 1: Bidirectional + both Liberty (row 1) ─────────────────────────────
// Parent aggregator, child actionable

describe("row 1 — bidirectional, both have Liberty", () => {
  const parentXml = makeParentPom(true, true);
  const childXml = makeChildPom(true, true);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects child's parent reference", () => {
    assert.ok(childParentArtifactIds.has("my-parent"));
  });

  it("parent is valid aggregator", () => {
    const result = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });

  it("child is valid Liberty project", () => {
    const result = validPom(childXml, CHILDREN_MAP_WITH_CHILD);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });
});

// ── Group 2: Bidirectional + parent Liberty only (row 5) ──────────────────────
// Parent aggregator, child inherits Liberty from parent via linkProjects

describe("row 5 — bidirectional, parent has Liberty, child does not", () => {
  const parentXml = makeParentPom(true, true);
  const childXml = makeChildPom(false, true);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects child's parent reference", () => {
    assert.ok(childParentArtifactIds.has("my-parent"));
  });

  it("parent is valid aggregator", () => {
    const result = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });

  it("child is valid via childrenMap (Liberty inherited from parent during linking)", () => {
    const result = validPom(childXml, CHILDREN_MAP_WITH_CHILD);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });
});

// ── Group 3: Bidirectional + child Liberty only (row 9) ───────────────────────
// Parent display-only aggregator, child actionable — NEW behavior

describe("row 9 — bidirectional, child has Liberty, parent does not", () => {
  const parentXml = makeParentPom(false, true);
  const childXml = makeChildPom(true, true);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects child's parent reference", () => {
    assert.ok(childParentArtifactIds.has("my-parent"));
  });

  it("parent is valid aggregator despite no Liberty plugin", () => {
    const result = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });

  it("child is valid Liberty project", () => {
    const result = validPom(childXml, CHILDREN_MAP_WITH_CHILD);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });
});

// ── Group 4: Bidirectional + no Liberty (row 13) ─────────────────────────────
// Both structurally linked but no Liberty anywhere — both excluded via hasLibertyDescendants

describe("row 13 — bidirectional, neither has Liberty", () => {
  const parentXml = makeParentPom(false, true);
  const childXml = makeChildPom(false, true);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects child's parent reference", () => {
    assert.ok(childParentArtifactIds.has("my-parent"));
  });

  it("parent passes structural check but has no Liberty descendants — excluded by hasLibertyDescendants in linkProjects", () => {
    const parentResult = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(parentResult.isValidBuildFile(), true); // structurally valid
    const childResult = validPom(childXml, CHILDREN_MAP_WITH_CHILD);
    assert.equal(childResult.isValidBuildFile(), true);  // structurally valid
    // both isLibertyEnabled=false → hasLibertyDescendants=false → filtered from rootProjects
  });
});

// ── Group 5: One-directional, parent has Liberty, child <parent> missing (row 6) ─
// Parent standalone (aggregator, no actions), child excluded

describe("row 6 — parent has Liberty + <modules>, child has no <parent> ref", () => {
  const parentXml = makeParentPom(true, true);
  const childXml = makeChildPom(false, false);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects no parent references — link is broken", () => {
    assert.equal(childParentArtifactIds.size, 0);
  });

  it("parent is valid via Liberty plugin (existing path, no bidirectional check needed)", () => {
    const result = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(result.isValidBuildFile(), true);
    assert.equal(result.getProjectType(), LIBERTY_PROJECT_MAVEN);
  });

  it("child is invalid — no Liberty, not in childrenMap", () => {
    const result = validPom(childXml, EMPTY_CHILDREN_MAP);
    assert.equal(result.isValidBuildFile(), false);
  });
});

// ── Group 6: One-directional, child has Liberty, parent <modules> missing (row 11) ─
// Child standalone, parent excluded

describe("row 11 — child has Liberty + <parent>, parent has no <modules>", () => {
  const parentXml = makeParentPom(false, false);
  const childXml = makeChildPom(true, true);
  const childParentArtifactIds = collectChildParentArtifactIds([{ xmlString: childXml }]);

  it("pass 1 collects child's parent reference", () => {
    assert.ok(childParentArtifactIds.has("my-parent"));
  });

  it("parent is invalid — no Liberty, no <modules> to satisfy bidirectional check", () => {
    const result = validParentPom(parentXml, childParentArtifactIds);
    assert.equal(result.isValidBuildFile(), false);
  });

  it("child is valid standalone Liberty project", () => {
    const result = validPom(childXml, EMPTY_CHILDREN_MAP);
    assert.equal(result.isValidBuildFile(), true);
  });
});
