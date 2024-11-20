import { TextEditor, EditorView, VSBrowser, BottomBarPanel, MarkerType, By } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as path from 'path';
import * as assert from 'assert';

describe('LSP4Jakarta LS test for snippet test', () => {

    let editor: TextEditor;
    let bottomBar: BottomBarPanel;

    before(() => {
        bottomBar = new BottomBarPanel();
	});

    it('check if correct code is inserted when rest_class snippet is triggered',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource.java"));
        
        editor = await new EditorView().openEditor('SystemResource.java') as TextEditor;

        const textPressent = await editor.getText();
        if(textPressent.length > 0){
            await editor.clearText();
        }

        await editor.typeText("rest");

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
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverValue = await editor.findElement(By.className('hover-row status-bar'));

        const quickFixPopupLink = await hoverValue.findElement(By.xpath("//*[contains(text(), 'Quick Fix')]"));
        await quickFixPopupLink.click();

        const hoverBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverBar.findElement(By.className('actionList'));

        const pointerBlockElementt = await driver.findElement(By.css('.context-view-pointerBlock'));
        // Setting pointer block element display value as none to choose option from Quickfix menu
        if (pointerBlockElementt) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockElementt);
        } else {
            console.log('pointerBlockElementt not found!');
        }
        const fixOption = await editor.findElement(By.xpath("//*[contains(text(), \"Make method public\")]"));
        await fixOption.click();
        await utils.delay(3000);

        const updatedContent = await editor.getText();
        assert(updatedContent.includes('public String methodname'), 'quick fix not applied correctly.');
        await utils.delay(3000);

        // change back to original state
        insertedCode = insertedCode.replace("private String", "public String");
        await editor.clearText();
        await editor.setText(insertedCode);
        await utils.delay(2000);
    }).timeout(275000);

});