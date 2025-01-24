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
        await utils.openServerXMLFile();

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        actualServerXMLContent = await editor.getText();

        assert(actualServerXMLContent.length !== 0, 'Content of server.xml is not in copied.');
        console.log('Sever.xml content:', actualServerXMLContent);

    }).timeout(25000);

    it('Should show diagnostic for server.xml invalid value', async () => {
        await utils.openServerXMLFile();

        const hoverExpectedOutcome = `'wrong' is not a valid value of union type 'booleanType'.`;
        const testHverTarget = '<logging appsWriteJson = \"wrong\" />';

        await editor.typeTextAt(17, 5, testHverTarget);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'wrong')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hoverContent = editor.findElement(By.className('hover-contents'));
        const hoverFoundOutcome = await hoverContent.getText();
        console.log("Hover text is:" + hoverFoundOutcome);

        assert(hoverFoundOutcome.includes(hoverExpectedOutcome), 'Did not get expected diagnostic in server.xml');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        await utils.openServerXMLFile();

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnippet = "<logging appsWriteJson = \"wrong\" />";
        const expectedHoverSnippet = "<logging appsWriteJson = \"true\" />";
        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(2000);
        const flaggedString = await editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(7000);

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverTxt = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const qckFixPopupLink = await hoverTxt.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
        await qckFixPopupLink.click();

        const hoverTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('pointerBlockElement is not found!');
        }
        const quickfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace with 'true'\")]"));
        await quickfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverSnippet), 'Quick fix not applied correctly for the invalid value in server.xml.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show hover support for server.xml Liberty Server Attribute', async () => {
        await utils.openServerXMLFile();

        const hoverOutcome = `Configuration properties for an HTTP endpoint.`;

        const focusTargetedElement = editor.findElement(By.xpath("//*[contains(text(), 'httpEndpoint')]"));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContent = editor.findElement(By.className('hover-contents'));
        const hoveredTextValue = await hoverContent.getText();
        console.log("Hover text is: " + hoveredTextValue);

        assert(hoveredTextValue.includes(hoverOutcome), 'Did not get expected hover data Liberty Server Attribute.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content is restored");

    }).timeout(35000);

    it('Should show hover support for server.xml Liberty Server Feature', async () => {
        await utils.openServerXMLFile();

        const hoverOutcome = `Description: This feature provides support for the MicroProfile Health specification.`;
        const testHoverTarget = '<feature>mpHealth-4.0</feature>';

        await editor.typeTextAt(15, 35, '\n');
        await utils.delay(1000);
        await editor.typeTextAt(16, 9, testHoverTarget);
        const focusTargetElement = editor.findElement(By.xpath("//*[contains(text(), 'mpHealth')]"));
        await utils.delay(3000);
        focusTargetElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetElement }).perform();
        await utils.delay(5000);

        const hoverContent = editor.findElement(By.className('hover-contents'));
        const hoveredValue = await hoverContent.getText();
        console.log("Hover text is :" + hoveredValue);

        assert(hoveredValue.includes(hoverOutcome), 'Did not get expected hover data Liberty Server Feature.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content restored");

    }).timeout(33000);

    it('Should show type ahead support in server.xml Liberty Server Feature', async () => {
        await utils.openServerXMLFile();

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const featureTag = "<f";

        const addFeature = "<feature>el-3.0</feature>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        //open the assistant
        let asist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (asist) {
            // to select an item use
            await asist.select('feature')
        }
        // close the assistant
        await editor.toggleContentAssist(false);
        const stanzaSnipet = "el-3";

        await editor.typeTextAt(16, 18, stanzaSnipet);
        await utils.delay(5000);

        asist = await editor.toggleContentAssist(true);
        if (asist) {
            await asist.select('el-3.0')
        }
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(addFeature), 'Type ahead support is not worked as expected in server.xml Liberty Server Feature - el-3.0.');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should show type ahead support in server.xml Liberty Server Configuration Stanza', async () => {
        await utils.openServerXMLFile();

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnippet = "log";

        const insertedConfig = "<logging></logging>";
        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(5000);
        //open the assistant
        let assist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (assist) {
            // to select an item use
            await assist.select('logging')
        }
        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Updated content in Sever.xml : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(insertedConfig), 'Type ahead support is not worked as expected in server.xml Liberty Server Configuration Stanza');

        editor.clearText();
        editor.setText(actualServerXMLContent);
        console.log("Content restored");

    }).timeout(25000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});


