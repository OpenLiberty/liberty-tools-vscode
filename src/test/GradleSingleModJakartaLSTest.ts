import { TextEditor, EditorView, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs'

describe('LSP4Jakarta LS test for snippet test', () => {

    let editor: TextEditor;

    it('check if correct code is inserted when rest_class snippet is triggered',  async() => {
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), "src", "main", "java", "test", "gradle", "liberty", "web", "app", "SystemResource.java"));
        
        editor = await new EditorView().openEditor('SystemResource.java') as TextEditor;

        const textPressent = await editor.getText();
        if(textPressent.length > 0){
            await editor.clearText();
        }

        await utils.delay(9000);
        await editor.typeText("rest");
        await utils.delay(6000);

        //open the assistant
        const assist = await editor.toggleContentAssist(true);
        await utils.delay(6000);
        await VSBrowser.instance.takeScreenshot("rest_class");
        console.log("screenshot", VSBrowser.instance.getScreenshotsDir());
		// toggle can return void, so we need to make sure the object is present
		if (assist) {
			// to select an item use
			await assist.select('rest_class');
            console.log("assist selected");
		}
        await utils.delay(6000);

		// close the assistant
		await editor.toggleContentAssist(false);

        const insertedCode = await editor.getText();
        await utils.delay(6000);
        assert(insertedCode.includes('public String methodname() {'), 'Snippet rest_class was not inserted correctly.');

        // await editor.clearText();
        // await editor.save();
    }).timeout(475000);

    after(() => {
        const sourcePath = VSBrowser.instance.getScreenshotsDir();
        const destinationPath = './images';

        copyFolderContents(sourcePath, destinationPath);
    });

    function copyFolderContents(sourceFolder: string, destinationFolder: string): void {
        console.log('source folder', sourceFolder);
        if (!fs.existsSync(sourceFolder)) {
            throw new Error('Source folder does not exist');
        }

        if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder);
        }
        console.log('destination folder', destinationFolder);

        const files = fs.readdirSync(sourceFolder);
        console.log('files to copy', files);

        for (const file of files) {
            const sourcePath = path.join(sourceFolder, file);
            const destinationPath = path.join(destinationFolder, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                copyFolderContents(sourcePath, destinationPath);
            } else {
                fs.copyFileSync(sourcePath, destinationPath);
            }
        }
    }

});