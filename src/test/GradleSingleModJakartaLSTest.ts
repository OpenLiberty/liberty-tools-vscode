import { TextEditor, EditorView, VSBrowser } from 'vscode-extension-tester';
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

        await editor.typeText("rest");
        await utils.delay(6000);

        //open the assistant
        const assist = await editor.toggleContentAssist(true);
        await utils.delay(6000);
		// toggle can return void, so we need to make sure the object is present
		if (assist) {
			// to select an item use
			await assist.select('rest_class')
		}
        await utils.delay(6000);

		// close the assistant
		await editor.toggleContentAssist(false);

        const insertedCode = await editor.getText();
        await utils.delay(6000);
        console.log("inserted text: ", insertedCode);
        assert(insertedCode.includes('public String methodname() {'), 'Snippet rest_class was not inserted correctly.');

        await editor.clearText();
        await editor.save();
    }).timeout(475000);

});