/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { expect } from 'chai';
import { DefaultTreeItem, EditorView, SideBarView, ViewItem, ViewSection, VSBrowser, Workbench, WebDriver } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';
import * as constants from '../definitions/constants';
import { logger } from '../utils/testLogger';
import path = require('path');
import { DashboardPage } from '../pages/DashboardPage';

export interface DevModeConfig {
    buildTool: 'maven' | 'gradle';
    getProjectPath: () => string;
    projectConstant: string;
    testRunString: string;
}

export function runDevModeTestSuite(config: DevModeConfig): void {
    let dashboard!: DashboardPage;
    
    describe(`Devmode action tests for ${config.buildTool} Project`, () => {
    
        before(async function() {
            this.timeout(60000);
    
            await VSBrowser.instance.openResources(config.getProjectPath());
            await VSBrowser.instance.waitForWorkbench();
            
            dashboard = new DashboardPage();
        });

        afterEach(async function() {
        this.timeout(30000);
        // Close any open editors after each test
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
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
    it('Find Liberty Tools in sidebar', async () => {
        logger.testStart('Find Liberty Tools in sidebar');
        try {
            logger.step(1, 'Attempting to get Liberty Tools section');
            const section = await dashboard.getSection(); 
            logger.stepSuccess(1, 'Found Liberty Tools section');

            logger.step(2, 'Validating sidebar is not undefined');
            expect(section).not.undefined;
            logger.testComplete('Find Liberty Tools in sidebar');
        } catch (error) {
            logger.testFailed('Find Liberty Tools in sidebar', error);
            throw error;
        }
    }).timeout(60000);
     it(`Liberty Tools shows items -  ${config.buildTool}`, async () => {
            logger.testStart('Liberty Tools shows items - Maven');
            try {
                logger.step(1, 'Getting dashboard section');
                const section = await dashboard.getSection();
                logger.stepSuccess(1, 'Dashboard section retrieved');
    
                logger.step(2, 'Waiting for Liberty Tools to load');
                await utils.waitForDashboardToLoad(section);
                logger.stepSuccess(2, 'Liberty Tools loaded successfully');
    
                // waitForDashboardToLoad already confirmed items exist on a fresh
                // section reference.  Re-fetch here so getVisibleItems() doesn't
                // operate on the original stale reference from before the wait.
                logger.step(3, 'Getting visible items from section');
                const freshSection = await dashboard.getSection();
                const menu = await utils.waitForCondition(async () => {
                    const items = await freshSection.getVisibleItems();
                    if (items && items.length > 0) {
                        return items;
                    }
                    return;
                }, 60);
                logger.info(`Found ${menu.length} visible items in dashboard`);
                expect(menu).not.empty;
    
                logger.step(4, `Finding Maven project item: ${config.projectConstant}`);
                const item = await dashboard.getProjectItem(config.projectConstant);
                logger.stepSuccess(4, 'Maven project item found');
                expect(item).not.undefined;
    
                logger.testComplete(`Liberty Tools shows items - ${config.buildTool}`);
            } catch (error) {
                logger.testFailed(`Liberty Tools shows items - ${config.buildTool}`, error);
                throw error;
            }
        }).timeout(360000);

        it(`Start ${config.buildTool} project from Liberty Tools`, async () => {
                logger.testStart('Start Maven project from Liberty Tools');
                try {
                    logger.step(1, 'Getting dashboard section and item');
                    await dashboard.runAction(config.projectConstant, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);
        
                    logger.step(2, 'Waiting for server to start');
                    const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);
        
                    if (!serverStartStatus) {
                        logger.error('Server started message not found in the terminal');
                    } else {
                        logger.stepSuccess(2, 'Server successfully started');
        
                        logger.step(3, 'Launching dashboard stop action');
                        await dashboard.runAction(config.projectConstant, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
        
                        logger.step(4, 'Waiting for server to stop');
                        const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);
        
                        if (!serverStopStatus) {
                            logger.error('Server stopped message not found in the terminal');
                        } else {
                            logger.stepSuccess(4, 'Server stopped successfully');
                        }
                        expect(serverStopStatus).to.be.true;
                    }
        
                    expect(serverStartStatus).to.be.true;
                    logger.testComplete(`Start ${config.buildTool} project from Liberty Tools`);
                } catch (error) {
                    logger.testFailed(`Start ${config.buildTool} project from Liberty Tools`, error);
                    throw error;
                }
            }).timeout(550000);
        
         it(`Start ${config.buildTool} with Docker from Liberty Tools`, async () => {
                logger.testStart('Start Maven with Docker from Liberty Tools');
        
                if ((process.platform === 'darwin') || (process.platform === 'win32')) {
                    logger.skip(`Test skipped for platform: ${process.platform} (Docker test only runs on Linux)`);
                    return true;
                }
        
                try {
                    logger.step(1, 'Launching dashboard start action with Docker');
                    await dashboard.runAction(config.projectConstant, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);
        
                    logger.step(2, 'Waiting for server to start in Docker container');
                    const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);
        
                    if (!serverStartStatus) {
                        logger.error('Server started message not found in the terminal');
                    } else {
                        logger.stepSuccess(2, 'Server successfully started in Docker container');
        
                        logger.step(3, 'Launching dashboard stop action');
                        await dashboard.runAction(config.projectConstant, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
        
                        logger.step(4, 'Waiting for server to stop');
                        const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);
        
                        if (!serverStopStatus) {
                            logger.error('Server stopped message not found in the terminal');
                        } else {
                            logger.stepSuccess(4, 'Server stopped successfully');
                        }
                        expect(serverStopStatus).to.be.true;
                    }
        
                    expect(serverStartStatus).to.be.true;
                    logger.testComplete(`Start ${config.buildTool} with Docker from Liberty Tools`);
                } catch (error) {
                    logger.testFailed(`Start ${config.buildTool} with Docker from Liberty Tools`, error);
                    throw error;
                }
            }).timeout(350000);

        it(`Run tests for ${config.buildTool} project`, async () => {
                logger.testStart('Run tests for Maven project');
                try {
                    logger.step(1, 'Launching dashboard start action');
                    await dashboard.runAction(config.projectConstant, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);
        
                    logger.step(2, 'Waiting for server to start');
                    const serverStartStatus = await utils.waitForServerStart(constants.SERVER_START_STRING);
        
                    if (!serverStartStatus) {
                        logger.error('Server started message not found in the terminal');
                    } else {
                        logger.stepSuccess(2, 'Server successfully started');
        
                        logger.step(3, 'Launching run tests dashboard action');
                        await dashboard.runAction(config.projectConstant, constants.RUNTEST_DASHBOARD_ACTION, constants.RUNTEST_DASHBOARD_MAC_ACTION);
        
                        logger.step(4, 'Checking test execution status');
                        const testStatus = await utils.checkTestStatus(config.testRunString);
                        logger.info(`Test status result: ${testStatus}`);
                        expect(testStatus).to.be.true;
                        logger.stepSuccess(4, 'Tests executed successfully');
        
                        logger.step(5, 'Launching dashboard stop action');
                        await dashboard.runAction(config.projectConstant, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
        
                        logger.step(6, 'Waiting for server to stop');
                        const serverStopStatus = await utils.waitForServerStop(constants.SERVER_STOP_STRING);
        
                        if (!serverStopStatus) {
                            logger.error('Server stopped message not found in the terminal');
                        } else {
                            logger.stepSuccess(6, 'Server stopped successfully');
                        }
                        expect(serverStopStatus).to.be.true;
                    }
        
                    expect(serverStartStatus).to.be.true;
                    logger.testComplete(`Run tests for ${config.buildTool} project`);
                } catch (error) {
                    logger.testFailed(`Run tests for ${config.buildTool} project`, error);
                    throw error;
                }
            }).timeout(350000);

         /**
             * All future test cases should be written before the test that attaches the debugger, as this will switch the UI to the debugger view.
             * If, for any reason, a test case needs to be written after the debugger test, ensure that the UI is switched back to the explorer view before executing the subsequent tests.
             */
            it(`Attach debugger for ${config.buildTool} with custom parameter event`, async () => {
                logger.testStart('Attach debugger for start with custom parameter event');
                let isServerRunning: Boolean = true;
                let attachStatus: Boolean = false;
        
                try {
                    logger.step(1, 'Launching dashboard start action with custom parameters');
                    await dashboard.runAction(config.projectConstant, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);
        
                    logger.step(2, 'Setting custom debug parameter: -DdebugPort=7777');
                    await utils.setCustomParameter("-DdebugPort=7777");
        
                    logger.step(3, 'Waiting for server to start in debug mode');
                    isServerRunning = await utils.waitForServerStart(constants.SERVER_START_STRING);
        
                    if (!isServerRunning) {
                        logger.error('Server started with params message not found in terminal');
                    } else {
                        logger.stepSuccess(3, 'Server successfully started in debug mode');
        
                        logger.step(4, 'Launching attach debugger dashboard action');
                        await dashboard.runAction(config.projectConstant, constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
                        logger.info('Attach Debugger action completed');
        
                        logger.step(5, 'Waiting for debugger to attach');
                        attachStatus = await utils.waitForDebuggerAttach();
        
                        if (!attachStatus) {
                            logger.error('DebugToolbar not found - debugger may not have attached');
                        } else {
                            logger.stepSuccess(5, 'Debugger attached successfully');
                        }
        
                        logger.step(6, 'Stopping Liberty server');
                        await utils.stopLibertyserver(config.projectConstant);
        
                        logger.step(7, 'Waiting for server to stop');
                        isServerRunning = !await utils.waitForServerStop(constants.SERVER_STOP_STRING);
        
                        if (!isServerRunning) {
                            logger.stepSuccess(7, 'Server stopped successfully');
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
                        await utils.stopLibertyserver(config.projectConstant);
                    } else {
                        logger.info('Server already stopped, test cleanup complete');
                    }
                }
        
                expect(attachStatus).to.be.true;
                logger.testComplete(`Attach debugger for ${config.buildTool}  with custom parameter event`);
            }).timeout(350000);
        
            /**
             * The following after hook restores the Explorer view (in case the
             * attach-debugger test left VS Code in the Debug perspective — on mac
             * Previous this does not auto-restore) then copies screenshots.
             */
            after(async function() {
                this.timeout(30000);
                try {
                    const { Workbench } = require('vscode-extension-tester');
                    await new Workbench().executeCommand('workbench.view.explorer');
                    await utils.getWaitHelper().sleep(1000);
                } catch { /* non-fatal */ }
                utils.copyScreenshotsToProjectFolder(config.buildTool);
            });
        
    });
}