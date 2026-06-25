import * as path from 'path';
import { logger } from '../utils/testLogger';
import { EditorView, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { EditorPage } from '../pages/EditorPage';
import * as utils from '../utils/testUtils';
import { expect } from 'chai';
import { CodeAssistPage } from '../pages/CodeAssistPage';
import { ProblemsPage } from '../pages/ProblemsPage';
import { QuickFixPage } from '../pages/QuickFixPage';
import * as editorUtils from '../utils/editorUtils';

export interface ServerEnvConfig {
    buildTool: 'maven' | 'gradle';
    getProjectPath: () => string;
    hoverTestCases: Array<{
        element: string;
        line: number;
        column: number;
        expectedDoc: string;
    }>;
}

export function runServerEnvSuite(config: ServerEnvConfig){
     describe(`Server Env functionality tests for ${config.buildTool === 'maven' ? 'Maven' : 'Gradle'} Project`, () => {
        // Compute the test file path using config
        let serverEnv : EditorPage;
        let wait: any;

        before(async function() {
                    this.timeout(60000);
                    
                    logger.info(`Setting up ${config.buildTool === 'maven' ? 'Maven' : 'Gradle'} LSP Hover tests`);
                    
                    // Wait for workbench to be ready
                    await VSBrowser.instance.openResources(config.getProjectPath());
                    await VSBrowser.instance.waitForWorkbench();

                    wait = utils.getWaitHelper();
                    
                    logger.info('Opening server.env file for all tests');
                    const serverEnvPath = path.resolve(
                        config.getProjectPath(),
                        'src',
                        'main',
                        'liberty',
                        'config',
                        'server.env'
                    );
                    logger.info(`Server.env path: ${serverEnvPath}`);
        
                    serverEnv = await new EditorPage().openFile(serverEnvPath, 'server.env');
                    logger.info('Server.env file opened and editor obtained');
                });

            afterEach(async function() {
                // Take screenshot on failure but don't close editor
                if (this.currentTest?.state === 'failed') {
                    await VSBrowser.instance.driver.takeScreenshot();
                    logger.error(`Test failed: ${this.currentTest.title}`);
                }
            });

            after(async function() {
                        this.timeout(10000); // Increase timeout for cleanup operations
                        // Clear server.env file, same logic as in restSnippetSuite.ts
                        try {
                            if (serverEnv) {
                                // Select all text first, then clear
                                const currentText = await serverEnv.getEditor().getText();
                                try {
                                    await serverEnv.getEditor().selectText(currentText);
                                    await wait.sleep(300);
                                } catch (selectError) {
                                    // selectText may fail but setText still works
                                }
                                
                                await editorUtils.clearEditor(serverEnv.getEditor());
                                logger.info('Reset TestRest.java to empty after test');
                            }
                        } catch (error) {
                            logger.error('Failed to reset TestRest.java', error);
                        }
                        // Close editor after all tests complete
                        try {
                            await new EditorView().closeAllEditors();
                            logger.info('Closed all editors after test suite');
                        } catch (error) {
                            logger.error('Failed to close editors in after hook', error);
                        }
                        
                        utils.copyScreenshotsToProjectFolder(config.buildTool);
                    });

            it('Liberty Language Server should initialize', async function() {
                    this.timeout(60000);
                    logger.testStart('Liberty Language Server should initialize');
                        
                    try {
                        await utils.waitForLanguageServerInit(
                            'Language Support for Liberty',
                            'Initialized Liberty Language server',
                            60
                        );
                        logger.testComplete('Liberty Language Server initialized successfully');
                    } catch (error) {
                        logger.testFailed('Liberty Language Server should initialize', error);
                        throw error;
                    }
                });

            const hoverTestCases = config.hoverTestCases;
        
            hoverTestCases.forEach(testCase => {
                it(`Hover over ${testCase.element} shows Liberty Language Server documentation`, async function() {
                    this.timeout(30000);
                    logger.testStart(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
                    await serverEnv.getEditor().setText('WLP_USER_DIR=/opt/wlp/usr\nLOG_DIR=/logs\n');
                    await serverEnv.getEditor().save();
                    await wait.sleep(1000);
                        
                    try {

                        const hoverText = await editorUtils.hoverOver(serverEnv.getEditor(), testCase.line, testCase.column, testCase.element);
                        expect(hoverText).to.not.be.empty;
                        logger.stepSuccess(3, `Hover widget displayed with Liberty Language Server content for ${testCase.element}`);
        
                        logger.step(4, 'Verifying hover contains expected documentation');
                        expect(hoverText).to.include(testCase.expectedDoc);
                        logger.stepSuccess(4, `Hover text contains expected documentation: "${testCase.expectedDoc}"`);
        
                        logger.testComplete(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
                    } catch (error) {
                        logger.testFailed(`Hover over ${testCase.element} shows Liberty Language Server documentation`, error);
                        throw error;
                    }
                });
            });

            it('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT type ahead', async function ()  {
                            this.timeout(275000);
                            logger.testStart('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT type ahead');
                            
                            try {
                                logger.step(1, 'Positioning cursor');
                                await serverEnv.getEditor().setCursor(3, 1);
                                
                                logger.step(2, 'Opening content assist');
                                const codeAssist = new CodeAssistPage();
                                await codeAssist.insertSnippet(serverEnv, 'WLP_LOG', 'WLP_LOGGING_MESSAGE_FORMAT');
                                logger.stepSuccess(2, 'Completion inserted');
                                const after = await serverEnv.getEditor().getText();
                                expect(after).to.include('WLP_LOGGING_MESSAGE_FORMAT');
                                await wait.sleep(1000);
                                
                                const lineText = await serverEnv.getEditor().getTextAtLine(3);
                                await serverEnv.getEditor().setTextAtLine(3, lineText.trimEnd() + '=JSON');
                                
                                await serverEnv.getEditor().save();
                                await wait.sleep(500);

                                
                                logger.testComplete('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT completion');
                            } catch (error) {
                                logger.testFailed('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT completion', error);
                                throw error;
                            }
                        });
                        it('Show that INVALID text displays diagnostic and quick fix removes it ', async function () {
                            this.timeout(90000);
                            logger.testStart('Show that INVALID text displays diagnostic and quick fix removes it');
                            try {

                                await editorUtils.replaceTextWithinLineContaining(serverEnv.getEditor(), 'WLP_LOGGING_MESSAGE_FORMAT', 'JSON', 'INVALID');
            
                                // Save file and wait for reanalysis 
                                await serverEnv.getEditor().save();
                                await wait.sleep(500); 
            
                                // Check that the diagnostic is there 
                                let problems = new ProblemsPage(); 
                                const found = await problems.hasDiagnostic('The value `INVALID` is not valid for the variable `WLP_LOGGING_MESSAGE_FORMAT`.');
                                expect(found).to.be.true; 
                                logger.testComplete('Diagnostic shows INVALID variable');
            
                                // Quick fix implementation to get rid of diagnostic
                                // Re-find line and place cursor on "methodname()"
                                const buffer = await serverEnv.getEditor().getText();
                                logger.info('Buffer before quick fix: ' + JSON.stringify(buffer));
            
                               await new QuickFixPage().applyFix(serverEnv, 'INVALID', 'Replace value with JSON');
                               await wait.sleep(3000);
                               await serverEnv.getEditor().save();
                               await wait.sleep(5000);
            
                               const after = await serverEnv.getEditor().getText();
                               expect(after).to.include('JSON');
                               expect(await problems.hasDiagnostic('The value `INVALID` is not valid for the variable `WLP_LOGGING_MESSAGE_FORMAT`.')).to.be.false;
            
                            } catch (error) {
                                logger.testFailed('Diagnostic/quick-fix test flow failed', error);
                                throw error; 
                            } 
                                
                        });



        
        

        
     }); 
}
