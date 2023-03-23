import path = require('path');
import { Workbench, ViewSection,InputBox, DefaultTreeItem } from 'vscode-extension-tester';
import * as fs from 'fs';
import { MAVEN_PROJECT,STOP_DASHBOARD_ACTION,START_DASHBOARD_ACTION, START_DASHBOARD_MAC_ACTION, STOP_DASHBOARD_MAC_ACTION,START_DASHBOARD_ACTION_WITH_PARAM, START_DASHBOARD_MAC_ACTION_WITH_PARAM, START_DASHBOARD_ACTION_WITHDOCKER, START_DASHBOARD_MAC_ACTION_WITHDOCKER, ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION, ATTACH_DEBUGGER_DASHBOARD_ACTION } from '../definitions/constants';
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
  export async function launchStartServerWithDocker(sectionName: ViewSection) {

    console.log("Launching Start Server action");
    await sectionName.expand();
    console.log("after section");
    const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;
    expect(item).not.undefined;   

    if (process.platform === 'darwin') {//Only for MAC platform      
      await MapContextMenuforMac( item,START_DASHBOARD_MAC_ACTION_WITHDOCKER);      
      return true;
    } else { // NON MAC platforms      
      const menuItem = await item?.openContextMenu();  
      await menuItem?.select(START_DASHBOARD_ACTION_WITHDOCKER);
    
  }
  
  }

  export async function launchStartServerWithParam(sectionName: ViewSection) {

    console.log("Launching Start Server action");
    const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;
    expect(item).not.undefined;  
    if (process.platform === 'darwin') {//Only for MAC platform 
      
      await MapContextMenuforMac( item,START_DASHBOARD_MAC_ACTION_WITH_PARAM);      
      return true;
    } else { // NON MAC platforms      
      const menuItem = await item?.openContextMenu();  
      await menuItem?.select(START_DASHBOARD_ACTION_WITH_PARAM);
    
  } 
  
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
          console.log("file doesnt exist");
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


/* Liberty Attach Debugger*/
export async function attachDebugger(sectionName: ViewSection) {

  console.log("Attach Debugger action with Project  : " + MAVEN_PROJECT);
  await sectionName.expand();

  const item = await sectionName.findItem(MAVEN_PROJECT) as DefaultTreeItem;
  expect(item).not.undefined;

  if (process.platform === 'darwin') {//Only for MAC platform
    console.log("For Mac platforms ");
    await MapContextMenuforMac(item, ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);
    await delay(5000);
    return true;
  } else { // NON MAC platforms
    console.log("For Non Mac platforms ");
    const menuItem = await item?.openContextMenu();
    await menuItem?.select(ATTACH_DEBUGGER_DASHBOARD_ACTION);
    console.log("Attach Debugger action for Windows done");
  }

}

/* Stop Server Liberty dashboard post Attach Debugger*/
export async function stopLibertyserver() {
  console.log("Stop Server action for project");
  const workbench = new Workbench();
  await workbench.executeCommand(STOP_DASHBOARD_MAC_ACTION);
  const input = InputBox.create();
  (await input).setText(MAVEN_PROJECT);
  (await input).confirm();
  (await input).click();
  await delay(15000);
}