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

const path = require('path');
const assert = require('assert');

describe('LCLS tests for Gradle Project', function () {
    let editor: TextEditor;
    let actualServerXMLContent: string;

    before(() => {
        utils.copyDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'), path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
    });

    it('Should copy content of server.xml', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        actualServerXMLContent = await editor.getText();
        assert(actualServerXMLContent.length !== 0, 'Content of server.xml is not in copied.');
        console.log('Sever.xml content is:', actualServerXMLContent);

    }).timeout(30000);

    it('Should show diagnostic for server.xml invalid value', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        await editor.typeTextAt(17, 5, constants.TARGETED_VALUE_LOGGING);
        const focusTargetedElement = editor.findElement(By.xpath(constants.FOCUS_WRONG));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverFoundOutcome = await hoverContents.getText();
        console.log("Hover text is:" + hoverFoundOutcome);

        assert(hoverFoundOutcome.includes(constants.EXPECTED_OUTCOME_WRONG), 'Did not get expected diagnostic in server.xml');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(17, 5, constants.TARGETED_VALUE_LOGGING);
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

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('pointerBlockElement is not found!');
        }
        const quickfixOptionValues = await editor.findElement(By.xpath(constants.LOGGING_TRUE));
        await quickfixOptionValues.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SNIPPET_LOGGING), 'Quick fix is not applied correctly for the invalid value in server.xml.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(45000);

    it('Should show hover support for server.xml Liberty Server Attribute', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        const focusTargetedElement = editor.findElement(By.xpath(constants.FOCUS_HTTPENDPOINT));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContent = editor.findElement(By.className('hover-contents'));
        const hoveredTextValue = await hoverContent.getText();
        console.log("Hover text is: " + hoveredTextValue);

        assert(hoveredTextValue.includes(constants.DESCRIPTION_HTTPENDPOINT), 'Did not get expected hover data Liberty for Server Attribute.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(45000);

    it('Should show hover support for server.xml Liberty Server Feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await utils.delay(1000);
        await editor.typeTextAt(16, 9, constants.FEATURE_MPHEALTH);
        const focusTargetElement = editor.findElement(By.xpath(constants.FOCUS_MPHEALTH));
        await utils.delay(3000);
        focusTargetElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoveredValue = await hoverContents.getText();
        console.log("Hover text is :" + hoveredValue);

        assert(hoveredValue.includes(constants.DESCRIPTION_MPHEALTH), 'Did not get expected hover data for Liberty Server Feature.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(45000);

    it('Should show type ahead support in server.xml Liberty Server Feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const featureTag = "<f";
        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.FEATURE_TAG)

        const stanzaSnippet = "el-3";
        await editor.typeTextAt(16, 18, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.EL_VALUE);
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.FEATURE_EL), 'Type ahead support is not worked as expected in server.xml for Liberty Server Feature - el-3.0.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(45000);

    it('Should show type ahead support in server.xml Liberty Server Configuration Stanza', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;
        const stanzaSnippet = "log";

        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.LOGGING)

        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Updated content in Sever.xml : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.LOGGING_TAG), 'Type ahead support is not worked as expected in server.xml for Liberty Server Configuration Stanza');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");
        await utils.closeEditor(constants.SERVER_XML);

    }).timeout(45000);

    it('Should show hover text in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.PLATFORM_JAKARTA_VALUE);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.DESCRIPTION_PLATFORM), 'Did not get expected hover text in server.xml for server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.PLATFORM_JAKARTA);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.PLATFORM_JAKARTA_ERROR), 'Did not get expected diagnostic in server.xml for server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Should apply quick fix for invalid value in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.PLATFORM_JAKARTA);
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

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('PointerBlockedElement is not found!');
        }
        const quickfixOption = await editor.findElement(By.xpath(constants.JAKARTA_ELEVEN));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Quick fix not applied correctly for the invalid value in server.xml for server platform.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Should show diagnostic for invalid value in server.xml for server feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.FEATURE_SERVLET);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_SERVLET));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.SERVLET_ERROR), 'Did not get expected diagnostic in server.xml for server feature');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Should apply quick fix for invalid value in server.xml for server feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;


        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.FEATURE_SERVLET);
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath(constants.FOCUS_SERVLET));
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

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('PointerBlockElement is not found!');
        }
        const quickfixOption = await editor.findElement(By.xpath(constants.FOCUS_SERVLET_VALUE));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(constants.SERVLET_VALUE), 'Quick fix is not applied correctly for the invalid value in server.xml for server feature.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Should show type ahead support in server.xml Liberty Server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const featureTag = "<p";
        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        await utils.callAssitantAction(editor, constants.PLATFORM);

        await editor.toggleContentAssist(false);
        const stanzaSnippet = "jakar";

        await editor.typeTextAt(16, 19, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.JAKARTA_ELEVEN)
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support is: ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_VALUE), 'Type ahead support is not worked as expected in server.xml for Liberty Server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    it('Valid server feature entry with platform entry in server.xml', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        await editor.typeTextAt(15, 35, constants.NEWLINE);
        await editor.typeTextAt(16, 9, constants.FEATURE_SERVLET);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_SERVLET));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const holverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await holverContents.getText();
        console.log("Hover text is:" + hoverValue);
        if (hoverValue.includes(constants.SERVLET_ERROR)) {
            await editor.typeTextAt(16, 35, constants.NEWLINE);
            await editor.typeTextAt(17, 9, constants.PLATFORM_JAKARTA_NINE);
            await utils.delay(2000);
        }
        const updatedServerxmlContent = await editor.getText();
        console.log("Updated server.xml content is:" + updatedServerxmlContent);

        assert(updatedServerxmlContent.includes(constants.FEATURE_SERVLET) && updatedServerxmlContent.includes(constants.PLATFORM_JAKARTA_NINE), 'Did not get expected entries in server.xml for versionless combination for server feature and platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(45000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});