import { VSBrowser, DefaultTreeItem, Workbench, InputBox, Notification } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as path from 'path';
import { DashboardPage } from './pages/DashboardPage';
import { expect } from 'chai';
import * as constants from './definitions/constants';
const { execSync } = require('child_process');

/** Specifies the expected information for a project in the dashboard */
interface ToolConfig {

    /** The name of the project displayed in the dashboard; this may also be called `projectConstant` */
    nameOfProject: string;

    /** The file used to identify whether this project is a maven project or a gradle project */
    identifyingFile: "build.gradle" | "pom.xml";
}

describe("Liberty Tools Dashboard Refresh", () => {
    let dashboard!: DashboardPage;

    before(async function() {
        this.timeout(60000);

        // Open workspace
        await VSBrowser.instance.openResources(utils.getGradleProjectPath(), utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        dashboard = new DashboardPage();
    });

    afterEach(async function() {
        // Take screenshot on failure but don't close editor
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
            return;
        }

        // Remove all unstaged changes & untracked files that test created
        logger.info("Cleaning up projects...");
        for (const projectPath of [utils.getGradleProjectPath(), utils.getMvnProjectPath()]) {
            execSync("git checkout -- . && git clean -fdx", {
                cwd: projectPath,
                env: process.env,
                stdio: "inherit"
            });
        }
   });

    /**
     * The following after hook closes the workspace and copies screenshots.
     * Closing the workspace ensures the next test file starts with a clean slate.
     */
    after(async function() {
        this.timeout(45000);
        await utils.closeWorkspace();
    });

    it("Liberty Language Server should initialize", async function () {
        logger.testStart("Liberty Language Server should initialize");
        await utils.waitForLanguageServerInit(
            "Language Support for Liberty",
            "Initialized Liberty Language server",
        );

        logger.testComplete("Liberty Language Server initialized successfully");
    }).timeout(utils.seconds(60));

    it("Find Liberty Tools in sidebar", async () => {
        logger.testStart("Find Liberty Tools in sidebar");

        try {
            logger.step(1, "Attempting to get Liberty Tools section");
            const section = await dashboard.getSection(); 
            logger.stepSuccess(1, "Found Liberty Tools section");

            logger.step(2, "Validating sidebar is not undefined");
            expect(section).not.undefined;
            logger.testComplete("Find Liberty Tools in sidebar");
        } catch (error) {
            logger.testFailed("Find Liberty Tools in sidebar", error);
            throw error;
        }
    }).timeout(utils.seconds(60));

    // Test that correct tooltips are shown before any changes
    it("Liberty Tools shows correct tooltips for projects", async () => {
        logger.testStart("Liberty Tools shows correct tooltips for projects");
        try {
            const toolConfigsStandard: ToolConfig[] = [
                {  // Maven project should have pom.xml
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml"
                },
                {  // Gradle project should have build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle"
                }
            ];

            await verifyDashboardIsCorrect(1, toolConfigsStandard);

            logger.testComplete("Liberty Tools shows correct tooltips for projects");
        } catch (error) {
            logger.testFailed("Liberty Tools shows correct tooltips for projects", error);
            throw error;
        }
    }).timeout(utils.seconds(275));

    // Test that dashboard refreshes automatically when projects added to workspace
    it("Liberty Tools shows correct tooltips after project added to workspace", async () => {
        logger.testStart("Liberty Tools shows correct tooltips after project added to workspace");
        try {
            logger.step(1, "Open gradle-9 folder");
            await utils.closeWorkspace();
            await VSBrowser.instance.openResources(utils.getGradleProjectPath(), utils.getMvnProjectPath(), utils.getGradle9ProjectPath());
            await VSBrowser.instance.waitForWorkbench();
            logger.stepSuccess(1, "Opened gradle-9 folder");

            const toolConfigsWithThreeProjects: ToolConfig[] = [
                {  // Maven unchanged
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                },
                {  // Gradle unchanged
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // newly added gradle-9 project
                    nameOfProject: constants.GRADLE_9_PROJECT,
                    identifyingFile: "build.gradle",
                }
            ];

            let step = await verifyDashboardIsCorrect(2, toolConfigsWithThreeProjects);

            logger.step(step, "Close gradle-9 folder and re-open just gradle & maven");
            await utils.closeWorkspace();
            await VSBrowser.instance.openResources(utils.getGradleProjectPath(), utils.getMvnProjectPath());
            await VSBrowser.instance.waitForWorkbench();
            logger.stepSuccess(step, "Closed gradle-9 folder and re-opened only gradle, maven");
            step++;

            const toolConfigsStandard: ToolConfig[] = [
                {  // Maven unchanged
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                },
                {  // Gradle unchanged
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                }
            ];

            await verifyDashboardIsCorrect(step, toolConfigsStandard);

            logger.testComplete("Liberty Tools shows correct tooltips after project added to workspace");
        } catch (error) {
            logger.testFailed("Liberty Tools shows correct tooltips after project added to workspace", error);
            throw error;
        }
    }).timeout(utils.seconds(275));

    // Test that dashboard refreshes when project type changes
    it("Liberty Tools shows correct tooltips after change maven project to gradle project", async () => {
        logger.testStart("Liberty Tools shows correct tooltips after change maven project to gradle project");
        try {
            logger.step(1, "Copy build.gradle to maven project");
            execSync("cp build.gradle ../../maven/liberty-maven-test-wrapper-app/", {
                cwd: utils.getGradleProjectPath(),
                env: process.env,
                stdio: "inherit"
            });
            logger.stepSuccess(1, "File copied");

            logger.step(2, "Remove pom.xml");
            execSync("rm pom.xml", {
                cwd: utils.getMvnProjectPath(),
                env: process.env,
                stdio: "inherit"
            });
            logger.stepSuccess(2, "File removed");

            const toolConfigsSwitched: ToolConfig[] = [
                {  // Maven changed from pom.xml to build.gradle
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // Gradle unchanged, still build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                }
            ];

            await verifyDashboardIsCorrect(3, toolConfigsSwitched);

            logger.testComplete("Liberty Tools shows correct tooltips after change maven project to gradle project");
        } catch (error) {
            logger.testFailed("Liberty Tools shows correct tooltips after change maven project to gradle project", error);
            throw error;
        }
    }).timeout(utils.seconds(275));
    
    const NEW_PROJECT_NAME = "newProject";
    // Test that dashboard refreshes when project manually added & removed
    it("Liberty Tools shows correct tooltips after manually adding & removing new project", async () => {
        logger.testStart("Liberty Tools shows correct tooltips after create new project");
        try {
            logger.step(1, "Create new gradle project: newProject");
            createNewGradleProject();
            logger.stepSuccess(1, "Project created");

            // Wait so liberty tools can find the new project
            await utils.getWaitHelper().sleep(utils.seconds(5));

            logger.step(2, "Add new project to dashboard");
            await new Workbench().executeCommand("liberty.dev.add.project");
            const addProjectInput: InputBox = await InputBox.create();
            await addProjectInput.confirm();
            logger.stepSuccess(2, "Added new project");

            const toolConfigsWithNewProject: ToolConfig[] = [
                {  // Gradle unchanged, still build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // Maven not changed this test
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                },
                {  // New project
                    nameOfProject: NEW_PROJECT_NAME,
                    identifyingFile: "build.gradle"
                }
            ];

            let step = await verifyDashboardIsCorrect(3, toolConfigsWithNewProject);

            logger.step(step, "Execute remove project command");
            await new Workbench().executeCommand("liberty.dev.remove.project");
            const removeProjectInput: InputBox = await InputBox.create();
            await removeProjectInput.confirm();
            logger.stepSuccess(step, "Executed remove project command");
            step++;

            logger.step(step, "Confirm removal via notification");
            const allNotifications: Notification[] = await new Workbench().getNotifications();
            let removeProjectNotification: Notification | undefined;
            for (const noti of allNotifications) {
                if ((await noti.getText()).includes("Are you sure you want to remove the project")) {
                    removeProjectNotification = noti;
                    break;
                }
            }
            expect(removeProjectNotification).not.undefined;
            await removeProjectNotification?.takeAction("Yes");
            logger.stepSuccess(step, "Removed project");
            step++;

            const toolConfigsAfterNewProjectRemoval: ToolConfig[] = [
                {  // Gradle unchanged, still build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // Maven not changed this test
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                }
            ];

            await verifyDashboardIsCorrect(step, toolConfigsAfterNewProjectRemoval);

            logger.testComplete("Liberty Tools shows correct tooltips after create new project");
        } catch (error) {
            logger.testFailed("Liberty Tools shows correct tooltips after create new project", error);
            throw error;
        }
    }).timeout(utils.seconds(275));

    // Test that dashboard refresh button works
    it("Liberty Tools shows correct tooltips after manually adding new project then refreshing", async () => {
        logger.testStart("Liberty Tools shows correct tooltips after manually adding new project then refreshing");
        try {
            logger.step(1, "Create new gradle project: newProject");
            createNewGradleProject();
            logger.stepSuccess(1, "Project created");

            // Wait so liberty tools can find the new project
            await utils.getWaitHelper().sleep(utils.seconds(5));

            logger.step(2, "Add new project to dashboard");
            await new Workbench().executeCommand("liberty.dev.add.project");
            const addProjectInput: InputBox = await InputBox.create();
            await addProjectInput.confirm();
            logger.stepSuccess(2, "Added new project");

            const toolConfigsWithNewProject: ToolConfig[] = [
                {  // Gradle unchanged, still build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // Maven not changed this test
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                },
                {  // New project
                    nameOfProject: NEW_PROJECT_NAME,
                    identifyingFile: "build.gradle"
                }
            ];

            let step = await verifyDashboardIsCorrect(3, toolConfigsWithNewProject);

            logger.step(step, "Remove newProject directory");
            execSync("rm -rf newProject", {
                cwd: utils.getGradleProjectPath(),
                env: process.env,
                stdio: "inherit"
            });
            logger.stepSuccess(step, "Removed directory");
            step++;

            // Confirm that even after directory removed, dashboard has not refreshed
            step = await verifyDashboardIsCorrect(step, toolConfigsWithNewProject);

            logger.step(step, "Clicking refresh projects button");
            await dashboard.clickActionButton("Refresh projects");
            logger.stepSuccess(step, "Projects refreshed");
            step++;

            const toolConfigsAfterRefresh: ToolConfig[] = [
                {  // Gradle unchanged, still build.gradle
                    nameOfProject: constants.GRADLE_PROJECT,
                    identifyingFile: "build.gradle",
                },
                {  // Maven not changed this test
                    nameOfProject: constants.MAVEN_PROJECT,
                    identifyingFile: "pom.xml",
                }
            ];

            await verifyDashboardIsCorrect(step, toolConfigsAfterRefresh);

            logger.testComplete("Liberty Tools shows correct tooltips after manually adding new project then refreshing");
        } catch (error) {
            logger.testFailed("Liberty Tools shows correct tooltips after manually adding new project then refreshing", error);
            throw error;
        }
    }).timeout(utils.seconds(275));

    /** Creates a project called newProject containing a build.gradle file. */
    function createNewGradleProject() {
        execSync(`mkdir ${NEW_PROJECT_NAME} && touch ${NEW_PROJECT_NAME}/build.gradle`, {
            cwd: utils.getGradleProjectPath(),
            env: process.env,
            stdio: "inherit"
        });
    }

    /**
     * Verifies that the dashboard displays the expected projects with correct tooltips.
     * @returns The next step number after all verification steps have completed.
     */
    async function verifyDashboardIsCorrect(stepToStartAt: number, toolConfigs: ToolConfig[]): Promise<number> {
        let step: number = stepToStartAt;

        logger.step(step, "Getting dashboard section");
        const section = await dashboard.getSection();
        logger.stepSuccess(step, "Dashboard section retrieved");
        step++;

        logger.step(step, "Waiting for Liberty Tools to load");
        await utils.waitForDashboardToLoad(section);
        logger.stepSuccess(step, "Liberty Tools loaded successfully");
        step++;

        logger.step(step, "Getting visible items from section");
        const menu = await utils.waitForCondition(async () => {
            const items = await section.getVisibleItems();
            if (items && items.length > 0) {
                return items;
            }
            return;
        }, 60);
        logger.info(`Found ${menu.length} visible items in dashboard`);
        expect(menu.length).to.equal(toolConfigs.length);
        logger.stepSuccess(step, "Getting visible items from section");
        step++;

        for (const toolConfig of toolConfigs) {
            const { nameOfProject, identifyingFile } = toolConfig;
            const buildToolForLogs: string = (identifyingFile === "pom.xml") ? "maven" : "gradle";

            logger.step(step, `Finding project item: ${nameOfProject} [${buildToolForLogs}]`);
            const item: DefaultTreeItem = await dashboard.getProjectItem(nameOfProject);
            expect(item).not.undefined;
            logger.stepSuccess(step, `${nameOfProject} project item found`);
            step++;

            logger.step(step, `Check that for ${nameOfProject}, tooltip shows "${identifyingFile}"`);
            const tooltipText: string = await item.getTooltip();
            expect(path.basename(tooltipText)).to.equal(identifyingFile)
            logger.stepSuccess(step, `Tooltip confirmed: ${identifyingFile}`);
            step++;
        }

        return step;
    }
});
