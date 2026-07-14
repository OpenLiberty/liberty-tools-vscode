/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { EditorView, VSBrowser } from 'vscode-extension-tester';
import { runDevModeTestSuite } from "./shared/devModeTestSuite";
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as constants from './definitions/constants';
import * as path from 'path';
import { DashboardPage } from './pages/DashboardPage';

// Run shared dev mode tests
runDevModeTestSuite({
    buildTool: 'maven',
    getProjectPath: utils.getMvnProjectPath,
    projectConstant: constants.MAVEN_PROJECT,
    testRunString: constants.MAVEN_RUN_TESTS_STRING
});

// Maven-specific tests in their own describe block
describe('Maven-specific devmode action tests', () => {
    let dashboard: DashboardPage;

    before(async function() {
        this.timeout(30000);
        dashboard = new DashboardPage();
    });

    it('Start Maven with options from Liberty Tools', async () => {
        logger.testStart('Start Maven with options from Liberty Tools');
        try {
            const reportPath = path.join(utils.getMvnProjectPath(), "target", "site", "failsafe-report.html");
            const alternateReportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "failsafe.html");
            logger.info(`Primary report path: ${reportPath}`);
            logger.info(`Alternate report path: ${alternateReportPath}`);

            logger.step(1, 'Deleting existing test reports');
            let deleteReport = await utils.deleteReports(reportPath);
            let deleteAlternateReport = await utils.deleteReports(alternateReportPath);
            logger.info(`Primary report deletion result: ${deleteReport}`);
            logger.info(`Alternate report deletion result: ${deleteAlternateReport}`);
            expect(deleteReport && deleteAlternateReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with custom parameters');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom parameter: -DhotTests=true');
            await utils.setCustomParameter("-DhotTests=true");

            logger.step(4, 'Waiting for server to start with parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started with custom parameters');

                logger.step(5, 'Waiting for test report at primary or alternate location');
                const checkFile = await utils.waitForTestReport(reportPath, alternateReportPath);

                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Test report found');

                logger.step(6, 'Launching dashboard stop action');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

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
            logger.testComplete('Start Maven with options from Liberty Tools');
        } catch (error) {
            logger.testFailed('Start Maven with options from Liberty Tools', error);
            throw error;
        }
    }).timeout(350000);

    it('Start Maven with history from Liberty Tools', async () => {
        logger.testStart('Start Maven with history from Liberty Tools');
        try {
            const reportPath = path.join(utils.getMvnProjectPath(), "target", "site", "failsafe-report.html");
            const alternateReportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "failsafe.html");
            logger.info(`Primary report path: ${reportPath}`);
            logger.info(`Alternate report path: ${alternateReportPath}`);

            logger.step(1, 'Deleting existing test reports');
            let deleteReport = await utils.deleteReports(reportPath);
            let deleteAlternateReport = await utils.deleteReports(alternateReportPath);
            logger.info(`Primary report deletion result: ${deleteReport}`);
            logger.info(`Alternate report deletion result: ${deleteAlternateReport}`);
            expect(deleteReport && deleteAlternateReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with parameters');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Choosing command from history: -DhotTests=true');
            const foundCommand = await utils.chooseCmdFromHistory("-DhotTests=true");
            logger.info(`Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            logger.step(4, 'Waiting for server to start with historical parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in the terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started with historical parameters');

                logger.step(5, 'Waiting for test report at primary or alternate location');
                const checkFile = await utils.waitForTestReport(reportPath, alternateReportPath);

                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Test report found');

                logger.step(6, 'Launching dashboard stop action');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

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
            logger.testComplete('Start Maven with history from Liberty Tools');
        } catch (error) {
            logger.testFailed('Start Maven with history from Liberty Tools', error);
            throw error;
        }
    }).timeout(550000);

    it('View unit test report for Maven project', async () => {
        logger.testStart('View unit test report for Maven project');
        try {
            logger.step(1, 'Launching view unit test report dashboard action');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.UTR_DASHABOARD_ACTION, constants.UTR_DASHABOARD_MAC_ACTION);

            logger.step(2, 'Waiting for unit test report tab to open');
            const tabs = await utils.waitForEditorTab(constants.SUREFIRE_REPORT_TITLE);
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(3, `Checking if unit test report tab is open: ${constants.SUREFIRE_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.SUREFIRE_REPORT_TITLE) > -1;
            logger.info(`Unit test report found: ${reportFound}`);

            expect(reportFound, "Unit test report not found").to.equal(true);
            logger.stepSuccess(3, 'Unit test report tab is open');

            logger.step(4, 'Closing unit test report tab');
            const editorView = new EditorView();
            await editorView.closeEditor(constants.SUREFIRE_REPORT_TITLE);
            logger.stepSuccess(4, 'Unit test report tab closed');

            logger.testComplete('View unit test report for Maven project');
        } catch (error) {
            logger.testFailed('View unit test report for Maven project', error);
            throw error;
        }
    }).timeout(10000);

    it('View integration test report for Maven project', async () => {
        logger.testStart('View integration test report for Maven project');
        try {
            logger.step(1, 'Launching view integration test report dashboard action');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.ITR_DASHBOARD_ACTION, constants.ITR_DASHBOARD_MAC_ACTION);

            logger.step(2, 'Waiting for integration test report tab to open');
            const tabs = await utils.waitForEditorTab(constants.FAILSAFE_REPORT_TITLE);
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(3, `Checking if integration test report tab is open: ${constants.FAILSAFE_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.FAILSAFE_REPORT_TITLE) > -1;
            logger.info(`Integration test report found: ${reportFound}`);

            expect(reportFound, "Integration test report not found").to.equal(true);
            logger.stepSuccess(3, 'Integration test report tab is open');
            logger.testComplete('View integration test report for Maven project');
        } catch (error) {
            logger.testFailed('View integration test report for Maven project', error);
            throw error;
        }
    }).timeout(90000);

    /**
     * The following after hook closes the workspace so the next test file starts with a clean slate.
     */
    after(async function() {
        this.timeout(45000);
        await utils.closeWorkspace();
    });
});
