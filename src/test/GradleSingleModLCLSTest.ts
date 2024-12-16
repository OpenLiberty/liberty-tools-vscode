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
    let actualSeverXMLContent: string;

    before(() => {
        utils.copyConfig(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'), path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
    });

    it('Should coppy content of server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        actualSeverXMLContent = await editor.getText();

        assert(actualSeverXMLContent.length !== 0, 'Content of server.xml is not in coppied.');
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

    it('Should show hover text in server.xml for server platform', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<platform>jakartaee-11.0</platform>";
        const expectedDiagnosticData = `Description: This platform resolves the Liberty features that support the Jakarta EE 11.0 platform.`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const focusTargtElemnt = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue.includes(expectedDiagnosticData), 'Did not get expected hover text in server.xml server platform');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show diagnostic for invalid value in server.xml for server platform', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<platform>jakarta</platform>";
        const expectedDiagnosticData = `ERROR: The platform "jakarta" does not exist.`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const focusTargtElemnt = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue.includes(expectedDiagnosticData), 'Did not get expected diagnostic in server.xml server platform');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml for server platform', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<platform>jakarta</platform>";
        const expectedHoverData = "<platform>jakartaee-11.0</platform>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const flagedString = await editor.findElement(By.xpath("//*[contains(text(), '\jakarta\')]"));
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
        const qckfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace platform with jakartaee-11.0\")]"));
        await qckfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix not applied correctly for the invalid value in server.xml server platform.');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show diagnostic for invalid value in server.xml for server feature', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<feature>servlet</feature>";
        const expectedDiagnosticData = `ERROR: The "servlet" versionless feature cannot be resolved since there are more than one common platform. Specify a platform or a feature with a version to enable resolution`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const focusTargtElemnt = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);

        assert(hverValue.includes(expectedDiagnosticData), 'Did not get expected diagnostic in server.xml server feature');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should apply quick fix for invalid value in server.xml for server feature', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<feature>servlet</feature>";
        const expectedHoverData = "<feature>servlet-3.1</feature>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const flagedString = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
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
        const qckfixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace feature with servlet-3.1\")]"));
        await qckfixOption.click();

        const updatedSeverXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedSeverXMLContent);
        assert(updatedSeverXMLContent.includes(expectedHoverData), 'Quick fix not applied correctly for the invalid value in server.xml server feature.');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    it('Should show type ahead support in server.xml Liberty Server platform', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const featureTag = "<p";

        const addFeature = "<platform>jakartaee-11.0</platform>";
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, featureTag);
        await utils.delay(5000);
        //open the assistant
        let asist = await editor.toggleContentAssist(true);
        // toggle can return void, so we need to make sure the object is present
        if (asist) {
            // to select an item use
            await asist.select('platform')
        }
        // close the assistant
        await editor.toggleContentAssist(false);
        const stanzaSnipet = "jakar";

        await editor.typeTextAt(16, 19, stanzaSnipet);
        await utils.delay(5000);

        asist = await editor.toggleContentAssist(true);
        if (asist) {
            await asist.select('jakartaee-11.0')
        }
        await editor.toggleContentAssist(false);

        const updatedServerxmlContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedServerxmlContent);
        assert(updatedServerxmlContent.includes(addFeature), 'Type ahead support is not worked as expected in server.xml Liberty Server platform');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(35000);

    it('Valid server feature entry with platform entry in server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const stanzaSnipet = "<feature>servlet</feature>";
        const expectedPlatformEntry = "<platform>jakartaee-9.1</platform>";
        const expectedDiagnosticData = `ERROR: The "servlet" versionless feature cannot be resolved since there are more than one common platform. Specify a platform or a feature with a version to enable resolution`;
        await editor.typeTextAt(15, 35, '\n');
        await editor.typeTextAt(16, 9, stanzaSnipet);
        await utils.delay(2000);
        const focusTargtElemnt = await editor.findElement(By.xpath("//*[contains(text(), '\servlet\')]"));
        await utils.delay(3000);
        focusTargtElemnt.click();
        await editor.click();

        const actns = VSBrowser.instance.driver.actions();
        await actns.move({ origin: focusTargtElemnt }).perform();
        await utils.delay(5000);

        const hverContent = editor.findElement(By.className('hover-contents'));
        const hverValue = await hverContent.getText();
        console.log("Hover text:" + hverValue);
        if (hverValue.includes(expectedDiagnosticData)) {
            const stanzaSnipetPlatform = "<platform>jakartaee-9.1</platform>";
            await editor.typeTextAt(16, 35, '\n');
            await editor.typeTextAt(17, 9, stanzaSnipetPlatform);
            await utils.delay(2000);
        }
        const updatedServerxmlContent = await editor.getText();
        console.log("Updated server.xml content:" + updatedServerxmlContent);

        assert(updatedServerxmlContent.includes(stanzaSnipet) && updatedServerxmlContent.includes(expectedPlatformEntry), 'Did not get expected entries in server.xml for versionless combination for server feature and platform');

        editor.clearText();
        editor.setText(actualSeverXMLContent);
        console.log("Content restored");

    }).timeout(38000);

    after(() => {
        utils.removeConfigDir(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});