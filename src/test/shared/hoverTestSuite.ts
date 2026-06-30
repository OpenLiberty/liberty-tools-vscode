/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { EditorView, TextEditor, VSBrowser, Workbench, WebDriver } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';
import { logger } from '../utils/testLogger';
import * as path from 'path';
import * as editorUtils from '../utils/editorUtils';
import { EditorPage } from '../pages/EditorPage';

export interface HoverConfig {
    buildTool: 'maven' | 'gradle';
    getProjectPath: () => string;
    hoverTestCases: Array<{
        element: string;
        line: number;
        column: number;
        expectedDoc: string;
    }>;
}

export function runHoverTestSuite(config: HoverConfig){
    describe(`LSP Hover tests for ${config.buildTool === 'maven' ? 'Maven' : 'Gradle'} Project`, () => {
        let serverXml: EditorPage;
        
        before(async function() {
            this.timeout(120000);
            
            logger.info(`Setting up ${config.buildTool === 'maven' ? 'Maven' : 'Gradle'} LSP Hover tests`);
            
            // Wait for workbench to be ready
            await VSBrowser.instance.openResources(config.getProjectPath());
            await VSBrowser.instance.waitForWorkbench();
            
            // Open server.xml file once for all tests
            logger.info('Opening server.xml file for all tests');
            const serverXmlPath = path.resolve(
                config.getProjectPath(),
                'src',
                'main',
                'liberty',
                'config',
                'server.xml'
            );
            logger.info(`Server.xml path: ${serverXmlPath}`);

            serverXml = await new EditorPage().openFile(serverXmlPath, 'server.xml');
            logger.info('Server.xml file opened and editor obtained');
        });

        afterEach(async function() {
            // Take screenshot on failure but don't close editor
            if (this.currentTest?.state === 'failed') {
                await VSBrowser.instance.driver.takeScreenshot();
                logger.error(`Test failed: ${this.currentTest.title}`);
            }
        });

        after(async function() {
            this.timeout(45000);
            try {
                await new EditorView().closeAllEditors();
                logger.info('Closed all editors after test suite');
            } catch (error) {
                logger.error('Failed to close editors in after hook', error);
            }
            await utils.closeWorkspace();
            utils.copyScreenshotsToProjectFolder(config.buildTool);
        });

        it('Liberty Language Server should initialize', async function() {
            this.timeout(300000);
            logger.testStart('Liberty Language Server should initialize');
            
            try {
                await utils.waitForLanguageServerInit(
                    'Language Support for Liberty',
                    'Initialized Liberty Language server',
                    240
                );
                logger.testComplete('Liberty Language Server initialized successfully');
            } catch (error) {
                logger.testFailed('Liberty Language Server should initialize', error);
                throw error;
            }
        });

        // Test data for parameterized hover tests
        const hoverTestCases = config.hoverTestCases;

        hoverTestCases.forEach(testCase => {
            it(`Hover over ${testCase.element} shows Liberty Language Server documentation`, async function() {
                this.timeout(30000);
                logger.testStart(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
                
                try {
                    const hoverText = await editorUtils.hoverOver(serverXml.getEditor(), testCase.line, testCase.column, testCase.element);
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

        describe('LSP4Jakarta Hover tests in Java file', () => {
            let javaFile: EditorPage; 

            before(async function() {
                this.timeout(60000);
                logger.info('Opening HelloServlet.java file for LSP4Jakarta hover tests');
                
                const javaFilePath = path.resolve(
                    config.getProjectPath(),
                    'src',
                    'main',
                    'java',
                    'test',
                    config.buildTool,
                    'liberty',
                    'web',
                    'app',
                    'HelloServlet.java'
                );
                logger.info(`Java file path: ${javaFilePath}`);
                javaFile = await new EditorPage().openFile(javaFilePath, 'HelloServlet.java');
                
                logger.info('HelloServlet.java file opened and editor obtained');
            });

            it('LSP4Jakarta Language Server should initialize', async function() {
                this.timeout(300000);
                logger.testStart('LSP4Jakarta Language Server should initialize');
                
                try {
                    await utils.waitForLanguageServerInit(
                        'Language Support for Jakarta EE',
                        'Initializing Jakarta EE server',
                        240
                    );
                    logger.testComplete('LSP4Jakarta Language Server initialized successfully');
                } catch (error) {
                    logger.testFailed('LSP4Jakarta Language Server should initialize', error);
                    throw error;
                }
            });

            // Test data for LSP4Jakarta hover tests
            const jakartaHoverTestCases = [
                { element: '@WebServlet annotation', line: 23, column: 2, expectedDoc: 'Annotation used to declare a servlet.' },
                { element: 'HttpServlet class', line: 24, column: 35, expectedDoc: 'Provides an abstract class to be subclassed to create an HTTP servlet suitable for a Web site.' },
                { element: 'HttpServletRequest type', line: 30, column: 35, expectedDoc: 'Extends the javax.servlet.ServletRequest interface to provide request information for HTTP servlets.' },
                { element: 'HttpServletResponse type', line: 30, column: 70, expectedDoc: 'Extends the ServletResponse interface to provide HTTP-specific functionality in sending a response.' }
            ];

            jakartaHoverTestCases.forEach(testCase => {
                it(`Hover over ${testCase.element} shows LSP4Jakarta documentation`, async function() {
                    this.timeout(30000);
                    logger.testStart(`Hover over ${testCase.element} shows LSP4Jakarta documentation`);
                    
                    try {
                        const hoverText = await editorUtils.hoverOver(javaFile.getEditor(), testCase.line, testCase.column, testCase.element);
                        
                        expect(hoverText).to.not.be.empty;
                        logger.stepSuccess(3, `Hover widget displayed with LSP4Jakarta content for ${testCase.element}`);

                        logger.step(4, 'Verifying hover contains expected documentation');
                        expect(hoverText).to.include(testCase.expectedDoc);
                        logger.stepSuccess(4, `Hover text contains expected documentation: "${testCase.expectedDoc}"`);

                        logger.testComplete(`Hover over ${testCase.element} shows LSP4Jakarta documentation`);
                    } catch (error) {
                        logger.testFailed(`Hover over ${testCase.element} shows LSP4Jakarta documentation`, error);
                        throw error;
                    }
                });
            });
        });

    });
} 



