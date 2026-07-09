/*
 * Unit tests for Maven command generation — -pl / -am module selector behavior.
 *
 * Covers:
 *   1. Child under aggregator: artifactId passed → -pl :<artifactId> -am present
 *   2. Standalone project: no artifactId → -pl absent
 *   3. -pl :<artifactId> -am appears before -f "<pomPath>" (Maven requires this order)
 */
import { strict as assert } from "assert";
import { getCommandForMaven } from "../../util/commandUtils";

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
