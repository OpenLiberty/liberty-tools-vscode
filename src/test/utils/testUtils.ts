import path = require('path');
import { Workbench, ViewSection,InputBox, DefaultTreeItem } from 'vscode-extension-tester';
import * as fs from 'fs';
import { MAVEN_PROJECT, RUN_TESTS_STRING,STOP_DASHBOARD_MAC_ACTION  } from '../definitions/constants';
import { expect } from "chai";
import { MapContextMenuforMac } from './macUtils';
import * as clipboard from 'clipboardy';

export function delay(millisec: number) {
    return new Promise( resolve => setTimeout(resolve, millisec) );
}

export function getMvnProjectPath(): string {
    const mvnProjectPath = path.join(__dirname, "..","..","..","src", "test","resources", "mavenProject");  
    console.log("Path is : "+mvnProjectPath)  ;
    return mvnProjectPath; 
  }

 
 
  export async function launchDashboardAction(sectionName: ViewSection, action: string, actionMac: string) {

    console.log("Launching action:" + action);    
    const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;   
    expect(item).not.undefined;   
  
    if (process.platform === 'darwin') {//Only for MAC platform      
      await MapContextMenuforMac( item,actionMac);            
    } else {  // NON MAC platforms
      const menuItem = await item?.openContextMenu();  
      await menuItem?.select(action);
    }

  }
 

  export async function setCustomParameter(customParam: string) {

    console.log("Setting custom Parameter");    
    const input = new InputBox(); 
    await input.click();   
    await input.setText(customParam);      
    await input.confirm();       
  
  }

  export async function chooseCmdFromHistory(): Promise<Boolean> {

    console.log("Choosing command from history");    
    const input = new InputBox(); 
    const pick = await input.findQuickPick('-DhotTests=true'); 
    if (pick){
      await pick.select();    
      await input.confirm(); 
      return true;
    }
    else     
      return false; 
  }

  export async function deleteReports() : Promise<Boolean> {

    const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
    if (fs.existsSync(reportPath) )
    {
      fs.unlink(reportPath, (err) => {
        if (err) 
        return false; 
        else{
        console.log(reportPath+ ' was deleted');
        return true;
        }
        });               
    }    
      return true;   
    }

  export async function checkIfTestFileExists() : Promise<Boolean> {
    const maxAttempts = 10;
    let foundReport = false;
    const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
    for (let i = 0; i < maxAttempts; i++) {
      try {
                
          if (fs.existsSync(reportPath)) 
          {
            foundReport = true;
            break;
          }
          else{
            await delay(5000);
            foundReport = false;
            continue;
          }      
      }
      catch(e)
      {
        console.error("Caught exception when checking for test report", e);

      }
    }
    return foundReport;
    }
  
    
  
  export async function checkTerminalforServerState(serverStatusCode : string ): Promise <Boolean> {
    const workbench = new Workbench();
    let  foundText = false;
    let count=0;    
    do{
      clipboard.writeSync('');//clean slate for clipboard
      await workbench.executeCommand('terminal select all');      
      const text = clipboard.readSync();         
      if( text.includes(serverStatusCode)){
        foundText = true;
        console.log("Found text "+ serverStatusCode);
        break;
      }
      else if(text.includes("FAILURE"))
      {     
        foundText = false;             
        break;      
      }
      else
        foundText = false;
      count++;   
      await workbench.getDriver().sleep(10000);
    } while(!foundText && (count <= 20));
    await workbench.executeCommand('terminal clear');
    return foundText;
  }
  

  export async function checkTestStatus(): Promise <Boolean>{
    const workbench = new Workbench();
    let  foundText = false;
    let count=0;    
    do{
      clipboard.writeSync('');
      await workbench.executeCommand('terminal select all');      
      const text = clipboard.readSync();         
      if( text.includes(RUN_TESTS_STRING)){
        foundText = true;
        console.log("Found text "+ RUN_TESTS_STRING);
        break;
      }      
      else
        foundText = false;
      count++;   
      await workbench.getDriver().sleep(2000);
    } while(!foundText && (count <= 5));
    await workbench.executeCommand('terminal clear');
    return foundText;
  }

  

/* Stop Server Liberty dashboard post Attach Debugger*/
/* As the Window view changes using command to stop server instead of devmode action */
export async function stopLibertyserver() {
  console.log("Stop Server action for MAVEN_PROJECT : " + MAVEN_PROJECT);
  const workbench = new Workbench();
  await workbench.executeCommand(STOP_DASHBOARD_MAC_ACTION);
  const input = InputBox.create();
  (await input).setText(MAVEN_PROJECT);
  (await input).confirm();
  (await input).click();
  await delay(10000);

}
  