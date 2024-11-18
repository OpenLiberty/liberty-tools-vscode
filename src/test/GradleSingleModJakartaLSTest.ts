import { TextEditor, EditorView, VSBrowser, TitleBar, BottomBarPanel, MarkerType } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as path from 'path';
import * as assert from 'assert';

describe('LSP4Jakarta LS test for snippet test', () => {

    let editor: TextEditor;
    let titleBar: TitleBar;
    let bottomBar: BottomBarPanel;

    before(() => {
		titleBar = new TitleBar();
        bottomBar = new BottomBarPanel();
	});

    it('check if correct code is inserted when rest_class snippet is triggered',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource.java"));
        
        editor = await new EditorView().openEditor('SystemResource.java') as TextEditor;

        const textPressent = await editor.getText();
        if(textPressent.length > 0){
            editor.clearText();
        }

        editor.typeText("rest");

        //open the assistant
        const assist = await editor.toggleContentAssist(true);
		// toggle can return void, so we need to make sure the object is present
		if (assist) {
			// to select an item use
			await assist.select('rest_class')
		}

		// close the assistant
		await editor.toggleContentAssist(false);

        const insertedCode = await editor.getText();
        assert(insertedCode.includes('public String methodname() {'), 'Snippet rest_class was not inserted correctly.');

        await editor.clearText();
        await editor.save();
    }).timeout(275000);

    it('check for diagnostic support',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource2.java"));
        
        editor = await new EditorView().openEditor('SystemResource2.java') as TextEditor;

        let insertedCode = await editor.getText();
        // change the resource method from public to private
        insertedCode = insertedCode.replace("public String", "private String");
        await editor.setText(insertedCode);
        await utils.delay(3000);

        // opeining the problem window
        const problemsView = await bottomBar.openProblemsView();
        // filtering the problems with type error
        const errors = await problemsView.getAllVisibleMarkers(MarkerType.Error);
        await utils.delay(3000);
        let privateMethodError = false;
        // iterates through errors array and find whether the error Only public methods can be exposed as resource methods exists or not
        errors.forEach(async (value) => {
            const label = await value.getText();
            console.log("label: ", label);
            if(label.includes("Only public methods can be exposed as resource methods")){
                privateMethodError = true;
            }
        });
        await utils.delay(5000);

        assert(privateMethodError, "Did not find diagnostic help text.");

        // change back to original state
        insertedCode = insertedCode.replace("private String", "public String");
        await editor.clearText();
        await editor.setText(insertedCode);
        await bottomBar.closePanel();
        await utils.delay(2000);

    }).timeout(275000);

});