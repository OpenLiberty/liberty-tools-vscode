/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { By, EditorView, TextEditor, VSBrowser } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as editorUtils from './utils/editorUtils';
import * as constants from './definitions/constants';
import { logger } from './utils/testLogger';
import { EditorPage } from './pages/EditorPage';
import { CodeAssistPage } from './pages/CodeAssistPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { QuickFixPage } from './pages/QuickFixPage';

const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('LCLS tests for Gradle Project', function () {
    let editorView: EditorView;
    let editor: TextEditor;
    let actualServerXMLContent: string;

    before(async function () {
        this.timeout(60000);
        editorView = new EditorView();
        await utils.copyDirectoryByPath(
            path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'),
            path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2')
        );

        const serverXmlPath = path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', constants.CONFIG_TWO, constants.SERVER_XML);
        const editorPage = await new EditorPage().openFile(serverXmlPath, constants.SERVER_XML);
        editor = editorPage.getEditor();
        actualServerXMLContent = await editor.getText();
    });

    afterEach(async function () {
        this.timeout(30000);
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest?.title}`);
        }
        try {
            editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
            await editor.setText(actualServerXMLContent);
        } catch (e) {
            // best-effort restore; individual tests also restore inline
        }
    });

    it('Should copy content of server.xml', async () => {
        logger.testStart('Should copy content of server.xml');
        assert(actualServerXMLContent.length !== 0, 'Content of server.xml is not in copied.');
        logger.testComplete('Should copy content of server.xml');

    }).timeout(30000);

    it('Should show diagnostic for server.xml invalid value', async () => {
        logger.testStart('Should show diagnostic for server.xml invalid value');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(19, 5, constants.TARGETED_VALUE_LOGGING);

        // Wait for LCLS to underline the invalid value before attempting to hover
        await utils.waitForCondition(async () => {
            try {
                await editor.findElement(By.xpath(constants.FOCUS_WRONG));
                return true;
            } catch {
                return undefined;
            }
        }, 20);

        // "wrong" is at column 30: line 19 col 5 + '<logging appsWriteJson = "'.length
        const hoverText = await editorUtils.hoverOver(editor, 19, 30, 'wrong value');
        logger.info("Hover text is:" + hoverText);

        assert(hoverText.includes(constants.EXPECTED_OUTCOME_WRONG), 'Did not get expected diagnostic in server.xml');
        logger.testComplete('Should show diagnostic for server.xml invalid value');

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        logger.testStart('Should apply quick fix for invalid value in server.xml');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(19, 5, constants.TARGETED_VALUE_LOGGING);

        // Wait for LCLS to underline 'wrong' before opening the quick fix
        await utils.waitForCondition(async () => {
            try {
                await editor.findElement(By.xpath(constants.FOCUS_WRONG));
                return true;
            } catch {
                return undefined;
            }
        }, 20);

        await new QuickFixPage().applyFix(EditorPage.from(editor), 'wrong', "Replace with 'true'");

        const updatedSeverXMLContent = await utils.waitForCondition(async () => {
            const text = await editor.getText();
            return text.includes(constants.SNIPPET_LOGGING) ? text : undefined;
        }, 15);
        logger.info("Content after Quick fix is: " + updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SNIPPET_LOGGING), 'Quick fix is not applied correctly for the invalid value in server.xml.');
        logger.testComplete('Should apply quick fix for invalid value in server.xml');

    }).timeout(45000);

    it('Should show completion support in server.xml Liberty Server Feature', async () => {
        logger.testStart('Should show completion support in server.xml Liberty Server Feature');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        const editorPage = EditorPage.from(editor);
        const codeAssist = new CodeAssistPage();

        await editor.typeTextAt(16, 39, constants.NEWLINE);
        await editor.typeTextAt(17, 9, '<f');
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.FEATURE_TAG);

        const stanzaSnippet = "el-3";
        await editor.typeTextAt(17, 18, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.EL_VALUE);
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        logger.info("Content after completion support : " + updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.FEATURE_EL), 'Completion support is not worked as expected in server.xml for Liberty Server Feature - el-3.0.');
        logger.testComplete('Should show completion support in server.xml Liberty Server Feature');

    }).timeout(45000);

    it('Should show completion support in server.xml Liberty Server Configuration Stanza', async () => {
        logger.testStart('Should show completion support in server.xml Liberty Server Configuration Stanza');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        // Position cursor at the insertion point before typing the trigger
        await editor.typeTextAt(19, 5, 'log');
        await editor.setCursor(19, 8);

        // Now let CodeAssistPage wait for the item and select it
        const assist = await utils.waitForCondition(async () => {
            return await editor.toggleContentAssist(true) ?? undefined;
        }, 15);
        await utils.waitForCondition(async () => {
            try {
                const item = await assist.getItem(constants.LOGGING);
                return item ? true : undefined;
            } catch {
                return undefined;
            }
        }, 15);
        await assist.select(constants.LOGGING);
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        logger.info("Updated content in Sever.xml : " + updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.LOGGING_TAG), 'Completion support is not worked as expected in server.xml for Liberty Server Configuration Stanza');
        logger.testComplete('Should show completion support in server.xml Liberty Server Configuration Stanza');

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server platform', async () => {
        logger.testStart('Should show diagnostic for invalid value in server.xml for server platform');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.setTextAtLine(17, '        ' + constants.PLATFORM_JAKARTA);
        await utils.delay(5000);

        const hoverText = await editorUtils.hoverOver(editor, 17, 20, 'invalid platform value');
        logger.info("Hover text is:" + hoverText);

        assert(hoverText.includes(constants.PLATFORM_JAKARTA_ERROR), 'Did not get expected diagnostic in server.xml for server platform');
        logger.testComplete('Should show diagnostic for invalid value in server.xml for server platform');

    }).timeout(45000);

    it('Should apply quick fix for invalid value in server.xml for server platform', async () => {
        logger.testStart('Should apply quick fix for invalid value in server.xml for server platform');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.setTextAtLine(17, '        ' + constants.PLATFORM_JAKARTA);
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath(constants.FOCUS_QUICKFIX));
        await quickFixPopupLink.click();

        const hoverTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        // Setting pointer block element display value as none to choose option from Quickfix menu
        const pointerBlockedElements = await driver.findElements(By.css('.context-view-pointerBlock'));
        if (pointerBlockedElements.length > 0) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElements[0]);
        }
        const quickfixOption = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA_ELEVEN));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        logger.info("Content after Quick fix : " + updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Quick fix not applied correctly for the invalid value in server.xml for server platform.');
        logger.testComplete('Should apply quick fix for invalid value in server.xml for server platform');

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server feature', async () => {
        logger.testStart('Should show diagnostic for invalid value in server.xml for server feature');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1,
            '        ' + constants.FEATURE_SERVLET_INVALID + '\n'
        );
        await editor.save();

        const found = await utils.waitForCondition(async () => {
            const result = await new ProblemsPage().hasDiagnostic(constants.SERVLET_INVALID_ERROR);
            return result ? true : undefined;
        }, 30);
        assert(found, 'Did not get expected diagnostic in server.xml for server feature');
        logger.testComplete('Should show diagnostic for invalid value in server.xml for server feature');

    }).timeout(60000);

    it('Should apply quick fix for invalid value in server.xml for server feature', async () => {
        logger.testStart('Should apply quick fix for invalid value in server.xml for server feature');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1,
            '        ' + constants.FEATURE_SERVLET_INVALID + '\n'
        );
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath(constants.FOCUS_SERVLET_INVALID));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath(constants.FOCUS_QUICKFIX));
        await quickFixPopupLink.click();

        const hoverTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        // Setting pointer block element display value as none to choose option from Quickfix menu
        const pointerBlockedElements = await driver.findElements(By.css('.context-view-pointerBlock'));
        if (pointerBlockedElements.length > 0) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElements[0]);
        }
        const quickfixOption = await editor.findElement(By.xpath(constants.FOCUS_SERVLET_VALUE));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        logger.info("Content after Quick fix is: " + updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SERVLET_VALUE), 'Quick fix is not applied correctly for the invalid value in server.xml for server feature.');
        logger.testComplete('Should apply quick fix for invalid value in server.xml for server feature');

    }).timeout(60000);

    it('Should show completion support in server.xml Liberty Server platform', async () => {
        logger.testStart('Should show completion support in server.xml Liberty Server platform');
        // Use minimal content so no duplicate platform exists to confuse LCLS
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
        const platformXmlPath = path.join(
            utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config', 'server_platform.xml'
        );
        const minimalContent = fs.readFileSync(platformXmlPath, 'utf8');
        await editor.setText(minimalContent);
        await utils.delay(5000);
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        // Insert empty platform tag and position cursor inside the value slot
        await editor.typeTextAt(fmEndLine, 1, '        <platform></platform>');
        await editor.setCursor(fmEndLine, 19);
        await editor.typeTextAt(fmEndLine, 19, 'jakar');
        await editor.setCursor(fmEndLine, 24);

        const assist = await utils.waitForCondition(async () => {
            return await editor.toggleContentAssist(true) ?? undefined;
        }, 30);
        await utils.waitForCondition(async () => {
            try {
                const item = await assist.getItem(constants.JAKARTA_ELEVEN);
                return item ? true : undefined;
            } catch {
                return undefined;
            }
        }, 30);
        await assist.select(constants.JAKARTA_ELEVEN);
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        logger.info("Content after completion support is: " + updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Completion support is not worked as expected in server.xml for Liberty Server platform');
        logger.testComplete('Should show completion support in server.xml Liberty Server platform');

    }).timeout(60000);

    it('Valid server feature entry with platform entry in server.xml', async () => {
        logger.testStart('Valid server feature entry with platform entry in server.xml');
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        // Insert servlet after mpHealth (line 16); existing jakartaee-9.1 platform resolves it
        await editor.typeTextAt(16, 39, constants.NEWLINE);
        await editor.typeTextAt(17, 9, constants.FEATURE_SERVLET);
        await utils.delay(5000);

        const hoverText = await editorUtils.hoverOver(editor, 17, 20, 'servlet feature');
        logger.info("Hover text is:" + hoverText);
        if (hoverText.includes(constants.SERVLET_ERROR)) {
            await editor.typeTextAt(17, 35, constants.NEWLINE);
            await editor.typeTextAt(18, 9, constants.PLATFORM_JAKARTA_NINE);
            await utils.delay(2000);
        }
        const updatedServerxmlContent = await editor.getText();
        logger.info("Updated server.xml content is:" + updatedServerxmlContent);

        assert(updatedServerxmlContent.includes(constants.FEATURE_SERVLET) && updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_NINE), 'Did not get expected entries in server.xml for versionless combination for server feature and platform');
        logger.testComplete('Valid server feature entry with platform entry in server.xml');

    }).timeout(45000);

    after(async function () {
        this.timeout(30000);
        await utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        logger.info("Removed new config folder:");
    });

});
