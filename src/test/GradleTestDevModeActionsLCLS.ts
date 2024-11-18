
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

        const wrongtext = "<logging appsWriteJson = \"wrong\" />";
        const correcttext = "<logging appsWriteJson = \"false\" />";
        await editor.typeTextAt(17, 5, wrongtext);
        await utils.delay(2000);
        const LoggingTagElement = editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(3000);
        LoggingTagElement.click();
        await editor.click();
        const actions = VSBrowser.instance.driver.actions();
        await actions.move({ origin: LoggingTagElement }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverValue = editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverValue.findElement(By.xpath("//*[contains(text(), 'Quick Fix... (⌘.)')]"));
        quickFixPopupLink.click();

        const hoverBar = editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        const actionList = await hoverBar.findElement(By.className('actionList'));
        actionList.click();

        await utils.delay(2000);
        
        const updatedContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedContent);
        assert(updatedContent.includes(correcttext), 'quick fix not applied correctly.');
    }).timeout(25000);
});
