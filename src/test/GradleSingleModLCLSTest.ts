/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { By, EditorView, TextEditor, VSBrowser, Workbench } from "vscode-extension-tester";
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
        await utils.delay(3000);
        

    }).timeout(28000);

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
        await utils.closeEditor();

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
        await utils.closeEditor();

    }).timeout(38000);

    after(async () => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
        

    });

});