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

describe('LCLS tests for Gradle Project - Server.env', function () {
    let editor: TextEditor;
    let actualServerXMLContent: string;

    before(() => {
        utils.copyDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config'), path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
    });

    it('Should show type ahead support in server.env for a Liberty Server Configuration Stanza', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_ENV);
        editor = await new EditorView().openEditor(constants.SERVER_ENV) as TextEditor;

        await editor.typeTextAt(1, 1, constants.WLP_LOGGING_CON);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.WLP_LOGGING_CONSOLE_FORMAT);

        await editor.typeTextAt(1, 27, constants.TBA);
        await utils.delay(2500);
        await utils.callAssitantAction(editor, constants.TBASIC);

        await editor.toggleContentAssist(false);

        const updatedSeverEnvContent = await editor.getText();
        await utils.delay(3000);
        assert(updatedSeverEnvContent.includes(constants.CONSOLE_FORMAT_TBASIC), 'Type ahead support is not working as expected in server.env');
        await editor.clearText();

    }).timeout(50000);

    it('Should show hover support for server.env Liberty Server config setting', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_ENV);
        editor = await new EditorView().openEditor(constants.SERVER_ENV) as TextEditor;

        await editor.clearText();

        await editor.typeTextAt(1, 1, constants.LOGLEVEL_WITH_VALUE);
        await utils.delay(5000);

        const focusTargetLement = editor.findElement(By.xpath(constants.FOCUS_LOGLEVEL));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.LOG_LEVEL_INFO_MSG), 'Did not get expected hover data for server.env');
        await editor.clearText();

    }).timeout(45000);

    it('Should show diagnostic support in server.env ', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_ENV);
        editor = await new EditorView().openEditor(constants.SERVER_ENV) as TextEditor;

        await editor.typeTextAt(1, 1, constants.WLP_LOGGING_CON);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, constants.WLP_LOGGING_CONSOLE_FORMAT);
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 27, constants.VALUE_NODATA);
        const focusTargetElement = editor.findElement(By.xpath(constants.FOCUS_NODATA));
        await utils.delay(3000);
        focusTargetElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(constants.CONSOLE_FORMAT_DIAGNOSTIC), 'Did not get expected diagnostic as expected in server.env file');
        await editor.clearText();
        await utils.closeEditor(constants.SERVER_ENV);

    }).timeout(55000);

    after(async () => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
        utils.delay(5000);
    });

});