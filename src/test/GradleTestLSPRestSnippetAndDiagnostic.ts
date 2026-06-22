
/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { EditorView, TextEditor, VSBrowser, Workbench, WebDriver, BottomBarPanel, MarkerType, Key, By } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as path from 'path';
import { ProblemsPage } from './pages/ProblemsPage';
import { EditorPage } from './pages/EditorPage';
import { CodeAssistPage } from './pages/CodeAssistPage';
import { QuickFixPage } from './pages/QuickFixPage';

describe('Rest Class Snippet Test for Gradle Project', () => {
    let editorPage: EditorPage;
    let wait: any;
    let driver: WebDriver;

    const testRestPath = path.resolve(
                    utils.getGradleProjectPath(),
                    'src', 'main', 'java', 'test', 'gradle', 'liberty', 'web', 'app',
                    'TestRest.java'
                );

    before(async function() {
        this.timeout(60000);
        logger.info('Setting up rest_class snippet test');

        driver = VSBrowser.instance.driver;
        wait = utils.getWaitHelper();
        // Open folder, wait for workbench
        await VSBrowser.instance.openResources(utils.getGradleProjectPath());
        await VSBrowser.instance.waitForWorkbench();

        // Open file and bind page object to editor
        editorPage = await new EditorPage().openFile(testRestPath, 'TestRest.java');

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
        this.timeout(15000);
        try {
            if (editorPage) {
                // Select all text first, then clear
                const currentText = await editorPage.getEditor().getText();
                try {
                    await editorPage.getEditor().selectText(currentText);
                    await wait.sleep(300);
                } catch (selectError) {
                    // selectText may fail but setText still works
                }
                
                await editorPage.clear();
                logger.info('Reset TestRest.java to empty after test');
            }
        } catch (error) {
            logger.error('Failed to reset TestRest.java', error);
        }
        
        try {
            await new EditorView().closeAllEditors();
            await wait.sleep(500);
            logger.info('Closed all editors after test suite');
        } catch (error) {
            logger.error('Failed to close editors in after hook', error);
        }
        
        utils.copyScreenshotsToProjectFolder('gradle');
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

        it('rest_class snippet populates correct REST class', async function ()  {
            this.timeout(275000);
            logger.testStart('rest_class snippet inserts correct REST class');

            // at the top of the rest_class snippet test, before positioning the cursor
            await editorPage.clear();
            await wait.sleep(1500);   // let any auto-stub settle, then confirm
            const check = await editorPage.getEditor().getText();
            logger.info('Buffer before snippet: ' + JSON.stringify(check));
            
            try {
                logger.step(1, 'Positioning cursor for snippet insertion');
                // Position cursor at end of file
                await editorPage.moveCursorToEnd();
                
                // type rest and insert snippet
                logger.step(2, 'Opening content assist');
                const codeAssist = new CodeAssistPage();
                await codeAssist.insertSnippet(editorPage, 'rest', 'rest_class');
                logger.stepSuccess(2, 'Snippet inserted');
                await wait.sleep(1000); // Give time for snippet to fully expand
                
                logger.step(3, 'Verifying snippet insertion');
                const codeInsertion = await editorPage.getEditor().getText();
                expect(codeInsertion).to.include('@GET')
                expect(codeInsertion).to.include('methodname');
                logger.stepSuccess(3, 'Snippet rest_class was inserted correctly');
                
                // Save the file so the content persists for the next test
                await editorPage.getEditor().save();
                await wait.sleep(500);
                
                logger.testComplete('rest_class snippet inserts correct REST class');
            } catch (error) {
                logger.testFailed('rest_class snippet inserts correct REST class', error);
                throw error;
            }
        });
        it('Show that private @GET method displays diagnostic and quick fix removes it ', async function () {
            this.timeout(90000);
            logger.testStart('Diagnostic for a private @GET method and quick fix clears it');
            try {
                // Find the method with @GET and change it to private
                await editorPage.replaceTextWithinLineContaining('methodname', 'public' , 'private');

                // Save file and wait for reanalysis
                await editorPage.getEditor().save();
                await wait.sleep(500);

                // Check that the diagnostic is there
                let problems = new ProblemsPage();
                const found = await problems.hasDiagnostic('Only public methods can be exposed as resource methods.');
                expect(found).to.be.true;
                logger.testComplete('Diagnostic shows for private @GET method');

                // Quick fix implementation to get rid of diagnostic
                // Re-find line and place cursor on "methodname()"
                const buffer = await editorPage.getEditor().getText();
                logger.info('Buffer before quick fix: ' + JSON.stringify(buffer));

               await new QuickFixPage().applyFix(editorPage, 'methodname', 'make method public');
               await wait.sleep(3000);
               await editorPage.getEditor().save();
               await wait.sleep(5000);

               const after = await editorPage.getEditor().getText();
               expect(after).to.include('public String methodname');
               expect(await problems.hasDiagnostic('Only public methods can be exposed as resource methods.')).to.be.false;

            } catch (error) {
                logger.testFailed('Diagnostic/quick-fix test flow failed', error);
                throw error;
            }
                
        });
 });

