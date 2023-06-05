'use strict';

import {
    DefaultTreeItem, Workbench,
    InputBox,
} from "vscode-extension-tester";


// NOTE: For MAC OS, Open issue with vscode-extension-tester for ContextMenu Click -> https://github.com/redhat-developer/vscode-extension-tester/issues/444
// So workaround using InputBOx to Map the contextmenu input to its corresponding Action for MAC till the issue is resolved in tool
export async function MapContextMenuforMac(item: DefaultTreeItem, MapAction: string): Promise<boolean> {
    console.log("before item.click");
    await item.click();
    console.log("before new workbench");
    const workbench = new Workbench();
    console.log("before open commandprompt");
   
    await workbench.openCommandPrompt();
    console.log("before setInputBox");
   
    return await setInputBox(`${MapAction}`);
}
export async function setInputBox(MapActionString: string): Promise<boolean> {

    console.log("before InputBox create");
    
    const input = await InputBox.create();

   // InputBox.
    if (typeof MapActionString === "string") {
        console.log("before settext");
        const input = new InputBox();     
    const pick = await input.findQuickPick(MapActionString);    
    if (pick){
      await pick.select();    
      await input.confirm();       
      return true;
    }
    else     
      return false; 
  }
       
      //  await input.click();
     /*   await input.setText(MapActionString);
        console.log("before confirm");
        await input.confirm();
        console.log("before click");
        await input.click();
        console.log("after click");
       */
      //  await input.selectQuickPick(MapActionString) ;
       // await input.confirm();
       
       // return true;
     else {
        return false;
    }
}