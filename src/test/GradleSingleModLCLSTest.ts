/**
 * Copyright (c) 2025 IBM Corporation.
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
    let actualSeverXMLContent: string;

    before(() => {
        utils.copyConfig(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'), path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
    });

    it('Should copy content of server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        actualSeverXMLContent = await editor.getText();

        assert(actualSeverXMLContent.length !== 0, 'Content of server.xml is not in copied.');
        console.log('Sever.xml content:', actualSeverXMLContent);

    }).timeout(10000);

    it('Should show diagnostic for server.xml invalid value', async () => {

        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));
        editor = await new EditorView().openEditor('server.xml') as TextEditor;

        const hverExpectdOutcome = `'wrong' is not a valid value of union type 'booleanType'.`;
        const testHverTarget = '<logging appsWriteJson = \"wrong\" />';

        await editor.typeTextAt(17, 5, testHverTarget);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'wrong')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue.includes(hverExpectdOutcome), 'Did not get expected diagnostic in server.xml');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should apply quick fix for invalid value in server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<logging appsWriteJson = \"wrong\" />";
        const expectedHoverData = "<logging appsWriteJson = \"true\" />";
        await editor.typeTextAt(17, 5, stanzaSnipet);
        await utils.delay(2000);
        const flagedString = await editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(7000);

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flagedString }).perform();
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
            console.log('pointerBlockElementt not found!');
        }
        const qckfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace with 'true'\")]"));
        await qckfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix not applied correctly for the invalid value in server.xml.');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show hover support for server.xml Liberty Server Attribute', async () => {

        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));
        editor = await new EditorView().openEditor('server.xml') as TextEditor;

        const hovrExpctdOutcome = `Configuration properties for an HTTP endpoint.`;

        console.log(hovrExpctdOutcome);
        const focusTargtElemnt = editor.findElement(By.xpath("//*[contains(text(), 'httpEndpoint')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hoveredText = await hverContent.getText();
        console.log("Hover text:" + hoveredText);

        assert(hoveredText.includes(hovrExpctdOutcome), 'Did not get expected hover data Liberty Server Attribute.');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should show hover support for server.xml Liberty Server Feature', async () => {

        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));
        editor = await new EditorView().openEditor('server.xml') as TextEditor;

        const hverExpectdOutcome = `Description: This feature provides support for the MicroProfile Health specification.`;
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

        assert(hverValue.includes(hverExpectdOutcome), 'Did not get expected hover data Liberty Server Feature.');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(33000);

    it('Should show type ahead support in server.xml Liberty Server Feature', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

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
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should show type ahead support in server.xml Liberty Server Configuration Stanza', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "log";

        const insertedConfig = "<logging></logging>";
        await editor.typeTextAt(17, 5, stanzaSnipet);
        await utils.delay(5000);
        //open the assistant
        let asist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (asist) {
            // to select an item use
            await asist.select('logging')
        }
        // close the assistant
        await editor.toggleContentAssist(false);

        // close the assistant
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Updated content in Sever.xml : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(insertedConfig), 'Type ahead support is not worked as expected in server.xml Liberty Server Configuration Stanza');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Should show type ahead support in server.env for a Liberty Server Configuration Stanza', async () => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.env'));
        editor = await new EditorView().openEditor('server.env') as TextEditor;

        const configNameSnippet = 'WLP_LOGGING_CON';
        const insertConfig = "=TBA";
        const envCfgNameChooserSnippet = 'WLP_LOGGING_CONSOLE_FORMAT';
        const expectedServerEnvString = 'WLP_LOGGING_CONSOLE_FORMAT=TBASIC';

        await editor.typeTextAt(1, 1, configNameSnippet);
        await utils.delay(5000);
        //open the assistant
        let asist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (asist) {
            // to select an item use
            await asist.select(envCfgNameChooserSnippet);
        }
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 27, insertConfig);
        await utils.delay(2500);
        asist = await editor.toggleContentAssist(true);
        if (asist) {
            await asist.select('TBASIC');
        }
        await editor.toggleContentAssist(false);

        const updatedSeverEnvContent = await editor.getText();
        await utils.delay(3000);
        assert(updatedSeverEnvContent.includes(expectedServerEnvString), 'Type ahead support is not working as expected in server.env');
        await editor.clearText();

    }).timeout(35000);

    it('Should show hover support for server.env Liberty Server config setting', async () => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.env'));
        editor = await new EditorView().openEditor('server.env') as TextEditor;

        const ExpectedHoverOutcome = 'This setting controls the granularity of messages that go to the console. The valid values are INFO, AUDIT, WARNING, ERROR, and OFF. The default is AUDIT. If using with the Eclipse developer tools this must be set to the default.';
        await editor.clearText();
        const testHoverTarget = 'WLP_LOGGING_CONSOLE_LOGLEVEL=OFF';
        await editor.typeTextAt(1, 1, testHoverTarget);
        await utils.delay(5000);
        console.log(ExpectedHoverOutcome);
        const focusTargetLement = editor.findElement(By.xpath("//*[contains(text(), 'CONSOLE_LOGLEVEL')]"));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue === (ExpectedHoverOutcome), 'Did not get expected hover data for server.env');
        await editor.clearText();

    }).timeout(35000);

    it('Should show diagnostic support in server.env ', async () => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.env'));
        editor = await new EditorView().openEditor('server.env') as TextEditor;

        const configNameSnippet = 'WLP_LOGGING_CON';
        const insertConfig = '=sample_value_is_updating_as_nodata';
        const envCfgNameChooserSnippet = 'WLP_LOGGING_CONSOLE_FORMAT';
        const expectedHoverData = 'The value `sample_value_is_updating_as_nodata` is not valid for the variable `WLP_LOGGING_CONSOLE_FORMAT`.';

        await editor.typeTextAt(1, 1, configNameSnippet);
        await utils.delay(5000);
        //open the assistant
        let asist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (asist) {
            // to select an item use
            await asist.select(envCfgNameChooserSnippet);
        }
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 27, insertConfig);
        const focusTargetLement = editor.findElement(By.xpath("//*[contains(text(), 'nodata')]"));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue.includes(expectedHoverData), 'Did not get expected diagnostic as expected in server.env file');
        await editor.clearText();

    }).timeout(35000);

    after(() => {
        utils.removeConfigDir(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});