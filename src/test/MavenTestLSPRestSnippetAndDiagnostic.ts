
/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { EditorView, TextEditor, VSBrowser, Workbench, WebDriver, BottomBarPanel, MarkerType, Key, By } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as path from 'path';

describe('Rest Class Snippet Test for Maven Project', () => {
    let editorView: EditorView;
    let javaEditor: TextEditor;
    let wait: any;
    let driver: WebDriver;

    const testRestPath = path.resolve(
                    utils.getMvnProjectPath(),
                    'src', 'main', 'java', 'test', 'maven', 'liberty', 'web', 'app',
                    'TestRest.java'
                );

    before(async function() {
        this.timeout(60000);
        logger.info('Setting up rest_class snippet test');

        driver = VSBrowser.instance.driver;
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        
        // Wait for workbench to be ready
        await VSBrowser.instance.waitForWorkbench();
        editorView = new EditorView();
        wait = utils.getWaitHelper();

        // Open the file
        await VSBrowser.instance.openResources(testRestPath, async () => {
            await wait.sleep(3000); 
        });
        javaEditor = await editorView.openEditor('TestRest.java') as TextEditor;
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
            if(javaEditor){
                await javaEditor.setText(''); 
                await javaEditor.save(); 
                logger.info('Reset TestRest.java to empty after test')

            } 
        } catch (error){
                logger.error('Failed to reset TestRest.java ', error);
            }
        try {
            await editorView.closeAllEditors();
            logger.info('Closed all editors after test suite');
        } catch (error) {
            logger.error('Failed to close editors in after hook', error);
        }
        
        utils.copyScreenshotsToProjectFolder('maven');
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
            await javaEditor.setText('');
            await javaEditor.save();
            await wait.sleep(1500);   // let any auto-stub settle, then confirm
            const check = await javaEditor.getText();
            logger.info('Buffer before snippet: ' + JSON.stringify(check));
            
            try {
                logger.step(1, 'Positioning cursor for snippet insertion');
                // Position cursor at end of file
                const lastLine = (await javaEditor.getText()).split('\n').length;
                await javaEditor.setCursor(lastLine - 1, 1);
                
                logger.step(2, 'Typing "rest" to trigger snippet');
                await javaEditor.typeText('rest');
                logger.stepSuccess(2, 'Typed "rest"');
                
                logger.step(3, 'Opening content assist');
                const assist = await javaEditor.toggleContentAssist(true);
                if (assist) {
                    logger.step(4,'Selecting rest_class snippet');
                    await assist.select('rest_class');
                    await new Promise(res => setTimeout(res, 600)); // 300–800ms
                    logger.stepSuccess(4, 'rest_class snippet selected');
                }
                await javaEditor.toggleContentAssist(false);
                
                logger.step(5, 'Verifying snippet insertion');
                const codeInsertion = await javaEditor.getText();
                logger.info('Inserted code snapshot: ' + codeInsertion);
                expect(codeInsertion).to.include('@GET')
                expect(codeInsertion).to.include('methodname');
                logger.stepSuccess(5, 'Snippet rest_class was inserted correctly');
                
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
                let lineNum = await javaEditor.getLineOfText('methodname');
                if (lineNum < 1) throw new Error('Could not find the methodname line');
                const oldLine = await javaEditor.getTextAtLine(lineNum);
                const newLine = oldLine.replace("public", "private");
                await javaEditor.setTextAtLine(lineNum, newLine); 

                // Save file and wait for reanalysis 
                await javaEditor.save();
                await wait.sleep(500); 

                // Open problems view
                const bottomBar = new BottomBarPanel();
                await bottomBar.toggle(true);
                let problemsView = await bottomBar.openProblemsView();
                let markers = await problemsView.getAllVisibleMarkers(MarkerType.Any); 
                
                // Check if the marker is present
                let found = false;
                for (const marker of markers) {
                    const text = await marker.getText();
                    // Check if text contains your diagnostic message
                    if(text.includes('Only public methods can be exposed as resource methods.')){
                        found = true;
                        break;
                    }
                }
                expect(found).to.be.true; 
                logger.testComplete('Diagnostic shows for private @GET method');

                // Quick fix implementation to get rid of diagnostic
                // Re-find line and place cursor on "methodname()"
                const buffer = await javaEditor.getText();
                logger.info('Buffer before quick fix: ' + JSON.stringify(buffer));

                // Get column on the method name 
                await javaEditor.selectText('methodname');
                await wait.sleep(300); 

                // Open the quick-fix menu with Cmd+. (Mac) / Ctrl+. (Linux/Windows)
                const modKey = process.platform === 'darwin' ? Key.COMMAND : Key.CONTROL;
                await driver.actions().keyDown(modKey).sendKeys('.').keyUp(modKey).perform();
                await wait.sleep(2000);

                // Click on the option to make the method public within the quick-fixes options
                const options = await driver.findElements(By.css('.action-widget .action-list-item, .action-widget .monaco-list-row'));
                let clicked = false;
                for (const opt of options) {
                    const text = await opt.getText();
                    logger.info('OPTION: ' + JSON.stringify(text));
                    if (text.toLowerCase().includes('make method public')) {
                        await driver.executeScript('arguments[0].click();', opt);
                        clicked = true;
                        break;
                    }
                }
                if (!clicked) {
                    await driver.actions().sendKeys(Key.ESCAPE).perform();  // close menu cleanly
                    throw new Error('No "make public" quick fix was offered — see OPTION logs above');
                }

                await wait.sleep(3000);
                await javaEditor.save();
                await wait.sleep(5000);

                // Check quick fix was implemented at correct line number 
                const after = await javaEditor.getText();
                logger.info('Buffer after quick fix: ' + JSON.stringify(after));
                expect(after).to.include('public String methodname');

                problemsView = await bottomBar.openProblemsView();
                markers = await problemsView.getAllVisibleMarkers(MarkerType.Any); 

                // Check if the marker is present
                let stillPresent = false;
                for (const marker of markers) {
                    const text = await marker.getText();
                    // Check if text contains diagnostic message
                    if(text.includes('Only public methods can be exposed as resource methods.')){
                        stillPresent = true;
                        break;
                    }
                }
                expect(stillPresent).to.be.false; 
                logger.testComplete('Diagnostic no longer shows for public @GET method as expected');

            } catch (error) {
                logger.testFailed('Diagnostic/quick-fix test flow failed', error);
                throw error; 
            } 
                
        });
 });

