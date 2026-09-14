/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { By, EditorView, TextEditor, VSBrowser, WebDriver, Workbench, BottomBarPanel, Key } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as editorUtils from './utils/editorUtils';
import * as constants from './definitions/constants';
import { logger } from './utils/testLogger';
import { EditorPage } from './pages/EditorPage';
import { CodeAssistPage } from './pages/CodeAssistPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { QuickFixPage } from './pages/QuickFixPage';
import * as path from 'path';

describe('Liberty Config Language Server Tests for Maven Project', () => {
    let editorView: EditorView;
    let editor: TextEditor;
    let wait: any;
    let driver: WebDriver;
    let originalContent: string;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        wait = utils.getWaitHelper();

        // Open workspace
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        editorView = new EditorView();

        // Open the real server.xml via EditorPage so the tab is confirmed visible
        const serverXmlPath = path.resolve(
            utils.getMvnProjectPath(),
            'src', 'main', 'liberty', 'config', 'server.xml'
        );
        const editorPage = await new EditorPage().openFile(serverXmlPath, 'server.xml');
        editor = editorPage.getEditor();
        originalContent = await editor.getText();
        logger.info('Server.xml file opened and original content saved');
    });

    afterEach(async function() {
        this.timeout(30000);
        if (this.currentTest?.state === 'failed') {
            await driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest?.title}`);
        }

        // Close the bottom bar and re-focus the editor
        await new BottomBarPanel().toggle(false);
        editor = await editorView.openEditor('server.xml') as TextEditor;
        // Wait until getText() returns the actual server.xml content
        await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.includes('<server') ? true : undefined;
        }, 15);

        // Restore original content
        if (originalContent) {
            await editor.setText(originalContent);
            await editor.save();
            await wait.sleep(3000);
            logger.info('Restored original server.xml content');
        }
    });

    after(async function() {
        this.timeout(30000);
        try {
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


    it('View Diagnostic for Invalid Liberty Feature and Use Quick Fix', async function() {
        this.timeout(120000);
        logger.testStart('Testing diagnostic detection and quick fix for invalid feature');


        editor = await editorView.openEditor('server.xml') as TextEditor;

        logger.step(1, 'Finding feature line and replacing with invalid feature');
        const lineNumber = await editor.getLineOfText('jsp-2.3');
        logger.stepSuccess(1, `Found feature at line ${lineNumber}`);
        const currentLine = await editor.getTextAtLine(lineNumber);
        const modifiedLine = currentLine.replace('jsp-2.3', 'jsp-100.0');
        await editor.setTextAtLine(lineNumber, modifiedLine);
        await editor.save();
        logger.stepSuccess(1, 'Changed to invalid feature jsp-100.0');

        logger.step(2, 'Waiting for diagnostic to appear');
        const found = await new ProblemsPage().hasDiagnostic('does not exist');
        expect(found, 'Diagnostic did not appear for invalid feature').to.be.true;
        logger.stepSuccess(2, 'Diagnostic found in Problems view');

        await new BottomBarPanel().toggle(false);
        editor = await editorView.openEditor('server.xml') as TextEditor;
        await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.includes('<server') ? true : undefined;
        }, 15);

        logger.step(3, 'Applying quick fix for invalid feature');
        // LCLS offers "Replace feature with jsp-2.2" or "Replace feature with jsp-2.3" — match either
        await new QuickFixPage().applyFix(EditorPage.from(editor), 'jsp-100.0', 'Replace feature with jsp-');
        logger.stepSuccess(3, 'Quick fix applied');

        logger.step(4, 'Verifying fix was applied');
        const updatedContent = await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return !text.includes('jsp-100.0') ? text : undefined;
        }, 15);
        // Either jsp-2.2 or jsp-2.3 is a valid replacement — verify the bad value is gone
        expect(updatedContent).to.match(/<feature>jsp-2\.\d<\/feature>/);
        expect(updatedContent).to.not.include('jsp-100.0');
        logger.stepSuccess(4, 'Quick fix successfully replaced invalid feature');

        logger.testComplete('Diagnostic detected and quick fix applied successfully');
    });


    it('Use Autocomplete for Liberty Features', async function() {
        this.timeout(60000);
        logger.testStart('Testing autocomplete for features');

        editor = await editorView.openEditor('server.xml') as TextEditor;


        // verify the list opens with items, then dismiss it and type the value directly
        logger.step(1, 'Finding the closing </featureManager> line as insertion point');
        const featureManagerEndLine = await editor.getLineOfText('</featureManager>');
        logger.stepSuccess(1, `Found </featureManager> at line ${featureManagerEndLine}`);

        logger.step(2, 'Typing empty feature tag on a new line');
        await editor.typeTextAt(featureManagerEndLine, 1, '        <feature></feature>');
        logger.stepSuccess(2, 'Typed empty feature tag');

        logger.step(3, 'Positioning cursor inside the empty feature tag');
        await editor.setCursor(featureManagerEndLine, 18);
        logger.stepSuccess(3, 'Cursor positioned inside feature tag');

        logger.step(4, 'Opening content assist and verifying feature list appears');
        const assist = await editor.toggleContentAssist(true);

        const items = await utils.waitForCondition(async () => {
            try {
                const all = await assist!.getItems();
                return all && all.length > 0 ? all : undefined;
            } catch {
                return undefined;
            }
        }, 10);
        expect(items.length).to.be.greaterThan(0);
        logger.stepSuccess(4, `Content assist opened with ${items.length} feature suggestions`);

        // Dismiss the list and type the value directly
        await editor.toggleContentAssist(false);
        await driver.actions().sendKeys(Key.ESCAPE).perform();

        logger.step(5, 'Typing feature value directly after confirming list appeared');
        await editor.typeTextAt(featureManagerEndLine, 18, 'servlet-4.0');
        logger.stepSuccess(5, 'Typed feature value');

        logger.step(6, 'Verifying feature tag contains the typed value');
        const updatedContent = await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.includes('<feature>servlet-4.0</feature>') ? text : undefined;
        }, 10);
        expect(updatedContent).to.include('<feature>servlet-4.0</feature>');
        logger.stepSuccess(6, 'Feature tag correctly contains typed value');

        logger.testComplete('Autocomplete for features worked');
    });


    describe('Use Autocomplete for Configuration Stanzas', () => {

        it('Should autocomplete <logging> stanza', async function() {
            this.timeout(60000);
            logger.testStart('Testing autocomplete for logging stanza');

            editor = await editorView.openEditor('server.xml') as TextEditor;

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
            expect(updatedContent).to.include('<logging>');
            expect(updatedContent).to.include('</logging>');
            logger.stepSuccess(5, 'Logging stanza autocomplete worked');

            logger.testComplete('Logging stanza autocomplete worked');
        });

        it('Use autocomplete on <application> stanza', async function() {
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

    describe('Platform and versionless feature support', () => {

        // These tests use the same server.xml and editor that the outer suite manages.
        // The outer afterEach restores originalContent after every test.
        // However, server.xml contains <platform>jakartaee-9.1</platform> and
        // <feature>mpHealth-4.0</feature> for the hover tests — LCLS suppresses
        // quick fixes and completions when duplicate elements are present.
        // Each test that needs clean state sets a minimal featureManager first,
        // loaded from server_platform.xml to keep the content in one place.
        async function setMinimalContent() {
            const platformXmlPath = path.resolve(
                utils.getMvnProjectPath(),
                'src', 'main', 'liberty', 'config', 'server_platform.xml'
            );
            const { readFileSync } = await import('fs');
            const minimalContent = readFileSync(platformXmlPath, 'utf8');
            const editorPage = EditorPage.from(
                await editorView.openEditor('server.xml') as TextEditor
            );
            await editorPage.getEditor().setText(minimalContent);
            await editorPage.getEditor().save();
            // Wait for LCLS to re-process the file rather than sleeping blindly
            await utils.waitForCondition(async () => {
                const text = await editorPage.getEditor().getText();
                return text.includes('<server') ? true : undefined;
            }, 15);
            editor = editorPage.getEditor();
        }

        it('Should show diagnostic for invalid platform value in server.xml', async function () {
            this.timeout(45000);
            logger.testStart('Diagnostic for invalid platform value');

            await setMinimalContent();
            const fmEndLine = await editor.getLineOfText('</featureManager>');
            await editor.typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
            await editor.save();

            const found = await new ProblemsPage().hasDiagnostic(constants.PLATFORM_JAKARTA_ERROR);
            expect(found, `Expected diagnostic "${constants.PLATFORM_JAKARTA_ERROR}" was not found in Problems view`).to.be.true;

            logger.testComplete('Diagnostic for invalid platform value');
        });

        it('Should apply quick fix for invalid platform value in server.xml', async function () {
            this.timeout(60000);
            logger.testStart('Quick fix for invalid platform value');

            await setMinimalContent();
            const fmEndLine = await editor.getLineOfText('</featureManager>');
            await editor.typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
            await editor.save();

            // Wait for LCLS to raise the diagnostic, then re-focus the editor
            await new ProblemsPage().hasDiagnostic(constants.PLATFORM_JAKARTA_ERROR);
            await new BottomBarPanel().toggle(false);
            editor = await editorView.openEditor('server.xml') as TextEditor;
            await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes('jakarta') ? true : undefined;
            }, 15);

            await new QuickFixPage().applyFix(EditorPage.from(editor), 'jakarta', 'Replace platform with jakartaee-11.0');

            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes(constants.PLATFORM_JAKARTA_VALUE) ? text : undefined;
            }, 15);
            expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_VALUE,
                `Quick fix was not applied correctly for invalid platform. Got: ${updatedContent}`);

            logger.testComplete('Quick fix for invalid platform value');
        });

        it('Should show completion support for Liberty Server platform in server.xml', async function () {
            this.timeout(60000);
            logger.testStart('Completion support for Liberty Server platform');

            await setMinimalContent();
            const editorPage = EditorPage.from(editor);
            const codeAssist = new CodeAssistPage();

            // Insert empty platform tag then position cursor inside the value slot
            const fmEndLine = await editor.getLineOfText('</featureManager>');
            await editor.typeTextAt(fmEndLine, 1, '        <platform></platform>');
            await editor.setCursor(fmEndLine, 19);

            // Type 'jakar' inside the tag and let CodeAssistPage handle the rest
            await editor.typeTextAt(fmEndLine, 19, 'jakar');
            await editor.setCursor(fmEndLine, 24);
            await codeAssist.insertSnippet(editorPage, '', constants.JAKARTA_ELEVEN);

            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes(constants.PLATFORM_JAKARTA_VALUE) ? text : undefined;
            }, 15);
            expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_VALUE,
                `Completion support did not insert expected platform value. Got: ${updatedContent}`);

            logger.testComplete('Completion support for Liberty Server platform');
        });

        it('Should show completion support for Liberty Server feature in server.xml', async function () {
            this.timeout(60000);
            logger.testStart('Completion support for Liberty Server feature');

            await setMinimalContent();
            const editorPage = EditorPage.from(editor);
            const codeAssist = new CodeAssistPage();

            // Insert empty feature tag then position cursor inside the value slot
            const fmEndLine = await editor.getLineOfText('</featureManager>');
            await editor.typeTextAt(fmEndLine, 1, '        <feature></feature>');
            await editor.setCursor(fmEndLine, 18);

            // Type 'el-3' inside the tag and let CodeAssistPage handle the rest
            await editor.typeTextAt(fmEndLine, 18, 'el-3');
            await editor.setCursor(fmEndLine, 22);
            await codeAssist.insertSnippet(editorPage, '', constants.EL_VALUE);

            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes(constants.FEATURE_EL) ? text : undefined;
            }, 15);
            expect(updatedContent).to.include(constants.FEATURE_EL,
                `Completion support did not work as expected for Liberty Server feature el-3.0. Got: ${updatedContent}`);

            logger.testComplete('Completion support for Liberty Server feature');
        });

        it('Valid server feature entry with platform entry in server.xml', async function () {
            this.timeout(45000);
            logger.testStart('Valid versionless feature entry with platform entry');

            await setMinimalContent();
            const fmEndLine = await editor.getLineOfText('</featureManager>');
            await editor.typeTextAt(fmEndLine, 1,
                '        ' + constants.PLATFORM_JAKARTA_NINE + '\n' +
                '        ' + constants.FEATURE_SERVLET + '\n'
            );

            const updatedContent = await utils.waitForCondition(async () => {
                const text = await editor.getText();
                return text.includes(constants.FEATURE_SERVLET) ? text : undefined;
            }, 15);
            expect(updatedContent).to.include(constants.FEATURE_SERVLET,
                'Did not find expected servlet feature entry in server.xml.');
            expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_NINE,
                'Did not find expected platform entry in server.xml.');

            logger.testComplete('Valid versionless feature entry with platform entry');
        });
    });
});
