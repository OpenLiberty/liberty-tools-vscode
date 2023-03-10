import path = require('path');
import { Workbench, ViewSection,InputBox, DefaultTreeItem } from 'vscode-extension-tester';
import * as fs from 'fs';
import { MAVEN_PROJECT,STOP_DASHBOARD_ACTION,START_DASHBOARD_ACTION, START_DASHBOARD_MAC_ACTION, STOP_DASHBOARD_MAC_ACTION,START_DASHBOARD_ACTION_WITH_PARAM } from '../definitions/constants';
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

  export function getMvnProjectLogPath(): string {
    const mvnProjectLogPath = path.join(getMvnProjectPath(),"target","liberty","wlp","usr","servers","defaultServer","logs","messages.log");  
    console.log ("Liberty log looked up from : "+ mvnProjectLogPath)  ;
    return mvnProjectLogPath; 
  }
 
 

  export async function launchStopServer(sectionName: ViewSection) {
    
    console.log("Launching Stop Server action");    
    const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;   
    expect(item).not.undefined;   
  
    if (process.platform === 'darwin') {//Only for MAC platform      
      await MapContextMenuforMac( item,STOP_DASHBOARD_MAC_ACTION);      
      return true;
    } else {  // NON MAC platforms
      const menuItem = await item?.openContextMenu();  
      await menuItem?.select(STOP_DASHBOARD_ACTION);
}
  
  }
  export async function launchStartServer(sectionName: ViewSection) {

    console.log("Launching Start Server action");
    await sectionName.expand();
    const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;
    expect(item).not.undefined;   

    if (process.platform === 'darwin') {//Only for MAC platform      
      await MapContextMenuforMac( item,START_DASHBOARD_MAC_ACTION);      
      return true;
    } else { // NON MAC platforms      
      const menuItem = await item?.openContextMenu();  
      await menuItem?.select(START_DASHBOARD_ACTION);
    
  }
  
  }

  export async function launchStartServerWithParam(sectionName: ViewSection) {

    console.log("Launching Start Server action");
    const item = await sectionName.findItem(MAVEN_PROJECT);
    expect(item).not.undefined;   
    const menuItem = await item?.openContextMenu();  
    await menuItem?.select(START_DASHBOARD_ACTION_WITH_PARAM); 
    
  
  }

  export async function setCustomParameter(customParam: string) {

    console.log("Setting custom Parameter");
    const input = new InputBox();
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

  export async function checkIfTestFileExists() : Promise<Boolean> {

    if (fs.existsSync(path.join(getMvnProjectPath()+"\\target\\site\\surefire-report.html"))) 
      return true;   
    else
      return false;   
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
  

  export async function validateIfServerStopped(): Promise<Boolean> {

    const maxAttempts = 20;
    let foundStoppedMsg = false;
    const mvnProjectLogPath = getMvnProjectLogPath();
    for (let i = 0; i < maxAttempts; i++) {
      try {
        //if (fs.existsSync(mvnProjectLogPath)) {          
          const logContents = fs.readFileSync(mvnProjectLogPath, 'utf-8');
          if (logContents.includes("CWWKE0036I")) {
            foundStoppedMsg = true;
            break;
          }
          else{
            await delay(5000);
            foundStoppedMsg = false;
            continue;
          }
      /*  }
        else {
          await delay(5000);
          foundStoppedMsg = false;
          continue;
        }*/
      }
      catch(e)
      {
        console.error("Caught exception waiting for stop Server", e);

      }
    }
    return foundStoppedMsg;
}   
  
  

  export async function validateIfServerStarted(): Promise<Boolean> {

    const maxAttempts = 30;
    let foundStartedMsg = false;
    const mvnProjectLogPath = getMvnProjectLogPath();
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (fs.existsSync(mvnProjectLogPath)) {
          console.log("file exists");
          const logContents = fs.readFileSync(mvnProjectLogPath, 'utf-8');
          if (logContents.includes("CWWKZ0001I")) {
            console.log("code exists");
            foundStartedMsg = true;
            break;
          }
          else{
            await delay(5000);
            foundStartedMsg = false;
            console.log("code doesnt exist");
            continue;
          }
        }
        else {
          await delay(10000);
          foundStartedMsg = false;
          console.log("file doesnt exists");
          continue;
        }
      }
      catch(e)
      {
        console.error("Caught exception waiting for start Server", e);

      }
    }
    return foundStartedMsg;
}   

  