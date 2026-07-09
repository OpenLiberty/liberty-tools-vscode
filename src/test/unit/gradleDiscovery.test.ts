/*
 * Unit tests for Gradle multi-module discovery.
 * Plain mocha + chai, no VS Code instance required.
 *
 * Gradle multi-module relationship is one-directional:
 *   - Root declares subprojects via settings.gradle include()
 *   - Children do NOT declare a parent reference
 *   - No two-pass strategy needed — settings.gradle is single source of truth
 *
 * Variables:
 *   RL = Root has Liberty plugin in build.gradle
 *   CL = Child has Liberty plugin in build.gradle
 *   SI = settings.gradle includes the child
 *
 *  Group | RL | CL | SI | Expected
 * -------|----|----|----|-----------------------------------------
 *   1    |  N |  Y |  Y | Root display-only aggregator, child actionable
 *   2    |  Y |  Y |  Y | Root aggregator, child actionable
 *   3    |  N |  N |  Y | Both excluded (no Liberty anywhere)
 *   4    |  N |  Y |  N | Child standalone, root excluded
 *
 * Reference test project: ~/test/multi-module-test-projects/bob-nested-gradle-ears
 *   - Root build.gradle has no Liberty plugin
 *   - app-one-ear/build.gradle and app-two-ear/build.gradle declare Liberty directly
 *   - settings.gradle includes all subprojects via colon-separated paths
 */
import { strict as assert } from "assert";
import { detectLibertyPluginFromText, findChildGradleProjects, hasGradleSubprojects } from "../../util/gradleUtil";
import { LIBERTY_PROJECT_GRADLE } from "../../definitions/constants";

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeRootBuildGradle(hasLiberty: boolean): string {
    return hasLiberty
        ? `plugins {
    id("io.openliberty.tools.gradle.Liberty") version "3.0"
}`
        : `plugins {
    id 'base'
}`;
}

function makeChildBuildGradle(hasLiberty: boolean): string {
    return hasLiberty
        ? `plugins {
    id 'java'
    id("io.openliberty.tools.gradle.Liberty") version "3.0"
}`
        : `plugins {
    id 'java'
}`;
}

function makeSettingsGradle(includeChild: boolean): any {
    // Simulate parsed settings.gradle as g2js would return
    return includeChild
        ? { "rootProject.name": "my-root", include: ["child-module"] }
        : { "rootProject.name": "my-root" };
}

// ── Group 1: Root no Liberty, child has Liberty, settings includes child ───────
// Root display-only aggregator, child actionable

describe("gradle group 1 — root no Liberty, child has Liberty, included in settings", () => {
    const rootContent = makeRootBuildGradle(false);
    const childContent = makeChildBuildGradle(true);
    const parsedSettings = makeSettingsGradle(true);

    it("root is not detected as Liberty project via text", () => {
        const result = detectLibertyPluginFromText(rootContent);
        assert.equal(result, null);
    });

    it("root is detected as aggregator via settings.gradle include", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.ok(result.getChildren().length > 0);
    });

    it("child is detected as Liberty project via text", () => {
        const result = detectLibertyPluginFromText(childContent);
        assert.notEqual(result, null);
        assert.equal(result!.getProjectType(), LIBERTY_PROJECT_GRADLE);
    });
});

// ── Group 2: Both root and child have Liberty, settings includes child ─────────
// Root aggregator, child actionable

describe("gradle group 2 — both have Liberty, included in settings", () => {
    const rootContent = makeRootBuildGradle(true);
    const childContent = makeChildBuildGradle(true);
    const parsedSettings = makeSettingsGradle(true);

    it("root is detected as Liberty project via text", () => {
        const result = detectLibertyPluginFromText(rootContent);
        assert.notEqual(result, null);
        assert.equal(result!.getProjectType(), LIBERTY_PROJECT_GRADLE);
    });

    it("root is also detected as aggregator via settings.gradle include", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.ok(result.getChildren().length > 0);
    });

    it("child is detected as Liberty project via text", () => {
        const result = detectLibertyPluginFromText(childContent);
        assert.notEqual(result, null);
        assert.equal(result!.getProjectType(), LIBERTY_PROJECT_GRADLE);
    });
});

// ── Group 3: Neither has Liberty, settings includes child ─────────────────────
// Both excluded — no Liberty anywhere

describe("gradle group 3 — no Liberty anywhere, included in settings", () => {
    const rootContent = makeRootBuildGradle(false);
    const childContent = makeChildBuildGradle(false);
    const parsedSettings = makeSettingsGradle(true);

    it("root not detected as Liberty project", () => {
        assert.equal(detectLibertyPluginFromText(rootContent), null);
    });

    it("child not detected as Liberty project", () => {
        assert.equal(detectLibertyPluginFromText(childContent), null);
    });

    it("root still detected as aggregator structurally — excluded later by hasLibertyDescendants", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.ok(result.getChildren().length > 0);
    });
});

// ── Group 4: Child has Liberty, not included in settings ──────────────────────
// Child standalone, root excluded

describe("gradle group 4 — child has Liberty, not in settings", () => {
    const rootContent = makeRootBuildGradle(false);
    const childContent = makeChildBuildGradle(true);
    const parsedSettings = makeSettingsGradle(false);

    it("root not detected as Liberty project", () => {
        assert.equal(detectLibertyPluginFromText(rootContent), null);
    });

    it("root has no children in settings — not an aggregator", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.equal(result.getChildren().length, 0);
    });

    it("child is detected as standalone Liberty project", () => {
        const result = detectLibertyPluginFromText(childContent);
        assert.notEqual(result, null);
        assert.equal(result!.getProjectType(), LIBERTY_PROJECT_GRADLE);
    });
});

// ── Colon-path resolution ─────────────────────────────────────────────────────
// settings.gradle include 'application-one:app-one-ear' style paths

describe("gradle colon-path subproject inclusion", () => {
    const parsedSettings = {
        "rootProject.name": "bob-nested-gradle-ears",
        include: [
            "application-one:app-one-ear",
            "application-one:app-one-ejb",
            "application-two:app-two-ear",
        ],
    };

    it("findChildGradleProjects returns all colon-path children", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        const children = result.getChildren();
        assert.ok(children.includes("application-one:app-one-ear"));
        assert.ok(children.includes("application-one:app-one-ejb"));
        assert.ok(children.includes("application-two:app-two-ear"));
    });

    it("colon paths cover all three ear subprojects from bob-nested-gradle-ears", () => {
        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.equal(result.getChildren().length, 3);
    });
});

// ── hasGradleSubprojects — phase 2 guard fix ──────────────────────────────────
// The bug: phase 2 skips no-Liberty roots because parsedBuild/regexBuildFile
// are null. hasGradleSubprojects() lets discovery check settings.gradle
// independently of whether the root has Liberty, so findChildGradleProjects
// is called for no-Liberty aggregators like bob-nested-gradle-ears.

describe("hasGradleSubprojects — detects aggregator from settings alone", () => {
    it("returns true when parsedSettings has include entries", () => {
        const parsedSettings = { "rootProject.name": "my-root", include: ["app-one-ear", "app-two-ear"] };
        assert.equal(hasGradleSubprojects(parsedSettings), true);
    });

    it("returns false when parsedSettings has no include entries", () => {
        const parsedSettings = { "rootProject.name": "my-root" };
        assert.equal(hasGradleSubprojects(parsedSettings), false);
    });

    it("returns false when parsedSettings is null", () => {
        assert.equal(hasGradleSubprojects(null), false);
    });

    it("returns false when parsedSettings is undefined", () => {
        assert.equal(hasGradleSubprojects(undefined), false);
    });

    it("returns true for colon-path includes (bob-nested-gradle-ears pattern)", () => {
        const parsedSettings = {
            "rootProject.name": "bob-nested-gradle-ears",
            include: [
                "application-one:app-one-ear",
                "application-one:app-one-ejb",
                "application-two:app-two-ear",
            ],
        };
        assert.equal(hasGradleSubprojects(parsedSettings), true);
    });

    it("no-Liberty root + subprojects → findChildGradleProjects returns valid aggregator", () => {
        const parsedSettings = {
            "rootProject.name": "bob-nested-gradle-ears",
            include: ["application-one:app-one-ear", "application-two:app-two-ear"],
        };
        // Simulate what phase 2 should do: check hasGradleSubprojects first,
        // then call findChildGradleProjects with empty parsedBuild for no-Liberty root
        const isAggregator = hasGradleSubprojects(parsedSettings);
        assert.equal(isAggregator, true);

        const result = findChildGradleProjects({}, parsedSettings, "/workspace/build.gradle");
        assert.equal(result.isValidBuildFile(), true);
        assert.ok(result.getChildren().includes("application-one:app-one-ear"));
        assert.ok(result.getChildren().includes("application-two:app-two-ear"));
    });
});
