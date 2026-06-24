/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { expect } from 'chai';
import { By, EditorView, TextEditor, VSBrowser, Workbench, BottomBarPanel, MarkerType, Key } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { logger } from './utils/testLogger';
import * as path from 'path';

describe('Liberty Config Language Server Tests for Maven Project', function () {
    let editorView: EditorView;
    let editor: TextEditor;
    let wait: any;
    let driver: any;
    let originalContent: string;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        wait = utils.getWaitHelper();

        // Open workspace
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        editorView = new EditorView();

        // Open the real server.xml — LCLS only activates on files under a recognised
        // Liberty config directory name ('config'), so we edit this file directly and
        // restore its content in afterEach.
        const serverXmlPath = path.resolve(
            utils.getMvnProjectPath(),
            'src', 'main', 'liberty', 'config', 'server.xml'
        );

        await VSBrowser.instance.openResources(serverXmlPath, async () => {
            await wait.sleep(3000);
        });

        editor = await editorView.openEditor('server.xml') as TextEditor;
        originalContent = await editor.getText();
        logger.info('Server.xml file opened and original content saved');
    });

    afterEach(async function() {
        this.timeout(15000);
        if (this.currentTest?.state === 'failed') {
            await driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest?.title}`);
        }

        // Close the bottom bar and re-focus the editor before restoring content.
        // Any test that opens the Output or Problems panel shifts VS Code focus,
        // making subsequent editor operations unreliable.
        await new BottomBarPanel().toggle(false);
        editor = await editorView.openEditor('server.xml') as TextEditor;
        // Wait until the editor is truly focused — getText() returning non-empty content
        // confirms the inputArea has keyboard focus and Ctrl+A will land correctly
        await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.length > 0 ? true : undefined;
        }, 10);

        // Restore original content so each test starts from a clean slate
        if (originalContent) {
            await editor.clearText();
            await editor.setText(originalContent);
            await editor.save();
            // Give LCLS time to reanalyse the restored file before the next test.
            // Avoid opening the Problems panel here — doing so steals focus from
            // the editor and poisons the clipboard used by getText().
            await wait.sleep(3000);
            logger.info('Restored original server.xml content');
        }
    });

    after(async function() {
        this.timeout(30000);
        try {
            // Revert any unsaved changes before closing — a dirty editor causes
            // VS Code to show a "save?" dialog which blocks closeAllEditors()
            await new Workbench().executeCommand('revert file');
            await wait.sleep(500);
            await editorView.closeAllEditors();
            logger.info('Closed all editors');
        } catch (error) {
            logger.error('Failed to close editors', error);
        }
        utils.copyScreenshotsToProjectFolder('maven');
    });

    it('Liberty Language Server should initialize', async function() {
        this.timeout(60000);
        logger.testStart('Liberty Language Server should initialize');
        await utils.waitForLanguageServerInit(
            'Language Support for Liberty',
            'Initialized Liberty Language server',
            60
        );
        logger.testComplete('Liberty Language Server initialized successfully');
    });

    // ========================================
    // ISSUE #370: Diagnostic Detection
    // ========================================

    it('Should show diagnostic for invalid feature (#370)', async function() {
        this.timeout(60000);
        logger.testStart('Testing diagnostic for invalid feature');

        // Re-acquire editor handle at test start — afterEach may have left focus
        // on a different panel; openEditor() clicks the tab and returns a live handle
        editor = await editorView.openEditor('server.xml') as TextEditor;

        logger.step(1, 'Finding feature line');
        const lineNumber = await editor.getLineOfText('jsp-2.3');
        logger.stepSuccess(1, `Found feature at line ${lineNumber}`);

        logger.step(2, 'Replacing with invalid feature');
        const currentLine = await editor.getTextAtLine(lineNumber);
        const modifiedLine = currentLine.replace('jsp-2.3', 'jsp-100.0');
        await editor.setTextAtLine(lineNumber, modifiedLine);
        await editor.save();
        logger.stepSuccess(2, 'Changed to invalid feature jsp-100.0');

        logger.step(3, 'Waiting for diagnostic to appear');
        // LCLS produces: ERROR: The feature "jsp-100.0" does not exist. liberty-lemminx(incorrect_feature)
        await wait.forCondition(async () => {
            try {
                const bottomBar = new BottomBarPanel();
                await bottomBar.toggle(true);
                const problemsView = await bottomBar.openProblemsView();
                const markers = await problemsView.getAllVisibleMarkers(MarkerType.Error);
                for (const marker of markers) {
                    const text = await marker.getText();
                    if (text.includes('does not exist')) {
                        logger.stepSuccess(3, `Diagnostic found: ${text}`);
                        return true;
                    }
                }
                return undefined;
            } catch {
                return undefined;
            }
        }, {
            timeout: 45000,
            pollInterval: 2000,
            message: 'Diagnostic did not appear for invalid feature'
        });

        logger.testComplete('Diagnostic detected for invalid feature');
    });

    // ========================================
    // ISSUE #434: Quick Fix Application
    // ========================================

    it('Should apply quick fix for invalid feature (#434)', async function() {
        this.timeout(90000);
        logger.testStart('Testing quick fix for invalid feature');

        editor = await editorView.openEditor('server.xml') as TextEditor;

        logger.step(1, 'Adding invalid feature');
        const lineNumber = await editor.getLineOfText('jsp-2.3');
        const currentLine = await editor.getTextAtLine(lineNumber);
        const modifiedLine = currentLine.replace('jsp-2.3', 'jsp-100.0');
        await editor.setTextAtLine(lineNumber, modifiedLine);
        await editor.save();
        logger.stepSuccess(1, 'Changed to invalid feature');

        logger.step(2, 'Waiting for diagnostic to appear before triggering quick fix');
        await wait.forCondition(async () => {
            try {
                const bottomBar = new BottomBarPanel();
                await bottomBar.toggle(true);
                const problemsView = await bottomBar.openProblemsView();
                const markers = await problemsView.getAllVisibleMarkers(MarkerType.Error);
                for (const marker of markers) {
                    const text = await marker.getText();
                    if (text.includes('does not exist')) {
                        return true;
                    }
                }
                return undefined;
            } catch {
                return undefined;
            }
        }, {
            timeout: 45000,
            pollInterval: 2000,
            message: 'Diagnostic did not appear before attempting quick fix'
        });
        // Close the bottom bar and re-acquire the editor — the Problems panel
        // interaction in step 2 shifts focus off the editor tab
        await new BottomBarPanel().toggle(false);
        editor = await editorView.openEditor('server.xml') as TextEditor;
        await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.length > 0 ? true : undefined;
        }, 10);
        logger.stepSuccess(2, 'Diagnostic confirmed');

        logger.step(3, 'Selecting invalid feature text');
        await editor.selectText('jsp-100.0');
        logger.stepSuccess(3, 'Selected invalid feature');

        logger.step(4, 'Opening quick fix menu and applying fix');
        const modKey = process.platform === 'darwin' ? Key.COMMAND : Key.CONTROL;

        // The quick-fix widget closes between polling iterations, so re-open it each time
        const quickFixApplied = await wait.forCondition(async () => {
            try {
                // Re-select and re-open the menu on every attempt
                await editor.selectText('jsp-100.0');
                await driver.actions().keyDown(modKey).sendKeys('.').keyUp(modKey).perform();
                await wait.sleep(1500);

                const options = await driver.findElements(
                    By.css('.action-widget .action-list-item, .action-widget .monaco-list-row')
                );
                for (const opt of options) {
                    const text = await opt.getText();
                    logger.info(`Quick fix option: ${text}`);
                    // LCLS offers "Replace feature with jsp-2.2" and "Replace feature with jsp-2.3"
                    // Accept either — both are valid replacements for the invalid jsp-100.0
                    if (text.includes('Replace feature with jsp-')) {
                        await driver.executeScript('arguments[0].click();', opt);
                        logger.stepSuccess(4, `Applied quick fix: ${text}`);
                        return true;
                    }
                }
                // Dismiss the menu so re-opening next iteration is clean
                await driver.actions().sendKeys(Key.ESCAPE).perform();
                return undefined;
            } catch {
                return undefined;
            }
        }, {
            timeout: 30000,
            pollInterval: 3000,
            message: 'Quick fix option did not appear'
        });

        expect(quickFixApplied).to.be.true;

        logger.step(5, 'Verifying fix was applied');
        // Wait until the editor reflects the applied fix rather than sleeping blindly
        const updatedContent = await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return !text.includes('jsp-100.0') ? text : undefined;
        }, 15);
        // Either jsp-2.2 or jsp-2.3 is a valid replacement — verify the bad value is gone
        expect(updatedContent).to.match(/<feature>jsp-2\.\d<\/feature>/);
        expect(updatedContent).to.not.include('jsp-100.0');
        logger.stepSuccess(5, 'Quick fix successfully replaced invalid feature');

        logger.testComplete('Quick fix applied successfully');
    });

    // ========================================
    // ISSUE #391: Autocomplete for Features
    // ========================================

    it('Should provide autocomplete for Liberty features (#391)', async function() {
        this.timeout(60000);
        logger.testStart('Testing autocomplete for features');

        editor = await editorView.openEditor('server.xml') as TextEditor;

        // The flow: type a full <feature></feature> tag, place cursor inside it,
        // trigger Ctrl+Space to get the LCLS dropdown of feature names, then select
        // a specific known feature. This matches the toggleContentAssist pattern
        // used in MavenTestLSPRestSnippetAndDiagnostic.ts.
        logger.step(1, 'Finding the closing </featureManager> line as insertion point');
        const featureManagerEndLine = await editor.getLineOfText('</featureManager>');
        logger.stepSuccess(1, `Found </featureManager> at line ${featureManagerEndLine}`);

        logger.step(2, 'Typing empty feature tag on a new line');
        await editor.typeTextAt(featureManagerEndLine, 1, '        <feature></feature>');
        logger.stepSuccess(2, 'Typed empty feature tag');

        // Position cursor inside the empty tag — between > and <
        // The tag starts at column 9: "        <feature>" is 18 chars, so cursor goes at col 18
        logger.step(3, 'Positioning cursor inside the empty feature tag');
        await editor.setCursor(featureManagerEndLine, 18);
        logger.stepSuccess(3, 'Cursor positioned inside feature tag');

        logger.step(4, 'Opening content assist for feature value');
        const assist = await editor.toggleContentAssist(true);
        logger.stepSuccess(4, 'Content assist opened');

        logger.step(5, 'Selecting "jsp-2.3" from the feature completion list');
        await assist!.select('jsp-2.3');
        await editor.toggleContentAssist(false);
        logger.stepSuccess(5, 'Selected jsp-2.3 from completion list');

        logger.step(6, 'Verifying feature value was inserted');
        // Poll until the editor reflects the completion rather than sleeping blindly
        const updatedContent = await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.includes('<feature>jsp-2.3</feature>') ? text : undefined;
        }, 10);
        expect(updatedContent).to.include('<feature>jsp-2.3</feature>');
        logger.stepSuccess(6, 'Feature autocomplete correctly inserted jsp-2.3');

        logger.testComplete('Autocomplete for features worked');
    });

    // ========================================
    // ISSUE #392: Autocomplete for Config Stanzas
    // ========================================

    describe('Autocomplete for Configuration Stanzas (#392)', () => {

        it('Should autocomplete <logging> stanza', async function() {
            this.timeout(60000);
            logger.testStart('Testing autocomplete for logging stanza');

            editor = await editorView.openEditor('server.xml') as TextEditor;

            // The flow: type a partial element name at server level, trigger Ctrl+Space,
            // select from the dropdown. LCLS inserts <logging></logging>.
            // Uses 'logging' — available with only jsp-2.3, confirmed locally.
            logger.step(1, 'Finding </featureManager> as insertion point');
            const lineNumber = await editor.getLineOfText('</featureManager>');
            logger.stepSuccess(1, `Found featureManager end at line ${lineNumber}`);

            logger.step(2, 'Typing partial stanza name on a new line');
            await editor.typeTextAt(lineNumber + 1, 1, '    <loggi');
            logger.stepSuccess(2, 'Typed partial stanza name');

            logger.step(3, 'Opening content assist for stanza completion');
            const assist = await utils.waitForCondition(async () => {
                return await editor.toggleContentAssist(true) ?? undefined;
            }, 10);
            // Wait until the target item is present and interactable in the list
            await utils.waitForCondition(async () => {
                try {
                    const item = await assist.getItem('logging');
                    return item ? true : undefined;
                } catch {
                    return undefined;
                }
            }, 10);
            logger.stepSuccess(3, 'Content assist opened');

            logger.step(4, 'Selecting "logging" from the completion list');
            await assist.select('logging');
            await editor.toggleContentAssist(false);
            logger.stepSuccess(4, 'Selected logging from completion list');

            logger.step(5, 'Verifying logging stanza was inserted');
            // Poll until the editor reflects the completion rather than sleeping blindly
            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes('<logging>') ? text : undefined;
            }, 10);
            // LCLS inserts <logging></logging> (confirmed locally)
            expect(updatedContent).to.include('<logging>');
            expect(updatedContent).to.include('</logging>');
            logger.stepSuccess(5, 'Logging stanza autocomplete worked');

            logger.testComplete('Logging stanza autocomplete worked');
        });

        it('Should autocomplete <application> stanza', async function() {
            this.timeout(60000);
            logger.testStart('Testing autocomplete for application stanza');

            editor = await editorView.openEditor('server.xml') as TextEditor;

            logger.step(1, 'Finding </featureManager> as insertion point');
            const lineNumber = await editor.getLineOfText('</featureManager>');
            logger.stepSuccess(1, `Found featureManager end at line ${lineNumber}`);

            logger.step(2, 'Typing partial stanza name on a new line');
            await editor.typeTextAt(lineNumber + 1, 1, '    <applicati');
            logger.stepSuccess(2, 'Typed partial stanza name');

            logger.step(3, 'Opening content assist for stanza completion');
            const assist = await utils.waitForCondition(async () => {
                return await editor.toggleContentAssist(true) ?? undefined;
            }, 10);
            // Wait until the target item is present and interactable in the list
            await utils.waitForCondition(async () => {
                try {
                    const item = await assist.getItem('application');
                    return item ? true : undefined;
                } catch {
                    return undefined;
                }
            }, 10);
            logger.stepSuccess(3, 'Content assist opened');

            logger.step(4, 'Selecting "application" from the completion list');
            await assist.select('application');
            await editor.toggleContentAssist(false);
            logger.stepSuccess(4, 'Selected application from completion list');

            logger.step(5, 'Verifying application stanza was inserted');
            // Poll until the editor reflects the completion rather than sleeping blindly
            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return /<application[>\s]/.test(text) ? text : undefined;
            }, 10);
            // Match <application> or <application > but not <webApplication> or <applicationManager>
            expect(updatedContent).to.match(/<application[>\s]/);
            expect(updatedContent).to.include('</application>');
            logger.stepSuccess(5, 'Application stanza autocomplete worked');

            logger.testComplete('Application stanza autocomplete worked');
        });
    });
});
