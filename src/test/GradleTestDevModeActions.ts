/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import { expect } from 'chai';
import { InputBox, Workbench, SideBarView, ViewSection, EditorView, DefaultTreeItem, DebugView } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
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
        console.log('[TEST START] Find Liberty Dashboard in sidebar');
        try {
            console.log('[STEP 1] Getting sidebar content');
            const contentPart = sidebar.getContent();

            console.log('[STEP 2] Attempting to get Liberty Dashboard section');
            section = await contentPart.getSection('Liberty Dashboard');
            console.log('[STEP 2 - SUCCESS] Found Liberty Dashboard section');

            console.log('[STEP 3] Validating sidebar is not undefined');
            expect(section).not.undefined;
            console.log('[TEST COMPLETE] Find Liberty Dashboard test passed');
        } catch (error) {
            console.error('[TEST FAILED] Find Liberty Dashboard test failed:', error);
            throw error;
        }
    }).timeout(10000);

    it('Liberty Dashboard shows items - Gradle', async () => {
        console.log('[TEST START] Liberty Dashboard shows items - Gradle');
        try {
            console.log('[STEP 1] Waiting for Liberty Dashboard to load');
            await utils.delay(65000);

            // Wait for the Liberty Dashboard to load and expand. The dashboard only expands after using the 'expand()' method.
            console.log('[STEP 2] Expanding Liberty Dashboard section');
            await section.expand();

            console.log('[STEP 3] Waiting for expansion to update');
            await utils.delay(6000);

            console.log('[STEP 4] Getting visible items from section');
            const menu = await section.getVisibleItems();
            console.log(`[INFO] Found ${menu.length} visible items in dashboard`);
            expect(menu).not.empty;

            console.log(`[STEP 5] Finding Gradle project item: ${constants.GRADLE_PROJECT}`);
            item = await section.findItem(constants.GRADLE_PROJECT) as DefaultTreeItem;
            console.log('[STEP 5 - SUCCESS] Gradle project item found');
            expect(item).not.undefined;

            console.log('[TEST COMPLETE] Open dashboard test passed');
        } catch (error) {
            console.error('[TEST FAILED] Open dashboard test failed:', error);
            throw error;
        }
    }).timeout(300000);

    it('Start Gradle project from Liberty Dashboard', async () => {
        console.log('[TEST START] Start Gradle project from Liberty Dashboard');
        try {
            console.log('[STEP 1] Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            console.log('[STEP 2] Waiting 30 seconds for server to start');
            await utils.delay(30000);

            console.log('[STEP 3] Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                console.error('[ERROR] Server started message not found in the terminal');
            } else {
                console.log('[STEP 3 - SUCCESS] Server successfully started');

                console.log('[STEP 4] Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                console.log('[STEP 5] Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    console.error('[ERROR] Server stopped message not found in the terminal');
                } else {
                    console.log('[STEP 5 - SUCCESS] Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            console.log('[TEST COMPLETE] Start Gradle project test passed');
        } catch (error) {
            console.error('[TEST FAILED] Start Gradle project test failed:', error);
            throw error;
        }
    }).timeout(350000);

    it('Start Gradle with Docker from Liberty Dashboard', async () => {
        console.log('[TEST START] Start Gradle with Docker from Liberty Dashboard');

        if ((process.platform === 'darwin') || (process.platform === 'win32')) {
            console.log(`[SKIP] Test skipped for platform: ${process.platform} (Docker test only runs on Linux)`);
            return true;
        }

        try {
            console.log('[STEP 1] Launching dashboard start action with Docker');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);

            console.log('[STEP 2] Waiting 60 seconds for Docker container to start');
            await utils.delay(60000);

            console.log('[STEP 3] Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                console.error('[ERROR] Server started message not found in the terminal');
            } else {
                console.log('[STEP 3 - SUCCESS] Server successfully started in Docker container');

                console.log('[STEP 4] Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                console.log('[STEP 5] Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    console.error('[ERROR] Server stopped message not found in the terminal');
                } else {
                    console.log('[STEP 5 - SUCCESS] Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
            }

            expect(serverStartStatus).to.be.true;
            console.log('[TEST COMPLETE] Start Gradle with Docker test passed');
        } catch (error) {
            console.error('[TEST FAILED] Start Gradle with Docker test failed:', error);
            throw error;
        }
    }).timeout(350000);

    it('Run tests for Gradle project', async () => {
        console.log('[TEST START] Run tests for Gradle project');
        try {
            console.log('[STEP 1] Launching dashboard start action');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);

            console.log('[STEP 2] Waiting 30 seconds for server to start');
            await utils.delay(30000);

            console.log('[STEP 3] Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                console.error('[ERROR] Server started message not found in the terminal');
            } else {
                console.log('[STEP 3 - SUCCESS] Server successfully started');

                console.log('[STEP 4] Launching run tests dashboard action');
                await utils.launchDashboardAction(item, constants.RUNTEST_DASHBOARD_ACTION, constants.RUNTEST_DASHBOARD_MAC_ACTION);

                console.log('[STEP 5] Checking test execution status');
                const testStatus = await utils.checkTestStatus(constants.GRADLE_TEST_RUN_STRING);
                console.log(`[INFO] Test status result: ${testStatus}`);

                console.log('[STEP 6] Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                console.log('[STEP 7] Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    console.error('[ERROR] Server stopped message not found in the terminal');
                } else {
                    console.log('[STEP 7 - SUCCESS] Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
                expect(testStatus).to.be.true;
                console.log('[STEP 5 - SUCCESS] Tests executed successfully');
            }

            expect(serverStartStatus).to.be.true;
            console.log('[TEST COMPLETE] Run tests test passed');
        } catch (error) {
            console.error('[TEST FAILED] Run tests test failed:', error);
            throw error;
        }
    }).timeout(350000);


    it('Start Gradle with options from Liberty Dashboard', async () => {
        console.log('[TEST START] Start Gradle with options from Liberty Dashboard');
        try {
            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            console.log(`[INFO] Report path: ${reportPath}`);

            console.log('[STEP 1] Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            console.log(`[INFO] Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            console.log('[STEP 2] Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            console.log('[STEP 3] Setting custom parameter: --hotTests');
            await utils.setCustomParameter("--hotTests");

            console.log('[STEP 4] Waiting 30 seconds for server to start with parameters');
            await utils.delay(30000);

            console.log('[STEP 5] Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                console.error('[ERROR] Server started with params message not found in terminal');
            } else {
                console.log('[STEP 5 - SUCCESS] Server successfully started with custom parameters');

                console.log('[STEP 6] Checking if test report exists');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                console.log(`[INFO] Report exists: ${checkFile}`);

                console.log('[STEP 7] Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                console.log('[STEP 8] Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    console.error('[ERROR] Server stopped message not found in the terminal');
                } else {
                    console.log('[STEP 8 - SUCCESS] Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
                expect(checkFile).to.be.true;
                console.log('[STEP 6 - SUCCESS] Test report found');
            }

            expect(serverStartStatus).to.be.true;
            console.log('[TEST COMPLETE] Start Gradle with options test passed');
        } catch (error) {
            console.error('[TEST FAILED] Start Gradle with options test failed:', error);
            throw error;
        }
    }).timeout(550000);

    it('Start Gradle with history from Liberty Dashboard', async () => {
        console.log('[TEST START] Start Gradle with history from Liberty Dashboard');
        try {
            const reportPath = path.join(utils.getGradleProjectPath(), "build", "reports", "tests", "test", "index.html");
            console.log(`[INFO] Report path: ${reportPath}`);

            console.log('[STEP 1] Deleting existing test report');
            const deleteReport = await utils.deleteReports(reportPath);
            console.log(`[INFO] Report deletion result: ${deleteReport}`);
            expect(deleteReport).to.be.true;

            console.log('[STEP 2] Launching dashboard start action with parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            console.log('[STEP 3] Choosing command from history: --hotTests');
            const foundCommand = await utils.chooseCmdFromHistory("--hotTests");
            console.log(`[INFO] Command found in history: ${foundCommand}`);
            expect(foundCommand).to.be.true;

            console.log('[STEP 4] Waiting 30 seconds for server to start with historical parameters');
            await utils.delay(30000);

            console.log('[STEP 5] Checking terminal for server start status');
            const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!serverStartStatus) {
                console.error('[ERROR] Server started with params message not found in the terminal');
            } else {
                console.log('[STEP 5 - SUCCESS] Server successfully started with historical parameters');

                console.log('[STEP 6] Checking if test report exists');
                let checkFile = await utils.checkIfTestReportExists(reportPath);
                console.log(`[INFO] Report exists: ${checkFile}`);

                console.log('[STEP 7] Launching dashboard stop action');
                await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);

                console.log('[STEP 8] Checking terminal for server stop status');
                const serverStopStatus = await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!serverStopStatus) {
                    console.error('[ERROR] Server stopped message not found in terminal');
                } else {
                    console.log('[STEP 8 - SUCCESS] Server stopped successfully');
                }
                expect(serverStopStatus).to.be.true;
                expect(checkFile).to.be.true;
                console.log('[STEP 6 - SUCCESS] Test report found');
            }

            expect(serverStartStatus).to.be.true;
            console.log('[TEST COMPLETE] Start Gradle with history test passed');
        } catch (error) {
            console.error('[TEST FAILED] Start Gradle with history test failed:', error);
            throw error;
        }
    }).timeout(350000);

    /**
     * All future test cases should be written before the test that attaches the debugger, as this will switch the UI to the debugger view.
     * If, for any reason, a test case needs to be written after the debugger test, ensure that the UI is switched back to the explorer view before executing the subsequent tests.
     */
    it('Attach debugger for Gradle with custom parameter event', async () => {
        console.log('[TEST START] Attach debugger for Gradle with custom parameter event');
        let isServerRunning: Boolean = true;
        let attachStatus: Boolean = false;

        try {
            console.log('[STEP 1] Launching dashboard start action with custom parameters');
            await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);

            console.log('[STEP 2] Setting custom debug parameter: -DdebugPort=7777');
            await utils.setCustomParameter("-DdebugPort=7777");

            console.log('[STEP 3] Waiting 30 seconds for server to start in debug mode');
            await utils.delay(30000);

            console.log('[STEP 4] Checking terminal for server start status');
            isServerRunning = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);

            if (!isServerRunning) {
                console.error('[ERROR] Server started with params message not found in terminal');
            } else {
                console.log('[STEP 4 - SUCCESS] Server successfully started in debug mode');

                console.log('[STEP 5] Launching attach debugger dashboard action');
                await utils.launchDashboardAction(item, constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
                console.log('[INFO] Attach Debugger action completed');

                console.log('[STEP 6] Waiting 8 seconds for debugger to attach');
                await utils.delay(8000);

                console.log('[STEP 7] Getting debug view content');
                const contentPart = debugView.getContent();

                console.log('[STEP 8] Checking for BREAKPOINTS section in debug view');
                let mysecarry: Promise<ViewSection[]> = contentPart.getSections();
                let mysecmap: IterableIterator<[number, ViewSection]> = (await mysecarry).entries();

                for (const [key, value] of (mysecmap)) {
                    const sectionText = await value.getEnclosingElement().getText();
                    // console.log(`[INFO] Checking section ${key}: ${sectionText}`);

                    if (sectionText.includes("BREAKPOINTS")) {
                        console.log('[STEP 8 - SUCCESS] Found BREAKPOINTS section - debugger attached successfully');
                        attachStatus = true;
                        break;
                    }
                }

                if (!attachStatus) {
                    console.error('[ERROR] BREAKPOINTS section not found - debugger may not have attached');
                }

                console.log('[STEP 9] Stopping Liberty server');
                await utils.stopLibertyserver(constants.GRADLE_PROJECT);

                console.log('[STEP 10] Checking terminal for server stop status');
                isServerRunning = !await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);

                if (!isServerRunning) {
                    console.log('[STEP 10 - SUCCESS] Server stopped successfully');
                } else {
                    console.error('[ERROR] Server stop message not found in terminal');
                }
            }
        } catch (e) {
            console.error('[ERROR] Exception occurred during attach debugger test:', e);
            throw e;
        } finally {
            console.log(`[CLEANUP] Finally block - Server running status: ${isServerRunning}`);
            if (isServerRunning) {
                console.log('[CLEANUP] Attempting to stop server in finally block');
                utils.stopLibertyserver(constants.GRADLE_PROJECT);
            } else {
                console.log('[CLEANUP] Server already stopped, test cleanup complete');
            }
        }

        expect(attachStatus).to.be.true;
        console.log('[TEST COMPLETE] Attach debugger test passed');
    }).timeout(550000);

    it('View test report for Gradle project', async () => {
        console.log('[TEST START] View test report for Gradle project');

        if ((process.platform === 'darwin') || (process.platform === 'win32') || (process.platform == 'linux')) {
            console.log(`[SKIP] Test skipped for platform: ${process.platform} (enable once https://github.com/OpenLiberty/liberty-tools-vscode/issues/266 is resolved)`);
            return true;
        }

        try {
            console.log('[STEP 1] Launching view test report dashboard action');
            await utils.launchDashboardAction(item, constants.GRADLE_TR_DASHABOARD_ACTION, constants.GRADLE_TR_DASHABOARD_MAC_ACTION);

            console.log('[STEP 2] Getting open editor titles');
            tabs = await new EditorView().getOpenEditorTitles();
            console.log(`[INFO] Open editor tabs: ${tabs.join(', ')}`);

            console.log(`[STEP 3] Checking if Gradle test report tab is open: ${constants.GRADLE_TEST_REPORT_TITLE}`);
            const reportFound = tabs.indexOf(constants.GRADLE_TEST_REPORT_TITLE) > -1;
            console.log(`[INFO] Gradle test report found: ${reportFound}`);

            expect(reportFound, "Gradle test report not found").to.equal(true);
            console.log('[STEP 3 - SUCCESS] Gradle test report tab is open');
            console.log('[TEST COMPLETE] View test report test passed');
        } catch (error) {
            console.error('[TEST FAILED] View test report test failed:', error);
            throw error;
        }
    }).timeout(30000);

    // Based on the UI testing code, it sometimes selects the wrong command in "command palette", such as choosing "Liberty: Start ..." instead of "Liberty: Start" from the recent suggestions. This discrepancy occurs because we specifically need "Liberty: Start" at that moment.
    // Now, clear the command history of the "command palette" to avoid receiving "recently used" suggestions. This action should be performed at the end of Gradle Project tests.
    it('Clear Command Palette', async () => {
        console.log('[TEST START] Clear Command Palette');
        try {
            console.log('[STEP 1] Clearing command palette history');
            await utils.clearCommandPalette();
            console.log('[STEP 1 - SUCCESS] Command palette history cleared');
            console.log('[TEST COMPLETE] Clear Command Palette test passed');
        } catch (error) {
            console.error('[TEST FAILED] Clear Command Palette test failed:', error);
            throw error;
        }
    }).timeout(100000);
});