/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import { expect } from 'chai';
import { SideBarView, ViewItem, ViewSection, EditorView, DefaultTreeItem, DebugView, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { logger } from './utils/testLogger';
import path = require('path');
import * as fs from 'fs';

describe('Devmode action tests for Maven Project', () => {
    let sidebar: SideBarView;
    let debugView: DebugView;
    let section: ViewSection;
    let menu: ViewItem[];
    let item: DefaultTreeItem;
    let tabs: string[];

    before(() => {
        sidebar = new SideBarView();
        debugView = new DebugView();
    });

    it('Find Liberty Dashboard in sidebar', async () => {
        logger.testStart('Find Liberty Dashboard in sidebar');
        try {
            //Wait for VS-Code to load
            await utils.delay(15000);
            
            logger.step(1, 'Attempting to get Liberty Dashboard section');
            section = await utils.getDashboardSection(sidebar);
            logger.stepSuccess(1, 'Found Liberty Dashboard section');

            logger.step(2, 'Validating sidebar is not undefined');
            expect(section).not.undefined;
            logger.testComplete('Find Liberty Dashboard in sidebar');
        } catch (error) {
            logger.testFailed('Find Liberty Dashboard in sidebar', error);
            throw error;
        }
    }).timeout(60000);

    it('Liberty Dashboard shows items - Maven', async () => {
        logger.testStart('Liberty Dashboard shows items - Maven');
        try {
            logger.step(1, 'Waiting for Liberty Dashboard to load');
            await utils.delay(65000);

            logger.step(2, 'Getting dashboard section');
            section = await utils.getDashboardSection(sidebar);
            logger.stepSuccess(2, 'Dashboard section retrieved');

            // Wait for the Liberty Dashboard to load and expand. The dashboard only expands after using the 'expand()' method.
            logger.step(3, 'Expanding Liberty Dashboard section');
            await section.expand();

            logger.step(4, 'Waiting for expansion to update');
            await utils.delay(15000);

            logger.step(5, 'Getting visible items from section');
            const menu = await utils.waitForCondition(async () => {
                const items = await section.getVisibleItems();
                if (items && items.length > 0) {
                    return items;
                }
                return;
            }, 60);
            logger.info(`Found ${menu.length} visible items in dashboard`);
            expect(menu).not.empty;

            logger.step(6, `Finding Maven project item: ${constants.MAVEN_PROJECT}`);
            item = await utils.waitForCondition(async () => {
                return await section.findItem(constants.MAVEN_PROJECT) as DefaultTreeItem;
            }, 30);
            logger.stepSuccess(6, 'Maven project item found');
            expect(item).not.undefined;

            logger.testComplete('Liberty Dashboard shows items - Maven');
        } catch (error) {
            logger.testFailed('Liberty Dashboard shows items - Maven', error);
            throw error;
        }
    }).timeout(275000);

    it('Start Maven project from Liberty Dashboard', async () => {
        logger.testStart('Start Maven project from Liberty Dashboard');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(3, 'Waiting 30 seconds for server to start');
            await utils.delay(30000);

            logger.step(4, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started');

                logger.step(5, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(6, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(6, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Maven project from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Maven project from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(550000);

    it('Start Maven with Docker from Liberty Dashboard', async () => {
        logger.testStart('Start Maven with Docker from Liberty Dashboard');

        if ((process.platform === 'darwin') || (process.platform === 'win32')) {
            logger.skip(`Test skipped for platform: ${process.platform} (Docker test only runs on Linux)`);
            return true;
        }

        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action with Docker');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);

            logger.step(3, 'Waiting 60 seconds for Docker container to start');
            await utils.delay(60000);

            logger.step(4, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started in Docker container');

                logger.step(5, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(6, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(6, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Maven with Docker from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Maven with Docker from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(350000);

    it('Run tests for Maven project', async () => {
        logger.testStart('Run tests for Maven project');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(3, 'Waiting 30 seconds for server to start');
            await utils.delay(30000);

            logger.step(4, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started');

                logger.step(5, 'Launching run tests dashboard action');
                await utils.launchDashboardAction(item, constants.RUNTEST_DASHBOARD_ACTION, constants.RUNTEST_DASHBOARD_MAC_ACTION);

                logger.step(6, 'Checking test execution status');
                const testStatus = await utils.checkTestStatus(constants.MAVEN_RUN_TESTS_STRING);
                logger.info(`Test status result: ${testStatus}`);
                expect(testStatus).to.be.true;
                logger.stepSuccess(6, 'Tests executed successfully');

                logger.step(7, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(8, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(8, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Run tests for Maven project');
        } catch (error) {
            logger.testFailed('Run tests for Maven project', error);
            throw error;
        }
    }).timeout(350000);

    it('Start Maven with options from Liberty Dashboard', async () => {
        logger.testStart('Start Maven with options from Liberty Dashboard');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            const reportPath = path.join(utils.getMvnProjectPath(), "target", "site", "failsafe-report.html");
            const alternateReportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "failsafe.html");
            logger.info(`Primary report path: ${reportPath}`);
            logger.info(`Alternate report path: ${alternateReportPath}`);

            logger.step(2, 'Deleting existing test reports');
            let deleteReport = await utils.deleteReports(reportPath);
            let deleteAlternateReport = await utils.deleteReports(alternateReportPath);
            logger.info(`Primary report deletion result: ${deleteReport}`);
            logger.info(`Alternate report deletion result: ${deleteAlternateReport}`);
            expect(deleteReport && deleteAlternateReport).to.be.true;

            logger.step(3, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(4, 'Setting custom parameter: -DhotTests=true');
            await utils.setCustomParameter("-DhotTests=true");

            logger.step(5, 'Waiting 30 seconds for server to start with parameters');
            await utils.delay(30000);

            logger.step(6, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(6, 'Server successfully started with custom parameters');

                logger.step(7, 'Checking if test report exists at primary location');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                logger.info(`Primary report exists: ${checkFile}`);

                logger.step(8, 'Checking if test report exists at alternate location');
                let checkAlternateFile = await utils.checkIfTestReportExists(alternateReportPath);
                logger.info(`Alternate report exists: ${checkAlternateFile}`);

                expect(checkFile || checkAlternateFile).to.be.true;
                logger.stepSuccess(8, 'Test report found in at least one location');

                logger.step(9, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(10, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(10, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Maven with options from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Maven with options from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(350000);

    it('Start Maven with history from Liberty Dashboard', async () => {
        logger.testStart('Start Maven with history from Liberty Dashboard');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            const reportPath = path.join(utils.getMvnProjectPath(), "target", "site", "failsafe-report.html");
            const alternateReportPath = path.join(utils.getMvnProjectPath(), "target", "reports", "failsafe.html");
            logger.info(`Primary report path: ${reportPath}`);
            logger.info(`Alternate report path: ${alternateReportPath}`);

            logger.step(2, 'Deleting existing test reports');
            let deleteReport = await utils.deleteReports(reportPath);
            let deleteAlternateReport = await utils.deleteReports(alternateReportPath);
            logger.info(`Primary report deletion result: ${deleteReport}`);
            logger.info(`Alternate report deletion result: ${deleteAlternateReport}`);
            expect(deleteReport && deleteAlternateReport).to.be.true;

            logger.step(3, 'Launching dashboard start action with parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(4, 'Choosing command from history: -DhotTests=true');
            const foundCommand = await utils.chooseCmdFromHistory("-DhotTests=true");
            logger.info(`Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            logger.step(5, 'Waiting 30 seconds for server to start with historical parameters');
            await utils.delay(30000);

            logger.step(6, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in the terminal');
            } else {
                logger.stepSuccess(6, 'Server successfully started with historical parameters');

                logger.step(7, 'Checking if test report exists at primary location');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                logger.info(`Primary report exists: ${checkFile}`);

                logger.step(8, 'Checking if test report exists at alternate location');
                let checkAlternateFile = await utils.checkIfTestReportExists(alternateReportPath);
                logger.info(`Alternate report exists: ${checkAlternateFile}`);

                expect(checkFile || checkAlternateFile).to.be.true;
                logger.stepSuccess(8, 'Test report found in at least one location');

                logger.step(9, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(10, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in terminal');
                } else {
                    logger.stepSuccess(10, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Maven with history from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Maven with history from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(550000);

    it('View unit test report for Maven project', async () => {
        logger.testStart('View unit test report for Maven project');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching view unit test report dashboard action');
            await utils.launchDashboardAction(item, constants.UTR_DASHABOARD_ACTION, constants.UTR_DASHABOARD_MAC_ACTION);

            logger.step(3, 'Getting open editor titles');
            tabs = await utils.waitForCondition(async () => {
                const titles = await new EditorView().getOpenEditorTitles();
                if (titles && titles.length > 0) {
                    return titles;
                }
                return;
            }, 10);
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(4, `Checking if unit test report tab is open: ${constants.SUREFIRE_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.SUREFIRE_REPORT_TITLE) > -1;
            logger.info(`Unit test report found: ${reportFound}`);

            expect(reportFound, "Unit test report not found").to.equal(true);
            logger.stepSuccess(4, 'Unit test report tab is open');
            logger.testComplete('View unit test report for Maven project');
        } catch (error) {
            logger.testFailed('View unit test report for Maven project', error);
            throw error;
        }
    }).timeout(10000);

    it('View integration test report for Maven project', async () => {
        logger.testStart('View integration test report for Maven project');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching view integration test report dashboard action');
            await utils.launchDashboardAction(item, constants.ITR_DASHBOARD_ACTION, constants.ITR_DASHBOARD_MAC_ACTION);

            logger.step(3, 'Getting open editor titles');
            tabs = await utils.waitForCondition(async () => {
                const titles = await new EditorView().getOpenEditorTitles();
                if (titles && titles.length > 0) {
                    return titles;
                }
                return;
            }, 10);
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(4, `Checking if integration test report tab is open: ${constants.FAILSAFE_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.FAILSAFE_REPORT_TITLE) > -1;
            logger.info(`Integration test report found: ${reportFound}`);

            expect(reportFound, "Integration test report not found").to.equal(true);
            logger.stepSuccess(4, 'Integration test report tab is open');
            logger.testComplete('View integration test report for Maven project');
        } catch (error) {
            logger.testFailed('View integration test report for Maven project', error);
            throw error;
        }
    }).timeout(10000);

    /**
     * All future test cases should be written before the test that attaches the debugger, as this will switch the UI to the debugger view.
     * If, for any reason, a test case needs to be written after the debugger test, ensure that the UI is switched back to the explorer view before executing the subsequent tests.
     */
    it('Attach debugger for start with custom parameter event', async () => {
        logger.testStart('Attach debugger for start with custom parameter event');
        let isServerRunning: Boolean = true;
        let attachStatus: Boolean = false;

        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.MAVEN_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom debug parameter: -DdebugPort=7777');
            await utils.setCustomParameter("-DdebugPort=7777");

            logger.step(4, 'Waiting 30 seconds for server to start in debug mode');
            await utils.delay(30000);

            logger.step(5, 'Checking terminal for server start status');
            isServerRunning = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!isServerRunning) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(5, 'Server successfully started in debug mode');

                logger.step(6, 'Launching attach debugger dashboard action');
                await utils.launchDashboardAction(item, constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
                logger.info('Attach Debugger action completed');

                logger.step(7, 'Waiting 8 seconds for debugger to attach');
                await utils.delay(8000);

                logger.step(8, 'Getting debug view content');
                const contentPart = debugView.getContent();

                logger.step(9, 'Checking for BREAKPOINTS section in debug view');
                let mysecarry: Promise<ViewSection[]> = contentPart.getSections();
                let mysecmap: IterableIterator<[number, ViewSection]> = (await mysecarry).entries();

                for (const [key, value] of (mysecmap)) {
                    const sectionText = await value.getEnclosingElement().getText();

                    if (sectionText.includes("BREAKPOINTS")) {
                        logger.stepSuccess(9, 'Found BREAKPOINTS section - debugger attached successfully');
                        attachStatus = true;
                        break;
                    }
                }

                if (!attachStatus) {
                    logger.error('BREAKPOINTS section not found - debugger may not have attached');
                }

                logger.step(10, 'Stopping Liberty server');
                await utils.stopLibertyserver(constants.MAVEN_PROJECT);

                logger.step(11, 'Checking terminal for server stop status');
                isServerRunning = !await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!isServerRunning) {
                    logger.stepSuccess(11, 'Server stopped successfully');
                } else {
                    logger.error('Server stop message not found in terminal');
                }
            }
        } catch (e) {
            logger.error('Exception occurred during attach debugger test', e);
            throw e;
        } finally {
            logger.info(`Finally block - Server running status: ${isServerRunning}`);
            if (isServerRunning) {
                logger.info('Attempting to stop server in finally block');
                await utils.stopLibertyserver(constants.MAVEN_PROJECT);
            } else {
                logger.info('Server already stopped, test cleanup complete');
            }
        }

        expect(attachStatus).to.be.true;
        logger.testComplete('Attach debugger for start with custom parameter event');
    }).timeout(350000);

    /**
     * The following after hook copies the screenshot from the temporary folder in which it is saved to a known permanent location in the project folder.
     */
    after(() => {
        utils.copyScreenshotsToProjectFolder('maven');
    });
});


