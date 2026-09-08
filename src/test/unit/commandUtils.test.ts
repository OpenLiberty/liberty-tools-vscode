/*
 * Unit tests for Maven and Gradle command generation.
 *
 * Maven covers:
 *   1. Child under aggregator: artifactId passed → -pl :<artifactId> -am present
 *   2. Standalone project: no artifactId → -pl absent
 *   3. -pl :<artifactId> -am appears before -f "<pomPath>" (Maven requires this order)
 *
 * Gradle covers:
 *   4. Child under aggregator: projectName passed → task prefixed as :<projectName>:<task>
 *   5. Standalone project: no projectName → task used as-is
 *   6. Child command runs from parent directory, not child directory
 */

// This test runs in plain Node — install the vscode fake before any extension imports.
import { installFakeVscode } from "./fakeVscode";
installFakeVscode();

import { strict as assert } from "assert";
import { getCommandForMaven, getCommandForGradle } from "../../util/commandUtils";

const POM_PATH = "/workspace/my-parent/pom.xml";
const CHILD_ARTIFACT_ID = "child-module";
const COMMAND = "liberty:dev";

describe("getCommandForMaven — module selector (-pl / -am)", () => {
    it("includes -pl :<artifactId> -am when artifactId is provided", async () => {
        const cmd = await getCommandForMaven(POM_PATH, COMMAND, undefined, undefined, CHILD_ARTIFACT_ID);
        assert.ok(cmd.includes(`-pl :${CHILD_ARTIFACT_ID} -am`), `Expected -pl :${CHILD_ARTIFACT_ID} -am in: ${cmd}`);
    });

    it("omits -pl when no artifactId is provided", async () => {
        const cmd = await getCommandForMaven(POM_PATH, COMMAND);
        assert.ok(!cmd.includes("-pl"), `Expected no -pl in: ${cmd}`);
    });

    it("-pl :<artifactId> -am appears before -f in the command", async () => {
        const cmd = await getCommandForMaven(POM_PATH, COMMAND, undefined, undefined, CHILD_ARTIFACT_ID);
        const plIndex = cmd.indexOf(`-pl :${CHILD_ARTIFACT_ID} -am`);
        const fIndex = cmd.indexOf("-f ");
        assert.ok(plIndex !== -1, `-pl not found in: ${cmd}`);
        assert.ok(fIndex !== -1, `-f not found in: ${cmd}`);
        assert.ok(plIndex < fIndex, `-pl must appear before -f in: ${cmd}`);
    });
});

const PARENT_GRADLE_PATH = "/workspace/my-parent/build.gradle";
const CHILD_GRADLE_PATH = "/workspace/my-parent/sample-ear/build.gradle";
const GRADLE_PROJECT_NAME = "sample-ear";
const GRADLE_TASK = "libertyDev";

describe("getCommandForGradle — sub-project task selector (:<projectName>:<task>)", () => {
    it("prefixes task with :<projectName>: when projectName is provided", async () => {
        const cmd = await getCommandForGradle(PARENT_GRADLE_PATH, GRADLE_TASK, undefined, undefined, GRADLE_PROJECT_NAME);
        assert.ok(cmd.includes(`:${GRADLE_PROJECT_NAME}:${GRADLE_TASK}`), `Expected :${GRADLE_PROJECT_NAME}:${GRADLE_TASK} in: ${cmd}`);
    });

    it("uses task as-is when no projectName is provided", async () => {
        const cmd = await getCommandForGradle(CHILD_GRADLE_PATH, GRADLE_TASK);
        assert.ok(cmd.includes(GRADLE_TASK), `Expected ${GRADLE_TASK} in: ${cmd}`);
        assert.ok(!cmd.includes(`:${GRADLE_TASK}`), `Expected no colon-prefixed task in: ${cmd}`);
    });

    it("runs from parent directory when projectName is provided", async () => {
        const cmd = await getCommandForGradle(PARENT_GRADLE_PATH, GRADLE_TASK, undefined, undefined, GRADLE_PROJECT_NAME);
        assert.ok(cmd.includes("/workspace/my-parent"), `Expected parent dir in: ${cmd}`);
        assert.ok(!cmd.includes("/workspace/my-parent/sample-ear"), `Expected no child dir in: ${cmd}`);
    });
});
