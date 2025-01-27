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

    it('Should show hover support for server.xml Liberty Server Attribute', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        const hoverExpectedOutcome = `Configuration properties for an HTTP endpoint.`;

        const focusTargetedElement = editor.findElement(By.xpath("//*[contains(text(), 'httpEndpoint')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContent = editor.findElement(By.className('hover-contents'));
        const hoveredTextValue = await hoverContent.getText();
        console.log("Hover text is: " + hoveredTextValue);

        assert(hoveredTextValue.includes(hoverExpectedOutcome), 'Did not get expected hover data for Liberty Server Attribute.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(35000);

    it('Should show hover support for server.xml Liberty Server Feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        const hoverOutcome = `Description: This feature provides support for the MicroProfile Health specification.`;
        const testHoverTargetTag = '<feature>mpHealth-4.0</feature>';

        await editor.typeTextAt(15, 35, '\n');
        await utils.delay(1000);
        await editor.typeTextAt(16, 9, testHoverTargetTag);
        const focusTargetElement = editor.findElement(By.xpath("//*[contains(text(), 'mpHealth')]"));
        await utils.delay(3000);
        focusTargetElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoveredValue = await hoverContents.getText();
        console.log("Hover text is :" + hoveredValue);

        assert(hoveredValue.includes(hoverOutcome), 'Did not get expected hover data for Liberty Server Feature.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(33000);

    it('Should show type ahead support in server.xml Liberty Server Feature', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;
        const featureTag = "<f";

        const addFeatureValue = "<feature>el-3.0</feature>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, 'feature');

        const stanzaSnippet = "el-3";
        await editor.typeTextAt(16, 18, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, 'el-3.0');

        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(addFeatureValue), 'Type ahead support is not worked as expected in server.xml Liberty Server Feature - el-3.0.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(35000);

    it('Should show type ahead support in server.xml Liberty Server Configuration Stanza', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_XML);

        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;
        const stanzaSnippet = "log";

        const insertedConfigValue = "<logging></logging>";
        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, 'logging')

        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Updated content in Sever.xml : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(insertedConfigValue), 'Type ahead support is not worked as expected in server.xml Liberty Server Configuration Stanza');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("server.xml content is restored");

    }).timeout(25000);

    it('Should show diagnostic support in boostrap.properties ', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        const configNameSnippet = "com.ibm.ws.logging.con";;
        const insertConfig = "=wrong";
        const envCfgNameChooserSnippet = "com.ibm.ws.logging.console.format";
        const expectedHoverData = "The value `wrong` is not valid for the property `com.ibm.ws.logging.console.format`.";

        await editor.typeTextAt(1, 1, configNameSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, envCfgNameChooserSnippet);
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 34, insertConfig);
        const focusTargetedElement = editor.findElement(By.xpath("//*[contains(text(), 'wrong')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Expected text is:" + expectedHoverData);
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(expectedHoverData), 'Did not get expected diagnostic as expected in boostrap.properties.');
        editor.clearText();

    }).timeout(38000);

    it('Should show hover support for bootstrap.properties Liberty Server properties setting', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        const expectedHoverOutcome = 'This setting controls the granularity of messages that go to the console. The valid values are INFO, AUDIT, WARNING, ERROR, and OFF. The default is AUDIT. If using with the Eclipse developer tools this must be set to the default.';
        await editor.clearText();
        const testHoverTarget = "com.ibm.ws.logging.console.log.level=OFF";
        await editor.typeTextAt(1, 1, testHoverTarget);
        await utils.delay(5000);
        console.log(expectedHoverOutcome);
        const focusTargetLement = editor.findElement(By.xpath("//*[contains(text(), 'ws.logging.console.log.level')]"));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue === (expectedHoverOutcome), 'Did not get expected hover data for bootstrap.properties.');
        editor.clearText();

    }).timeout(35000);

    it('Should show type ahead support in bootstrap.properties for a Liberty Server Configuration booststrap.properties entry', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        editor = await new EditorView().openEditor('bootstrap.properties') as TextEditor;
        const featureTag = "com.ibm.ws.logging.t";
        const addFeatureValue = 'com.ibm.ws.logging.trace.format=TBASIC';

        await editor.typeTextAt(1, 1, featureTag);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, 'com.ibm.ws.logging.trace.format');

        await editor.toggleContentAssist(false);
        const stanzaSnippet = '=TB';

        await editor.typeTextAt(1, 32, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, 'TBASIC');

        await editor.toggleContentAssist(false);

        const updatedBootstrapContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedBootstrapContent);
        assert(updatedBootstrapContent.includes(addFeatureValue), 'Type ahead support is not worked as expected in bootstrap.properties');

        editor.clearText();

    }).timeout(35000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});
