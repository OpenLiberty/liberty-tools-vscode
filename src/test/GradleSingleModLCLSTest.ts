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

describe('LCLS Test for Gradle Project', function () {
    let editor: TextEditor;

    it('should apply quick fix for invalid value in server.xml', async () => {
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config', 'server.xml'));

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        const actualContent = await editor.getText();
        const stanzaSnippet = "<logging appsWriteJson = \"wrong\" />";
        const expectedText = "<logging appsWriteJson = \"true\" />";
        await editor.typeTextAt(17, 5, stanzaSnippet);
        await utils.delay(2000);
        const flaggedString = editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(3000);

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverValue = editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverValue.findElement(By.xpath("//*[contains(text(), 'Quick Fix... (⌘.)')]"));
        await quickFixPopupLink.click();

        const hoverBar = editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        const pointerBlockElementt = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockElementt) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockElementt);
        } else {
            console.log('pointerBlockElementt not found!');
        }
        const fixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Replace with 'true'\")]"));
        await fixOption.click();

        const updatedContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedContent);
        assert(updatedContent.includes(expectedText), 'quick fix not applied correctly.');
        editor.clearText();
        editor.setText(actualContent);
        console.log("Content restored");

    }).timeout(25000);
});
