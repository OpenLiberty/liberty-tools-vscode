/**
 * Copyright (c) 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { By, EditorView, SideBarView, TextEditor, VSBrowser } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';

const path = require('path');
const assert = require('assert');

describe('LCLS tests for Gradle Project', function () {
    let editor: TextEditor;

    before(() => {
        utils.copyConfig(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'),path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));     
    });

    it('Should apply quick fix for invalid value in server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const actualSeverXMLContent = await editor.getText();
        const stanzaSnipet = "<logging appsWriteJson = \"wrong\" />";
        const expectedHoverData = "<logging appsWriteJson = \"true\" />";
        await editor.typeTextAt(17, 5, stanzaSnipet);
        await utils.delay(2000);
        const flagedString = await editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(3000);

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flagedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverTxt= await editor.findElement(By.className('hover-row status-bar'));
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
            console.log('pointerBlockElementt not found!');
        }
        const qckfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace with 'true'\")]"));
        await qckfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix not applied correctly for appsWriteJson.');
        await editor.clearText();
        await editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show hover support for server.env', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.env'));
        editor = await new EditorView().openEditor('server.env') as TextEditor;

        const testHverTarget = "WLP_LOGGING_CONSOLE_LOGLEVEL=AUDIT";
        const hverExpectdOutcome = "This setting controls the granularity of messages that go to the console. The valid values are INFO, AUDIT, WARNING, ERROR, and OFF. The default is AUDIT. If using with the Eclipse developer tools this must be set to the default.";
        await editor.typeTextAt(1, 1, testHverTarget);
        await utils.delay(2000);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'LOGLEVEL')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);
        assert(hverValue === (hverExpectdOutcome), 'Did not get expected hover data for server.env - LOGLEVEL');
        await editor.clearText();

    }).timeout(35000);

    it('Should show hover support for server.xml Liberty Server Attribute', async () => {

        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));
        editor = await new EditorView().openEditor('server.xml') as TextEditor;

        const hverExpectdOutcome = `Configuration properties for an HTTP endpoint.
Source: ol-24.0.0.11.xsd`;

        console.log(hverExpectdOutcome);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'httpEndpoint')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue === (hverExpectdOutcome), 'Did not get expected hover data for Liberty Server Attribute -httpEndpoint');

    }).timeout(35000);

    it('Should show hover support for server.xml Liberty Server Feature', async () => {

        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config', 'server.xml'));
        editor = await new EditorView().openEditor('server.xml') as TextEditor;

        const hverExpectdOutcome = `Description: This feature provides support for the MicroProfile Health specification.
Enabled by: microProfile-5.0, microProfile-6.0, microProfile-6.1
Enables: cdi-3.0, jndi-1.0, json-1.0, jsonp-2.0, mpConfig-3.0`;
        const testHverTarget = '<feature>mpHealth-4.0</feature>';

        await editor.typeTextAt(15, 35, '\n');
        await utils.delay(1000);
        await editor.typeTextAt(16, 9, testHverTarget);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'mpHealth')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue === (hverExpectdOutcome), 'Did not get expected hover data Liberty Server Feature - mpHealth.');

    }).timeout(33000);

    it('Should show type ahead support in server.xml Liberty Server Feature', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const serverxmlContent = await editor.getText();
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
        editor.setText(serverxmlContent);
        console.log("Content restored");

    }).timeout(35000);

    after(() => {
        utils.removeConfigDir(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
      });
    
});
