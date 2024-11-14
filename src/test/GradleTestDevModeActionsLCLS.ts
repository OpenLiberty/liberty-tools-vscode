
import { EditorView, SideBarView, TextEditor, VSBrowser, MarkerType, BottomBarPanel } from "vscode-extension-tester";
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import { By, until } from 'selenium-webdriver';
import { moveCursor } from "readline";

const { Keys } = require('vscode-extension-tester');
const path = require('path');
const assert = require('assert');

describe('Quick Fix Test for Server XML', function () {
    let editor: TextEditor;
    let filePath: string;
    let originalContent: string;

    it('should apply quick fix for invalid value in server.xml', async () => {
        // Step 1: Open the project and file
        const section = await new SideBarView().getContent().getSection(constants.GRADLE_PROJECT);
        section.expand();
        await VSBrowser.instance.openResources(path.join(utils.getGradleProjectPath(), 'src', 'main', 'liberty', 'config', 'server.xml'));

        // Step 2: Open the editor
        editor = await new EditorView().openEditor('server.xml') as TextEditor;
        originalContent = await editor.getText();


        
        const wrongtext = "<logging appsWriteJson = \"wrong\" />";
        await editor.typeTextAt(17, 5, wrongtext);
        await utils.delay(8000);  
        const element = editor.findElement(By.xpath("//*[contains(text(), '\"wrong\"')]"));
        await utils.delay(5000);  
        console.log("element value:" + element);
        element.click();
        const tagname = element.getTagName();
        console.log("tagname:" + tagname);
        await editor.click();  
        console.log("uafter editor click");

        const el = await editor.moveCursor(17, 35);

        const actions = VSBrowser.instance.driver.actions();
        const quickfi = await actions.move({ origin: element }).perform();

        await utils.delay(2000);

        // const eleme = editor.findElement(By.);
        const driver = VSBrowser.instance.driver;
        const quickFixPopupLink =  editor.findElement(By.className('hover-row status-bar'));
        console.log("uafter quickFixPopupLink");
        await utils.delay(3000);  
        const elem=await quickFixPopupLink.findElement(By.xpath("//*[contains(text(), 'Quick Fix... (⌘.)')]"));
        
        await utils.delay(2000);  
        elem.click();
        console.log("uafter elem");
        const val=editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        console.log("uafter val");
        await utils.delay(2000);  

        const actionList= await val.findElement(By.className('actionList'));
        await utils.delay(2000);  
        // // val.click();
        // const t=ele.isDisplayed();
        // console.log("uafter t value "+t);
        // const v= await ele.findElement(By.xpath("//*[contains(text(), 'false')]"));
        // await utils.delay(2000); 
        // const ds=v?.isDisplayed();
        // console.log("uafter displayed "+ds);
        // v.click();
        // await utils.delay(2000); 
        //  const assistant = await editor.toggleContentAssist(true);
		// await utils.delay(2000); 
		// if (assistant) {
        //     await utils.delay(5000); 
		// 	// const ele=await assistant.click('Replace with \'false\'');
        //     const ele=await assistant.select('Replace with \'true\'');
        //     await assistant.getText();
        //     // ele?.click;
        //     console.log('after ele click'+ele);
        //     // const e=await assistant.select('false');
		// }
        // await editor.toggleContentAssist(false);
        // await editor.getDriver().actions().sendKeys(Keys.CONTROL, '.').perform();
        // await utils.delay(2000);  // Wait for the quick fix menu to appear
    
        // // Select the first quick fix option (e.g., 'Replace with false')
        // const quickFixOption = await VSBrowser.instance.driver.findElement(By.name("//*[contains(text(), 'Replace with \'false\'')]"));
        // await utils.delay(1000); 
        // await quickFixOption.click(); 
        
        const fixOption = await actionList.findElement(By.xpath("//*[contains(text(), \"'false'\")]"));
        const loc=fixOption.getLocation;
          console.log("before displayed "+loc);
        // v.click();
        if(await fixOption.isSelected()){
            
            fixOption.click();
             console.log("uafter displayed ");
      
        }
        await utils.delay(5000); 
        const updatedContent = await editor.getText();
        assert.notStrictEqual(updatedContent, originalContent, 'Content should be updated after applying quick fix');
    }).timeout(150000);
});
