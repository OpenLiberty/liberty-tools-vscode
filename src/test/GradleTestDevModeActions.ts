/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import { expect } from 'chai';
import { DebugView, DefaultTreeItem, EditorView, InputBox, SideBarView, ViewSection, VSBrowser, Workbench } from 'vscode-extension-tester';
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

    before(async function() {
        this.timeout(30000);
        // Wait for workbench to be ready
        await VSBrowser.instance.waitForWorkbench();
        sidebar = new SideBarView();
        debugView = new DebugView();
    });

    afterEach(async function() {
        this.timeout(10000); // Increase timeout for cleanup operations
        // Close any open editors after each test
        if (this.currentTest?.state === 'failed') {
            const driver = VSBrowser.instance.driver;
            const screenshot = await driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
        }
        
        try {
            await new EditorView().closeAllEditors();
        } catch (error) {
            logger.error('Failed to close editors in afterEach', error);
        }
        
        // Clear terminal between tests to avoid confusion with old output
        try {
            const workbench = new Workbench();
            await workbench.executeCommand('terminal clear');
        } catch (error) {
            logger.error('Failed to clear terminal in afterEach', error);
        }
    });

    it('Find Liberty Dashboard in sidebar', async () => {
        logger.testStart('Find Liberty Dashboard in sidebar');
        try {
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

    it('Liberty Dashboard shows items - Gradle', async () => {
        logger.testStart('Liberty Dashboard shows items - Gradle');
        try {
            logger.step(1, 'Getting dashboard section');
            section = await utils.getDashboardSection(sidebar);
            logger.stepSuccess(1, 'Dashboard section retrieved');

            logger.step(2, 'Waiting for Liberty Dashboard to load');
            await utils.waitForDashboardToLoad(section);
            logger.stepSuccess(2, 'Dashboard loaded successfully');

            logger.step(3, 'Getting visible items from section');
            const menu = await utils.waitForCondition(async () => {
                const items = await section.getVisibleItems();
                if (items && items.length > 0) {
                    return items;
                }
                return;
            }, 60);
            logger.info(`Found ${menu.length} visible items in dashboard`);
            expect(menu).not.empty;

            logger.step(4, `Finding Gradle project item: ${constants.GRADLE_PROJECT}`);
            item = await utils.waitForCondition(async () => {
                return await section.findItem(constants.GRADLE_PROJECT) as DefaultTreeItem;
            }, 30);
            logger.stepSuccess(4, 'Gradle project item found');
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
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(3, 'Waiting for server to start');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(3, 'Server successfully started');

                logger.step(4, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(5, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

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
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action with Docker');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);

            logger.step(3, 'Waiting for server to start in Docker container');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started message not found in the terminal');
            } else {
                logger.stepSuccess(3, 'Server successfully started in Docker container');

                logger.step(4, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(5, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

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
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            logger.step(3, 'Waiting for server to start');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

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
            logger.testComplete('Run tests for Gradle project');
        } catch (error) {
            logger.testFailed('Run tests for Gradle project', error);
            throw error;
        }
    }).timeout(350000);


    it('Start Gradle with options from Liberty Dashboard', async () => {
        logger.testStart('Start Gradle with options from Liberty Dashboard');
        try {
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(2, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(3, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(4, 'Setting custom parameter: --hotTests');
            await utils.setCustomParameter("--hotTests");

            logger.step(5, 'Waiting for server to start with parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(5, 'Server successfully started with custom parameters');

                logger.step(6, 'Waiting for test report');
                let checkFile = await utils.waitForTestReport(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(6, 'Test report found');

                logger.step(7, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(8, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

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
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            logger.info(`Report path: ${reportPath}`);

            logger.step(2, 'Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            logger.info(`Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            logger.step(3, 'Launching dashboard start action with parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(4, 'Choosing command from history: --hotTests');
            const foundCommand = await utils.chooseCmdFromHistory("--hotTests");
            logger.info(`Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            logger.step(5, 'Waiting for server to start with historical parameters');
            const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                logger.error('Server started with params message not found in the terminal');
            } else {
                logger.stepSuccess(5, 'Server successfully started with historical parameters');

                logger.step(6, 'Waiting for test report');
                let checkFile = await utils.waitForTestReport(reportPath);
                logger.info(`Report exists: ${checkFile}`);

                expect(checkFile).to.be.true;
                logger.stepSuccess(6, 'Test report found');

                logger.step(7, 'Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                logger.step(8, 'Waiting for server to stop');
                const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);

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
            logger.step(1, 'Getting dashboard section and item');
            section = await utils.getDashboardSection(sidebar);
            item = await utils.getDashboardItem(section, constants.GRADLE_PROJECT);
            logger.stepSuccess(1, 'Dashboard section and item retrieved');

            logger.step(2, 'Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            logger.step(3, 'Setting custom debug parameter: -DdebugPort=7777');
            await utils.setCustomParameter("-DdebugPort=7777");

            logger.step(4, 'Waiting for server to start in debug mode');
            isServerRunning = await utils.waitForServerStart(constants.SERVER_START_STRING);

            if (!isServerRunning) {
                logger.error('Server started with params message not found in terminal');
            } else {
                logger.stepSuccess(4, 'Server successfully started in debug mode');

                logger.step(5, 'Launching attach debugger dashboard action');
                await utils.launchDashboardAction(item, constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
                logger.info('Attach Debugger action completed');

                logger.step(6, 'Waiting for debugger to attach');
                attachStatus = await utils.waitForDebuggerAttach();

                if (!attachStatus) {
                    logger.error('DebugToolbar not found - debugger may not have attached');
                } else {
                    logger.stepSuccess(6, 'Debugger attached successfully');
                }

                logger.step(7, 'Stopping Liberty server');
                await utils.stopLibertyserver(constants.GRADLE_PROJECT);

                logger.step(8, 'Waiting for server to stop');
                isServerRunning = !await utils.waitForServerStop(constants.SERVER_STOP_STRING);

                if (!isServerRunning) {
                    logger.stepSuccess(8, 'Server stopped successfully');
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
                await utils.stopLibertyserver(constants.GRADLE_PROJECT);
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

            logger.step(2, 'Waiting for test report tab to open');
            tabs = await utils.waitForEditorTab(constants.GRADLE_TEST_REPORT_TITLE);
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

    /**
     * The following after hook copies the screenshot from the temporary folder in which it is saved to a known permanent location in the project folder.
     */
    after(() => {
        utils.copyScreenshotsToProjectFolder('gradle');
    });
});