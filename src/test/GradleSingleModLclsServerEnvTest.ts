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
        editor = await new EditorView().openEditor('server.env') as TextEditor;

        const configNameSnippet = 'WLP_LOGGING_CON';
        const insertConfig = "=TBA";
        const envCfgNameChooserSnippet = 'WLP_LOGGING_CONSOLE_FORMAT';
        const expectedServerEnvString = 'WLP_LOGGING_CONSOLE_FORMAT=TBASIC';

        await editor.typeTextAt(1, 1, configNameSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, envCfgNameChooserSnippet);

        await editor.typeTextAt(1, 27, insertConfig);
        await utils.delay(2500);
        await utils.callAssitantAction(editor, 'TBASIC');
        
        await editor.toggleContentAssist(false);

        const updatedSeverEnvContent = await editor.getText();
        await utils.delay(3000);
        assert(updatedSeverEnvContent.includes(expectedServerEnvString), 'Type ahead support is not working as expected in server.env');
        await editor.clearText();
        await utils.closeEditor(constants.SERVER_ENV);

    }).timeout(45000);

    it('Should show hover support for server.env Liberty Server config setting', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_ENV);
        editor = await new EditorView().openEditor(constants.SERVER_ENV) as TextEditor;

        const expectedHoverOutcome = 'This setting controls the granularity of messages that go to the console. The valid values are INFO, AUDIT, WARNING, ERROR, and OFF. The default is AUDIT. If using with the Eclipse developer tools this must be set to the default.';
        await editor.clearText();
        const testHoverTarget = 'WLP_LOGGING_CONSOLE_LOGLEVEL=OFF';
        await editor.typeTextAt(1, 1, testHoverTarget);
        await utils.delay(5000);
        
        const focusTargetLement = editor.findElement(By.xpath("//*[contains(text(), 'CONSOLE_LOGLEVEL')]"));
        await utils.delay(3000);
        focusTargetLement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetLement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(expectedHoverOutcome), 'Did not get expected hover data for server.env');
        await editor.clearText();
        await utils.closeEditor(constants.SERVER_ENV);

    }).timeout(35000);

    it('Should show diagnostic support in server.env ', async () => {
        await utils.openConfigFile(constants.CONFIG_TWO, constants.SERVER_ENV);
        editor = await new EditorView().openEditor(constants.SERVER_ENV) as TextEditor;

        const configNameSnippet = 'WLP_LOGGING_CON';
        const insertConfig = '=sample_value_is_updating_as_nodata';
        const envCfgNameChooserSnippet = 'WLP_LOGGING_CONSOLE_FORMAT';
        const expectedHoverData = 'The value `sample_value_is_updating_as_nodata` is not valid for the variable `WLP_LOGGING_CONSOLE_FORMAT`.';

        await editor.typeTextAt(1, 1, configNameSnippet);
        await utils.delay(5000);
        //open the assistant
        await utils.callAssitantAction(editor, envCfgNameChooserSnippet);
        // close the assistant
        await editor.toggleContentAssist(false);

        await editor.typeTextAt(1, 27, insertConfig);
        const focusTargetElement = editor.findElement(By.xpath("//*[contains(text(), 'nodata')]"));
        await utils.delay(3000);
        focusTargetElement.click();
        await editor.click();

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: focusTargetElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log("Hover text is:" + hoverValue);

        assert(hoverValue.includes(expectedHoverData), 'Did not get expected diagnostic as expected in server.env file');
        await editor.clearText();
        await utils.closeEditor(constants.SERVER_ENV);

    }).timeout(35000);

    after(() => {
        utils.removeDirectoryByPath(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config2'));
        console.log("Removed new config folder:");
    });

});