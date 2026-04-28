/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { EditorView, TextEditor, VSBrowser, Workbench } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as path from 'path';

describe('LSP Hover tests for Maven Project', () => {
    let editorView: EditorView;
    let editor: TextEditor;
    let wait: any;

    before(async function() {
        this.timeout(60000);
        logger.info('Setting up Maven LSP Hover tests');
        
        // Wait for workbench to be ready
        await VSBrowser.instance.waitForWorkbench();
        editorView = new EditorView();
        wait = utils.getWaitHelper();

        // Open server.xml file once for all tests
        logger.info('Opening server.xml file for all tests');
        const serverXmlPath = path.resolve(
            utils.getMvnProjectPath(),
            'src',
            'main',
            'liberty',
            'config',
            'server.xml'
        );
        logger.info(`Server.xml path: ${serverXmlPath}`);

        await VSBrowser.instance.openResources(serverXmlPath, async () => {
            await wait.sleep(3000); // Allow time for file to load
        });
        
        editor = await editorView.openEditor('server.xml') as TextEditor;
        logger.info('Server.xml file opened and editor obtained');
    });

    afterEach(async function() {
        // Take screenshot on failure but don't close editor
        if (this.currentTest?.state === 'failed') {
            const driver = VSBrowser.instance.driver;
            const screenshot = await driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
        }
    });

    after(async function() {
        this.timeout(10000); // Increase timeout for cleanup operations
        // Close editor after all tests complete
        try {
            await editorView.closeAllEditors();
            logger.info('Closed all editors after test suite');
        } catch (error) {
            logger.error('Failed to close editors in after hook', error);
        }
        
        utils.copyScreenshotsToProjectFolder('maven');
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

    // Test data for parameterized hover tests
    const hoverTestCases = [
        { element: 'httpEndpoint element', line: 19, column: 10 },
        { element: 'feature element', line: 16, column: 16 },
        { element: 'featureManager element', line: 15, column: 10 },
        { element: 'webApplication element', line: 21, column: 10 },
        { element: 'jsp-2.3 feature value', line: 16, column: 22 },
        { element: 'httpPort attribute', line: 19, column: 33 }
    ];

    hoverTestCases.forEach(testCase => {
        it(`Hover over ${testCase.element} shows Liberty Language Server documentation`, async function() {
            this.timeout(30000);
            logger.testStart(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
            
            try {
                logger.step(1, `Setting cursor position on ${testCase.element}`);
                await editor.setCursor(testCase.line, testCase.column);
                logger.stepSuccess(1, `Cursor positioned on ${testCase.element} at line ${testCase.line}`);

                logger.step(2, 'Triggering hover via command palette');
                await new Workbench().executeCommand('editor.action.showHover');
                logger.stepSuccess(2, 'Hover command executed');

                logger.step(3, 'Verifying hover widget appears with Liberty Language Server content');
                const driver = VSBrowser.instance.driver;
                const hoverVisible = await utils.waitForHoverWidget(driver, testCase.element, 15000);
                
                expect(hoverVisible).to.be.true;
                logger.stepSuccess(3, `Hover widget displayed with Liberty Language Server content for ${testCase.element}`);

                logger.testComplete(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
            } catch (error) {
                logger.testFailed(`Hover over ${testCase.element} shows Liberty Language Server documentation`, error);
                throw error;
            }
        });
    });

    describe('LSP4Jakarta Hover tests in Java file', () => {
        let javaEditor: TextEditor;

        before(async function() {
            this.timeout(60000);
            logger.info('Opening HelloServlet.java file for LSP4Jakarta hover tests');
            
            const javaFilePath = path.resolve(
                utils.getMvnProjectPath(),
                'src',
                'main',
                'java',
                'test',
                'maven',
                'liberty',
                'web',
                'app',
                'HelloServlet.java'
            );
            logger.info(`Java file path: ${javaFilePath}`);

            await VSBrowser.instance.openResources(javaFilePath, async () => {
                await wait.sleep(3000); // Allow time for file to load
            });
            
            javaEditor = await editorView.openEditor('HelloServlet.java') as TextEditor;
            logger.info('HelloServlet.java file opened and editor obtained');
        });

        it('LSP4Jakarta Language Server should initialize', async function() {
            this.timeout(60000);
            logger.testStart('LSP4Jakarta Language Server should initialize');
            
            try {
                await utils.waitForLanguageServerInit(
                    'Language Support for Jakarta EE',
                    'Initializing Jakarta EE server',
                    60
                );
                logger.testComplete('LSP4Jakarta Language Server initialized successfully');
            } catch (error) {
                logger.testFailed('LSP4Jakarta Language Server should initialize', error);
                throw error;
            }
        });

        // Test data for LSP4Jakarta hover tests
        const jakartaHoverTestCases = [
            { element: '@WebServlet annotation', line: 23, column: 2 },
            { element: 'HttpServlet class', line: 24, column: 35 },
            { element: 'HttpServletRequest type', line: 30, column: 35 },
            { element: 'HttpServletResponse type', line: 30, column: 70 }
        ];

        jakartaHoverTestCases.forEach(testCase => {
            it(`Hover over ${testCase.element} shows LSP4Jakarta documentation`, async function() {
                this.timeout(30000);
                logger.testStart(`Hover over ${testCase.element} shows LSP4Jakarta documentation`);
                
                try {
                    logger.step(1, `Setting cursor position on ${testCase.element}`);
                    await javaEditor.setCursor(testCase.line, testCase.column);
                    logger.stepSuccess(1, `Cursor positioned on ${testCase.element} at line ${testCase.line}`);

                    logger.step(2, 'Triggering hover via command palette');
                    await new Workbench().executeCommand('editor.action.showHover');
                    logger.stepSuccess(2, 'Hover command executed');

                    logger.step(3, 'Verifying hover widget appears with LSP4Jakarta content');
                    const driver = VSBrowser.instance.driver;
                    const hoverVisible = await utils.waitForHoverWidget(driver, testCase.element, 15000);
                    
                    expect(hoverVisible).to.be.true;
                    logger.stepSuccess(3, `Hover widget displayed with LSP4Jakarta content for ${testCase.element}`);

                    logger.testComplete(`Hover over ${testCase.element} shows LSP4Jakarta documentation`);
                } catch (error) {
                    logger.testFailed(`Hover over ${testCase.element} shows LSP4Jakarta documentation`, error);
                    throw error;
                }
            });
        });
    });

});

// Made with Bob
