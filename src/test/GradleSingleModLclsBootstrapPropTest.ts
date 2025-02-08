/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { By, EditorView, SideBarView, TextEditor, ViewSection, VSBrowser } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { expect } from "chai";

const path = require('path');
const assert = require('assert');

describe('LCLS tests for Gradle Project - bootstrap.properties', function () {
    let editor: TextEditor;
    let sidebar: SideBarView;
    let section: ViewSection;

    before(() => {
        sidebar = new SideBarView();
        utils.copyDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'), path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
    });
    it('getViewControl works with the correct label',  async() => { 
   
        const contentPart = sidebar.getContent();
        section = await contentPart.getSection('Liberty Dashboard');   
        console.log("Found Liberty Dashboard....");
        expect(section).not.undefined; 
      
     }).timeout(30000);
     
    it('Should show diagnostic support in boostrap.properties ', async () => {
        await utils.openConfigFile(constants.CONFIG, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        await editor.typeTextAt(1, 1, constants.WS_LOGGING_CON);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.WS_LOGGING_CONSOLE_FORMAT);
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 34, constants.VALUE_WRONG);
        const focusTargetedElement = editor.findElement(By.xpath(constants.FOCUS_WRONG));
        await utils.delay(3000);
        focusTargetedElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        await utils.delay(3000);
        console.log("Expected text is:" + constants.WS_LOGGING_CONSOLE_DIAGNOSTIC);
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.WS_LOGGING_CONSOLE_DIAGNOSTIC), 'Did not get expected diagnostic as expected in boostrap.properties.');
        editor.clearText();
        await utils.closeEditor(constants.BOOTSTRAP_PROPERTIES);
        await utils.delay(8000);

    }).timeout(85000);

    it('Should show hover support for bootstrap.properties Liberty Server properties setting', async () => {
        await utils.openConfigFile(constants.CONFIG, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        await editor.clearText();
        await editor.typeTextAt(1, 1, constants.WS_LOGGING_CONSOLE_VALUE);
        await utils.delay(5000);

        const focusTargetLement = editor.findElement(By.xpath(constants.FOCUS_WS_LOGLEVEL));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text:" + hoverValue);

        assert(hoverValue.includes(constants.LOG_LEVEL_INFO_MSG), 'Did not get expected hover data for bootstrap.properties.');
        editor.clearText();
        await utils.closeEditor(constants.BOOTSTRAP_PROPERTIES);
        await utils.delay(8000);

    }).timeout(85000);

    it('Should show type ahead support in bootstrap.properties for a Liberty Server Configuration booststrap.properties entry', async () => {
        await utils.openConfigFile(constants.CONFIG, constants.BOOTSTRAP_PROPERTIES);
        editor = await new EditorView().openEditor(constants.BOOTSTRAP_PROPERTIES) as TextEditor;

        await editor.typeTextAt(1, 1, constants.WS_LOGGING_T);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.WS_LOG_TRACE_FORMAT);

        await editor.typeTextAt(1, 32, constants.TBA);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.TBASIC);
        await editor.toggleContentAssist(false);

        const updatedBootstrapContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after type ahead support : ", updatedBootstrapContent);
        assert(updatedBootstrapContent.includes(constants.WS_LOGLEVEL_TBASIC), 'Type ahead support is not worked as expected in bootstrap.properties');

        editor.clearText();
        await utils.closeEditor(constants.BOOTSTRAP_PROPERTIES);
        await utils.delay(8000);

    }).timeout(85000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});
