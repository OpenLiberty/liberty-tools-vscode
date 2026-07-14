/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { expect } from 'chai';
import { runDevModeTestSuite } from "./shared/devModeTestSuite";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { logger } from './utils/testLogger';
import path = require('path');
import { DashboardPage } from './pages/DashboardPage';

// Run shared dev mode tests with Gradle 9 configuration
runDevModeTestSuite({
    buildTool: 'gradle',
    getProjectPath: utils.getGradle9ProjectPath,
    projectConstant: constants.GRADLE_9_PROJECT,
    testRunString: constants.GRADLE_TEST_RUN_STRING
});

// Gradle 9-specific tests in their own describe block
describe('Gradle 9-specific devmode action tests', () => {
    let dashboard: DashboardPage;

    before(async function() {
        this.timeout(30000);
        dashboard = new DashboardPage();
    });

    it('Start Gradle with options from Liberty Tools', async () => {
        logger.testStart('Start Gradle with options from Liberty Tools');
        try {
            const reportPath = path.join(utils.getGradle9ProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(1, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with custom parameters');
            await dashboard.runAction(constants.GRADLE_9_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom parameter: --hotTests');
            await utils.setCustomParameter("--hotTests");

            logger.step(4, 'Waiting for server to start with parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started with custom parameters');

                logger.step(5, 'Waiting for test report');
                let checkFile = await utils.waitForTestReport(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Test report found');

                logger.step(6, 'Launching dashboard stop action');
                await dashboard.runAction(constants.GRADLE_9_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(7, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(7, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Gradle with options from Liberty Tools');
        } catch (error) {
            logger.testFailed('Start Gradle with options from Liberty Tools', error);
            throw error;
        }
    }).timeout(550000);

    it('Start Gradle with history from Liberty Tools', async () => {
        logger.testStart('Start Gradle with history from Liberty Tools');
        try {
            const reportPath = path.join(utils.getGradle9ProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(1, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with parameters');
            await dashboard.runAction(constants.GRADLE_9_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Choosing command from history: --hotTests');
            const foundCommand = await utils.chooseCmdFromHistory("--hotTests");
            logger.info(`Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            logger.step(4, 'Waiting for server to start with historical parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in the terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started with historical parameters');

                logger.step(5, 'Waiting for test report');
                let checkFile = await utils.waitForTestReport(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Test report found');

                logger.step(6, 'Launching dashboard stop action');
                await dashboard.runAction(constants.GRADLE_9_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(7, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in terminal');
                } else {
                    logger.stepSuccess(7, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Gradle with history from Liberty Tools');
        } catch (error) {
            logger.testFailed('Start Gradle with history from Liberty Tools', error);
            throw error;
        }
    }).timeout(350000);

    it('View test report for Gradle project', async () => {
        logger.testStart('View test report for Gradle project');

        if ((process.platform === 'darwin') || (process.platform === 'win32') || (process.platform == 'linux')) {
            logger.skip(`Test skipped for platform: ${process.platform} (enable once https://github.com/OpenLiberty/liberty-tools-vscode/issues/266 is resolved)`);
            return true;
        }

        try {
            logger.step(1, 'Launching view test report dashboard action');
            await dashboard.runAction(constants.GRADLE_9_PROJECT, constants.GRADLE_TR_DASHABOARD_ACTION, constants.GRADLE_TR_DASHABOARD_MAC_ACTION);

            logger.step(2, 'Waiting for test report tab to open');
            const tabs = await utils.waitForEditorTab(constants.GRADLE_9_TEST_REPORT_TITLE);
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(3, `Checking if Gradle test report tab is open: ${constants.GRADLE_9_TEST_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.GRADLE_9_TEST_REPORT_TITLE) > -1;
            logger.info(`Gradle test report found: ${reportFound}`);

            expect(reportFound, "Gradle test report not found").to.equal(true);
            logger.stepSuccess(3, 'Gradle test report tab is open');
            logger.testComplete('View test report for Gradle project');
        } catch (error) {
            logger.testFailed('View test report for Gradle project', error);
            throw error;
        }
    }).timeout(30000);

    // Based on the UI testing code, it sometimes selects the wrong command in "command palette", such as choosing "Liberty: Start ..." instead of "Liberty: Start" from the recent suggestions. This discrepancy occurs because we specifically need "Liberty: Start" at that moment.
    // Now, clear the command history of the "command palette" to avoid receiving "recently used" suggestions. This action should be performed at the end of Gradle 9 Project tests.
    it('Clear Command Palette', async () => {
        logger.testStart('Clear Command Palette');
        try {
            logger.step(1, 'Clearing command palette history');
            await utils.clearCommandPalette();
            logger.stepSuccess(1, 'Command palette history cleared');
            logger.testComplete('Clear Command Palette');
        } catch (error) {
            logger.testFailed('Clear Command Palette', error);
            throw error;
        }
    }).timeout(100000);

    /**
     * The following after hook closes the workspace and copies screenshots.
     * Closing the workspace ensures the next test file starts with a clean slate.
     */
    after(async function() {
        this.timeout(45000);
        await utils.closeWorkspace();
    });
});
