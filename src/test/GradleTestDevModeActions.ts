/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import { expect } from 'chai';
import { InputBox, Workbench, SideBarView, ViewSection, EditorView, DefaultTreeItem, DebugView } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { logger } from './utils/testLogger';
import path = require('path');

describe('Devmode action tests for Gradle Project', () => {
    let sidebar: SideBarView;
    let debugView: DebugView;
    let section: ViewSection;
    let item: DefaultTreeItem;
    let tabs: string[];

    before(() => {
        sidebar = new SideBarView();
        debugView = new DebugView();
    });

    it('Find Liberty Dashboard in sidebar', async () => {
        logger.testStart('Find Liberty Dashboard in sidebar');
        try {
            logger.step(1, 'Getting sidebar content');
            const contentPart = sidebar.getContent();

            logger.step(2, 'Attempting to get Liberty Dashboard section');
            section = await contentPart.getSection('Liberty Dashboard');
            logger.stepSuccess(2, 'Found Liberty Dashboard section');

            logger.step(3, 'Validating sidebar is not undefined');
            expect(section).not.undefined;
            logger.testComplete('Find Liberty Dashboard in sidebar');
        } catch (error) {
            logger.testFailed('Find Liberty Dashboard in sidebar', error);
            throw error;
        }
    }).timeout(10000);

    it('Liberty Dashboard shows items - Gradle', async () => {
        logger.testStart('Liberty Dashboard shows items - Gradle');
        try {
            logger.step(1, 'Waiting for Liberty Dashboard to load');
            await utils.delay(65000);

            // Wait for the Liberty Dashboard to load and expand. The dashboard only expands after using the 'expand()' method.
            logger.step(2, 'Expanding Liberty Dashboard section');
            await section.expand();

            logger.step(3, 'Waiting for expansion to update');
            await utils.delay(15000);

            logger.step(4, 'Getting visible items from section');
            const menu = await section.getVisibleItems();
            logger.info(`Found ${menu.length} visible items in dashboard`);
            expect(menu).not.empty;

            logger.step(5, `Finding Gradle project item: ${constants.GRADLE_PROJECT}`);
            item = await section.findItem(constants.GRADLE_PROJECT) as DefaultTreeItem;
            logger.stepSuccess(5, 'Gradle project item found');
            expect(item).not.undefined;

            logger.testComplete('Liberty Dashboard shows items - Gradle');
        } catch (error) {
            logger.testFailed('Liberty Dashboard shows items - Gradle', error);
            throw error;
        }
    }).timeout(300000);

    it('Start Gradle project from Liberty Dashboard', async () => {
        logger.testStart('Start Gradle project from Liberty Dashboard');
        try {
            logger.step(1, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(2, 'Waiting 30 seconds for server to start');
            await utils.delay(30000);

            logger.step(3, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(3, 'Server successfully started');

                logger.step(4, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(5, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(5, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Gradle project from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Gradle project from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(350000);

    it('Start Gradle with Docker from Liberty Dashboard', async () => {
        logger.testStart('Start Gradle with Docker from Liberty Dashboard');

        if ((process.platform === 'darwin') || (process.platform === 'win32')) {
            logger.skip(`Test skipped for platform: ${process.platform} (Docker test only runs on Linux)`);
            return true;
        }

        try {
            logger.step(1, 'Launching dashboard start action with Docker');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);

            logger.step(2, 'Waiting 60 seconds for Docker container to start');
            await utils.delay(60000);

            logger.step(3, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(3, 'Server successfully started in Docker container');

                logger.step(4, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(5, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(5, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Gradle with Docker from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Gradle with Docker from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(350000);

    it('Run tests for Gradle project', async () => {
        logger.testStart('Run tests for Gradle project');
        try {
            logger.step(1, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(2, 'Waiting 30 seconds for server to start');
            await utils.delay(30000);

            logger.step(3, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(3, 'Server successfully started');

                logger.step(4, 'Launching run tests dashboard action');
                await utils.launchDashboardAction(item, constants.RUNTEST_DASHBOARD_ACTION, constants.RUNTEST_DASHBOARD_MAC_ACTION);

                logger.step(5, 'Checking test execution status');
                const testStatus = await utils.checkTestStatus(constants.GRADLE_TEST_RUN_STRING);
                logger.info(`Test status result: ${testStatus}`);

                expect(testStatus).to.be.true;
                logger.stepSuccess(5, 'Tests executed successfully');

                logger.step(6, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(7, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in the terminal');
                } else {
                    logger.stepSuccess(7, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Run tests for Gradle project');
        } catch (error) {
            logger.testFailed('Run tests for Gradle project', error);
            throw error;
        }
    }).timeout(350000);


    it('Start Gradle with options from Liberty Dashboard', async () => {
        logger.testStart('Start Gradle with options from Liberty Dashboard');
        try {
            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(1, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom parameter: --hotTests');
            await utils.setCustomParameter("--hotTests");

            logger.step(4, 'Waiting 30 seconds for server to start with parameters');
            await utils.delay(30000);

            logger.step(5, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(5, 'Server successfully started with custom parameters');

                logger.step(6, 'Checking if test report exists');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(6, 'Test report found');

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
            logger.testComplete('Start Gradle with options from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Gradle with options from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(550000);

    it('Start Gradle with history from Liberty Dashboard', async () => {
        logger.testStart('Start Gradle with history from Liberty Dashboard');
        try {
            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(1, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(2, 'Launching dashboard start action with parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Choosing command from history: --hotTests');
            const foundCommand = await utils.chooseCmdFromHistory("--hotTests");
            logger.info(`Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            logger.step(4, 'Waiting 30 seconds for server to start with historical parameters');
            await utils.delay(30000);

            logger.step(5, 'Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in the terminal');
            } else {
                logger.stepSuccess(5, 'Server successfully started with historical parameters');

                logger.step(6, 'Checking if test report exists');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(6, 'Test report found');

                logger.step(7, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(8, 'Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    logger.error('Server stopped message not found in terminal');
                } else {
                    logger.stepSuccess(8, 'Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            logger.testComplete('Start Gradle with history from Liberty Dashboard');
        } catch (error) {
            logger.testFailed('Start Gradle with history from Liberty Dashboard', error);
            throw error;
        }
    }).timeout(350000);

    /**
     * All future test cases should be written before the test that attaches the debugger, as this will switch the UI to the debugger view.
     * If, for any reason, a test case needs to be written after the debugger test, ensure that the UI is switched back to the explorer view before executing the subsequent tests.
     */
    it('Attach debugger for Gradle with custom parameter event', async () => {
        logger.testStart('Attach debugger for Gradle with custom parameter event');
        let isServerRunning: Boolean = true;
        let attachStatus: Boolean = false;

        try {
            logger.step(1, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(2, 'Setting custom debug parameter: -DdebugPort=7777');
            await utils.setCustomParameter("-DdebugPort=7777");

            logger.step(3, 'Waiting 30 seconds for server to start in debug mode');
            await utils.delay(30000);

            logger.step(4, 'Checking terminal for server start status');
            isServerRunning = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!isServerRunning) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started in debug mode');

                logger.step(5, 'Launching attach debugger dashboard action');
                await utils.launchDashboardAction(item, constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
                logger.info('Attach Debugger action completed');

                logger.step(6, 'Waiting 8 seconds for debugger to attach');
                await utils.delay(8000);

                logger.step(7, 'Getting debug view content');
                const contentPart = debugView.getContent();

                logger.step(8, 'Checking for BREAKPOINTS section in debug view');
                let mysecarry: Promise<ViewSection[]> = contentPart.getSections();
                let mysecmap: IterableIterator<[number, ViewSection]> = (await mysecarry).entries();

                for (const [key, value] of (mysecmap)) {
                    const sectionText = await value.getEnclosingElement().getText();

                    if (sectionText.includes("BREAKPOINTS")) {
                        logger.stepSuccess(8, 'Found BREAKPOINTS section - debugger attached successfully');
                        attachStatus = true;
                        break;
                    }
                }

                if (!attachStatus) {
                    logger.error('BREAKPOINTS section not found - debugger may not have attached');
                }

                logger.step(9, 'Stopping Liberty server');
                await utils.stopLibertyserver(constants.GRADLE_PROJECT);

                logger.step(10, 'Checking terminal for server stop status');
                isServerRunning = !await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!isServerRunning) {
                    logger.stepSuccess(10, 'Server stopped successfully');
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
                utils.stopLibertyserver(constants.GRADLE_PROJECT);
            } else {
                logger.info('Server already stopped, test cleanup complete');
            }
        }

        expect(attachStatus).to.be.true;
        logger.testComplete('Attach debugger for Gradle with custom parameter event');
    }).timeout(550000);

    it('View test report for Gradle project', async () => {
        logger.testStart('View test report for Gradle project');

        if ((process.platform === 'darwin') || (process.platform === 'win32') || (process.platform == 'linux')) {
            logger.skip(`Test skipped for platform: ${process.platform} (enable once https://github.com/OpenLiberty/liberty-tools-vscode/issues/266 is resolved)`);
            return true;
        }

        try {
            logger.step(1, 'Launching view test report dashboard action');
            await utils.launchDashboardAction(item, constants.GRADLE_TR_DASHABOARD_ACTION, constants.GRADLE_TR_DASHABOARD_MAC_ACTION);

            logger.step(2, 'Getting open editor titles');
            tabs = await new EditorView().getOpenEditorTitles();
            logger.info(`Open editor tabs: ${tabs.join(', ')}`);

            logger.step(3, `Checking if Gradle test report tab is open: ${constants.GRADLE_TEST_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.GRADLE_TEST_REPORT_TITLE) > -1;
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
    // Now, clear the command history of the "command palette" to avoid receiving "recently used" suggestions. This action should be performed at the end of Gradle Project tests.
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
});