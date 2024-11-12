import { EditorView, SideBarView, TextEditor, VSBrowser, BottomBarPanel, MarkerType, Workbench } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';

const { Keys } = require('vscode-extension-tester');
const path = require('path');
const assert = require('assert');

describe('Quick Fix Test for Server XML', function () {
    let editor: TextEditor;
    let filePath: string;
    let originalContent: string;

    // before(async function () {

    // });
    it('should apply quick fix for invalid value in server.xml', async () => {


        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config', 'server.xml'))

        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        originalContent = await editor.getText();
        const wrongtext = "<logging appsWriteJson = \"wrong\" />";
        await editor.typeTextAt(17, 5, wrongtext);
        await utils.delay(15000);

        // await editor.moveCursor(17, 33);

        //     await utils.delay(30000);
        //     await editor.moveCursor(17, 1);
        //     await utils.delay(30000);

        //     await editor.click(); 



        const problemsView = await new BottomBarPanel().openProblemsView();
        await utils.delay(30000);
        console.log("Problems view :" + problemsView)

        const errors = await problemsView.getAllVisibleMarkers(MarkerType.Any);
        await utils.delay(30000);
        // await problemsView.collapseAll();
        // const markers = await problemsView.getAllVisibleMarkers(MarkerType.Any);
        const error = errors[1];
        await utils.delay(30000);
        const text = await error.getText();

        console.log("updated text marker:" + text)
        const correctedStanza = '<logging appsWriteJson="true" />';
        const updatedContent = await editor.getText();
        if (text == 'cvc-datatype-valid.1.2.3: \'wrong\' is not a valid value of union type \'booleanType\'.') {
            console.log("updated content:" + text)

        }
        console.log("updated content:" + updatedContent)
        assert(updatedContent.includes(correctedStanza), 'The server.xml was not corrected with the expected quick fix.');



    }).timeout(100000);

    after(async function () {
        await editor.clearText();
        await editor.setText(originalContent);
        editor.save();
    });
});
