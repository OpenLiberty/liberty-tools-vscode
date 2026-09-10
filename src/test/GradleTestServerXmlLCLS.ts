/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { By, EditorView, TextEditor, VSBrowser } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { ProblemsPage } from './pages/ProblemsPage';

const path = require('path');
const assert = require('assert');

const MINIMAL_CONTENT = `<!--
 Copyright (c) 2022 IBM Corporation and others.

 This program and the accompanying materials are made available under the
 terms of the Eclipse Public License v. 2.0 which is available at
 http://www.eclipse.org/legal/epl-2.0.

 SPDX-License-Identifier: EPL-2.0

 Contributors:
     IBM Corporation - initial implementation
-->
<server description="Sample Servlet server">
    <featureManager>
        <feature>jsp-2.3</feature>
    </featureManager>
    
    <httpEndpoint  host="*" httpPort="9080" httpsPort="9443" id="defaultHttpEndpoint" />
    
    <webApplication id="liberty-gradle-test-wrapper-app" location="liberty-gradle-test-wrapper-app-1.0.war" name="liberty-gradle-test-wrapper-app"/>
</server>`;

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

        await utils.openGradleFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
        actualServerXMLContent = await editor.getText();
    });

    afterEach(async function () {
        this.timeout(30000);
        try {
            editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
            await editor.setText(actualServerXMLContent);
        } catch (e) {
            // best-effort restore; individual tests also restore inline
        }
    });

    it('Should copy content of server.xml', async () => {
        assert(actualServerXMLContent.length !== 0, 'Content of server.xml is not in copied.');

    }).timeout(30000);

    it('Should show diagnostic for server.xml invalid value', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(19, 5, constants.TARGETED_VALUE_LOGGING);
        await utils.delay(3000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_WRONG));
        await focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = await VSBrowser.instance.driver.findElement(By.className('hover-contents'));
        const hoverFoundOutcome = await hoverContents.getText();
        console.log("Hover text is:" + hoverFoundOutcome);

        assert(hoverFoundOutcome.includes(constants.EXPECTED_OUTCOME_WRONG), 'Did not get expected diagnostic in server.xml');

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(19, 5, constants.TARGETED_VALUE_LOGGING);
        await utils.delay(2000);
        const hoverTargetValue = await editor.findElement(By.xpath(constants.FOCUS_WRONG));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: hoverTargetValue }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath(constants.FOCUS_QUICKFIX));
        await quickFixPopupLink.click();

        const hoverWindowTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverWindowTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        // Setting pointer block element display value as none to choose option from Quickfix menu
        const pointerBlockedElements = await driver.findElements(By.css('.context-view-pointerBlock'));
        if (pointerBlockedElements.length > 0) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElements[0]);
        }
        const quickfixOptionValues = await editor.findElement(By.xpath(constants.LOGGING_TRUE));
        await quickfixOptionValues.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SNIPPET_LOGGING), 'Quick fix is not applied correctly for the invalid value in server.xml.');

    }).timeout(45000);

    it('Should show completion support in server.xml Liberty Server Feature', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        const featureTag = "<f";
        await editor.typeTextAt(16, 39, constants.NEWLINE);
        await editor.typeTextAt(17, 9, featureTag);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.FEATURE_TAG)

        const stanzaSnippet = "el-3";
        await editor.typeTextAt(17, 18, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.EL_VALUE);
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after completion support : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.FEATURE_EL), 'Completion support is not worked as expected in server.xml for Liberty Server Feature - el-3.0.');

    }).timeout(45000);

    it('Should show completion support in server.xml Liberty Server Configuration Stanza', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
        const stanzaSnippet = "log";

        await editor.typeTextAt(19, 5, stanzaSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.LOGGING)

        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Updated content in Sever.xml : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.LOGGING_TAG), 'Completion support is not worked as expected in server.xml for Liberty Server Configuration Stanza');

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server platform', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        await editor.setTextAtLine(17, '        ' + constants.PLATFORM_JAKARTA);
        await utils.delay(5000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        await focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = await VSBrowser.instance.driver.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.PLATFORM_JAKARTA_ERROR), 'Did not get expected diagnostic in server.xml for server platform');

    }).timeout(45000);

    it('Should apply quick fix for invalid value in server.xml for server platform', async () => {
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
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Quick fix not applied correctly for the invalid value in server.xml for server platform.');

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server feature', async () => {
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

    }).timeout(60000);

    it('Should apply quick fix for invalid value in server.xml for server feature', async () => {
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
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SERVLET_VALUE), 'Quick fix is not applied correctly for the invalid value in server.xml for server feature.');

    }).timeout(60000);

    it('Should show completion support in server.xml Liberty Server platform', async () => {
        // Use minimal content so no duplicate platform exists to confuse LCLS
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;
        await editor.setText(MINIMAL_CONTENT);
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
        console.log("Content after completion support is: ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Completion support is not worked as expected in server.xml for Liberty Server platform');

    }).timeout(60000);

    it('Valid server feature entry with platform entry in server.xml', async () => {
        editor = await editorView.openEditor(constants.SERVER_XML) as TextEditor;

        // Insert servlet after mpHealth (line 16); existing jakartaee-9.1 platform resolves it
        await editor.typeTextAt(16, 39, constants.NEWLINE);
        await editor.typeTextAt(17, 9, constants.FEATURE_SERVLET);
        await utils.delay(5000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_SERVLET));
        await focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const holverContents = await VSBrowser.instance.driver.findElement(By.className('hover-contents'));
        const hoverValue = await holverContents.getText();
        console.log("Hover text is:" + hoverValue);
        if (hoverValue.includes(constants.SERVLET_ERROR)) {
            await editor.typeTextAt(17, 35, constants.NEWLINE);
            await editor.typeTextAt(18, 9, constants.PLATFORM_JAKARTA_NINE);
            await utils.delay(2000);
        }
        const updatedServerxmlContent = await editor.getText();
        console.log("Updated server.xml content is:" + updatedServerxmlContent);

        assert(updatedServerxmlContent.includes(constants.FEATURE_SERVLET) && updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_NINE), 'Did not get expected entries in server.xml for versionless combination for server feature and platform');

    }).timeout(45000);

    after(async function () {
        this.timeout(30000);
        await utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});
