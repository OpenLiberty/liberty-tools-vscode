/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { TextEditor, EditorView, VSBrowser, By } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as path from 'path';
import * as assert from 'assert';

describe('LSP4Jakarta LS test for snippet test', () => {

    let editor: TextEditor;

    it('check if correct code is inserted when rest_class snippet is triggered',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource.java"));
        
        editor = await new EditorView().openEditor('SystemResource.java') as TextEditor;

        const textPressent = await editor.getText();
        if(textPressent.length > 0){
            await editor.clearText();
        }

        await utils.delay(85000);
        await editor.typeText("rest");
        await utils.delay(6000);

        //open the assistant
        const assist = await editor.toggleContentAssist(true);
        await utils.delay(6000);
        // toggle can return void, so we need to make sure the object is present
        if (assist) {
            // to select an item use
            await assist.select('rest_class');
        }
        await utils.delay(6000);

        // close the assistant
        await editor.toggleContentAssist(false);

        const insertedCode = await editor.getText();
        await utils.delay(6000);
        assert(insertedCode.includes('public String methodname() {'), 'Snippet rest_class was not inserted correctly.');

        await editor.clearText();
        await editor.save();
    }).timeout(475000);

    it('check for diagnostic support',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource2.java"));

        editor = await new EditorView().openEditor('SystemResource2.java') as TextEditor;

        let insertedCode = await editor.getText();
        // change the resource method from public to private
        insertedCode = insertedCode.replace("public String", "private String");
        await editor.setText(insertedCode);
        await utils.delay(6000);

        const flaggedString = await editor.findElement(By.xpath("//*[contains(text(), \"methodname\")]"));

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flaggedString }).perform();
        await utils.delay(6000);

        const hoverValue = await editor.findElement(By.className('hover-row status-bar'));

        const viewProblemLink = await hoverValue.findElement(By.xpath("//*[contains(text(), 'View Problem')]"));
        await viewProblemLink.click();

        const fixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Only public methods can be exposed as resource methods\")]"));
        await utils.delay(6000);
        const diagnostic = await fixOption.getText();

        assert(diagnostic.includes("Only public methods can be exposed as resource methods"), "Did not find diagnostic help text.");

        // change back to original state
        insertedCode = insertedCode.replace("private String", "public String");
        await editor.clearText();
        await editor.setText(insertedCode);
        await utils.delay(4000);
    }).timeout(475000);

    it('check for qucikfix support',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource2.java"));

        editor = await new EditorView().openEditor('SystemResource2.java') as TextEditor;

        let insertedCode = await editor.getText();
        // change the resource method from public to private
        insertedCode = insertedCode.replace("public String", "private String");
        await editor.setText(insertedCode);
        await utils.delay(3000);

        const flaggedString = await editor.findElement(By.xpath("//*[contains(text(), \"methodname\")]"));

        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: flaggedString }).perform();
        await utils.delay(6000);

        const driver = VSBrowser.instance.driver;
        const hoverValue = await editor.findElement(By.className('hover-row status-bar'));

        const quickFixPopupLink = await hoverValue.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
        await quickFixPopupLink.click();

        const pointerBlockElementt = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockElementt) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockElementt);
        } else {
            console.log('Element not found!');
        }
        const fixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Make method public\")]"));
        await fixOption.click();
        await utils.delay(6000);

        const updatedContent = await editor.getText();
        assert(updatedContent.includes('public String methodname'), 'quick fix not applied correctly.');
        await utils.delay(6000);

        // change back to original state
        insertedCode = insertedCode.replace("private String", "public String");
        await editor.clearText();
        await editor.setText(insertedCode);
        await utils.delay(4000);
    }).timeout(475000);

});