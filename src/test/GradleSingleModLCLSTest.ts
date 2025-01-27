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

    }).timeout(25000);

    it('Should show diagnostic for server.xml invalid value', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        const expectedOutcomeValue = `'wrong' is not a valid value of union type 'booleanType'.`;
        const hoverTargetValue = '<logging appsWriteJson = \"wrong\" />';

        await editor.typeTextAt(17, 5, hoverTargetValue);
        const focusTargetedElement = editor.findElement(By.xpath("//*[contains(text(), 'wrong')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverFoundOutcome = await hoverContents.getText();
        console.log("Hover text is:" + hoverFoundOutcome);

        assert(hoverFoundOutcome.includes(expectedOutcomeValue), 'Did not get expected diagnostic in server.xml');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippet = "<logging appsWriteJson = \"wrong\" />";
        const hoverExpectedSnippet = "<logging appsWriteJson = \"true\" />";
        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(2000);
        const hoverTargetValue = await editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: hoverTargetValue }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
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
        const quickfixOptionValues = await editor.findElement(By.xpath("//*[contains(text(), \"Replace with 'true'\")]"));
        await quickfixOptionValues.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(hoverExpectedSnippet), 'Quick fix not applied correctly for the invalid value in server.xml.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(38000);

    it('Should show hover text in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippet = "<platform>jakartaee-11.0</platform>";
        const expectedDiagnosticData = `Description: This platform resolves the Liberty features that support the Jakarta EE 11.0 platform.`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnippet);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(expectedDiagnosticData), 'Did not get expected hover text in server.xml server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Should show diagnostic for invalid value in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippet = "<platform>jakarta</platform>";
        const expectedDiagnosticData = `ERROR: The platform "jakarta" does not exist.`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnippet);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue.includes(expectedDiagnosticData), 'Did not get expected diagnostic in server.xml server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml for server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnipet = "<platform>jakarta</platform>";
        const expectedHoverData = "<platform>jakartaee-11.0</platform>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
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
        const quickfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace platform with jakartaee-11.0\")]"));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix not applied correctly for the invalid value in server.xml server platform.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Should show diagnostic for invalid value in server.xml for server feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippet = "<feature>servlet</feature>";
        const expectedDiagnosticData = `ERROR: The "servlet" versionless feature cannot be resolved since there are more than one common platform. Specify a platform or a feature with a version to enable resolution`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnippet);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue.includes(expectedDiagnosticData), 'Did not get expected diagnostic in server.xml server feature');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml for server feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippet = "<feature>servlet</feature>";
        const expectedHoverData = "<feature>servlet-3.1</feature>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnippet);
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
        await quickFixPopupLink.click();

        const hoverTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('pointerBlockElementt not found!');
        }
        const quickfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace feature with servlet-3.1\")]"));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix is: ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix is not applied correctly for the invalid value in server.xml server feature.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Should show type ahead support in server.xml Liberty Server platform', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const featureTag = "<p";
        const addFeature = "<platform>jakartaee-11.0</platform>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        await utils.callAssitantAction(editor, 'platform');

        await editor.toggleContentAssist(false);
        const stanzaSnippet = "jakar";

        await editor.typeTextAt(16, 19, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, 'jakartaee-11.0')
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support is: ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(addFeature), 'Type ahead support is not worked as expected in server.xml Liberty Server platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    it('Valid server feature entry with platform entry in server.xml', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML)
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const stanzaSnippetFeature = "<feature>servlet</feature>";
        const stanzaSnippetPlatform = "<platform>jakartaee-9.1</platform>";
        const expectedDiagnosticData = `ERROR: The "servlet" versionless feature cannot be resolved since there are more than one common platform. Specify a platform or a feature with a version to enable resolution`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnippetFeature);
        await utils.delay(2000);
        const focusTargetedElement = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const holverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await holverContents.getText();
        console.log("Hover text is:" + hoverValue);
        if (hoverValue.includes(expectedDiagnosticData)) {
            await editor.typeTextAt(16, 35, '\n');
            await editor.typeTextAt(17, 9, stanzaSnippetPlatform);
            await utils.delay(2000);
        }
        const updatedServerxmlContent = await editor.getText();
        console.log("Updated server.xml content is:" + updatedServerxmlContent);

        assert(updatedServerxmlContent.includes(stanzaSnippetFeature) && updatedServerxmlContent.includes(stanzaSnippetPlatform), 'Did not get expected entries in server.xml for versionless combination for server feature and platform');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(38000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});