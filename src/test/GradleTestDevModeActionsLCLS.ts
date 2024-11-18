
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
        
        const updatedContent = await editor.getText();
        await utils.delay(3000);
        console.log("Content after Quick fix : ", updatedContent);
        assert(updatedContent.includes(correcttext), 'quick fix not applied correctly.');
    }).timeout(25000);  
});
