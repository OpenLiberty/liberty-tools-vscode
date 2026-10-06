/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { VSBrowser } from 'vscode-extension-tester';
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

// Maven custom report path tests
describe('Maven custom report path tests', () => {
    let dashboard: DashboardPage;

    before(async function() {
        this.timeout(60000);
        // Point the settings at the actual paths Liberty dev mode generates.
        // This proves the settings code path is used (not the extension's default
        // fallback chain) while requiring no changes to the build tool config.
        utils.writeVscodeSettings(utils.getMvnProjectPath(), {
            "liberty.test.report.surefire.path": "target/reports/surefire.html",
            "liberty.test.report.failsafe.path": "target/reports/failsafe.html"
        });
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        dashboard = new DashboardPage();
    });

    it('View unit test report for Maven project with custom surefire path', async () => {
        logger.testStart('View unit test report for Maven project with custom surefire path');
        try {
            const reportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "surefire.html");
            const altReportPath = path.join(utils.getMvnProjectPath(), "target", "site", "surefire-report.html");

            logger.step(1, 'Deleting existing surefire reports');
            await utils.deleteReports(reportPath);
            await utils.deleteReports(altReportPath);

            logger.step(2, 'Starting dev mode with -DhotTests=true');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom parameter: -DhotTests=true');
            await utils.setCustomParameter("-DhotTests=true");

            logger.step(4, 'Waiting for server to start');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server started successfully');

                logger.step(5, 'Waiting for surefire report at custom path');
                const checkFile = await utils.waitForTestReport(reportPath);
                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Surefire report found at custom path');

                logger.step(6, 'Triggering view unit test report action');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.UTR_DASHABOARD_ACTION, constants.UTR_DASHABOARD_MAC_ACTION);

                logger.step(7, 'Waiting for surefire report tab to open');
                const tabs = await utils.waitForEditorTab(constants.SUREFIRE_REPORT_TITLE);
                logger.info(`Open editor tabs: ${tabs.join(', ')}`);

                const reportFound = tabs.indexOf(constants.SUREFIRE_REPORT_TITLE) > -1;
                logger.info(`Surefire report tab found: ${reportFound}`);
                expect(reportFound, "Surefire report tab not found").to.equal(true);
                logger.stepSuccess(7, 'Surefire report tab is open');

                logger.step(8, 'Stopping server');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(9, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);
                if (!serverStopStatus) {
                    logger.error('Server stop message not found in terminal');
                } else {
                    logger.stepSuccess(9, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('View unit test report for Maven project with custom surefire path');
        } catch (error) {
            logger.testFailed('View unit test report for Maven project with custom surefire path', error);
            throw error;
        }
    }).timeout(350000);

    it('View integration test report for Maven project with custom failsafe path', async () => {
        logger.testStart('View integration test report for Maven project with custom failsafe path');
        try {
            const reportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "failsafe.html");
            const altReportPath = path.join(utils.getMvnProjectPath(), "target", "site", "failsafe-report.html");

            logger.step(1, 'Deleting existing failsafe reports');
            await utils.deleteReports(reportPath);
            await utils.deleteReports(altReportPath);

            logger.step(2, 'Starting dev mode with -DhotTests=true');
            await dashboard.runAction(constants.MAVEN_PROJECT, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom parameter: -DhotTests=true');
            await utils.setCustomParameter("-DhotTests=true");

            logger.step(4, 'Waiting for server to start');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server started successfully');

                logger.step(5, 'Waiting for failsafe report at custom path');
                const checkFile = await utils.waitForTestReport(reportPath);
                expect(checkFile).to.be.true;
                logger.stepSuccess(5, 'Failsafe report found at custom path');

                logger.step(6, 'Triggering view integration test report action');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.ITR_DASHBOARD_ACTION, constants.ITR_DASHBOARD_MAC_ACTION);

                logger.step(7, 'Waiting for failsafe report tab to open');
                const tabs = await utils.waitForEditorTab(constants.FAILSAFE_REPORT_TITLE);
                logger.info(`Open editor tabs: ${tabs.join(', ')}`);

                const reportFound = tabs.indexOf(constants.FAILSAFE_REPORT_TITLE) > -1;
                logger.info(`Failsafe report tab found: ${reportFound}`);
                expect(reportFound, "Failsafe report tab not found").to.equal(true);
                logger.stepSuccess(7, 'Failsafe report tab is open');

                logger.step(8, 'Stopping server');
                await dashboard.runAction(constants.MAVEN_PROJECT, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(9, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);
                if (!serverStopStatus) {
                    logger.error('Server stop message not found in terminal');
                } else {
                    logger.stepSuccess(9, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('View integration test report for Maven project with custom failsafe path');
        } catch (error) {
            logger.testFailed('View integration test report for Maven project with custom failsafe path', error);
            throw error;
        }
    }).timeout(350000);

    after(async function() {
        this.timeout(45000);
        utils.removeVscodeSettings(utils.getMvnProjectPath());
        await utils.closeWorkspace();
    });
});
