import path = require('path');
import { BottomBarPanel, TerminalView, ViewItem, ViewSection } from 'vscode-extension-tester';
import * as fs from 'fs';
import { MAVEN_PROJECT,STOP_DASHBOARD_ACTION,START_DASHBOARD_ACTION } from '../definitions/constants';
import { expect } from "chai";

export function delay(millisec: number) {
    return new Promise( resolve => setTimeout(resolve, millisec) );
}

export function getMvnProjectPath(): string {
    const mvnProjectPath = path.join(__dirname, "\\..\\..\\..\\src", "test\\resources", "mavenProject");    
    return mvnProjectPath; 
  }

  export function getMvnProjectLogPath(): string {
    const mvnProjectLogPath = path.join(getMvnProjectPath()+"\\target\\liberty\\wlp\\usr\\servers\\defaultServer\\logs\\messages.log");    
    return mvnProjectLogPath; 
  }
 
 

  export async function launchStopServer(sectionName: ViewSection) {
    
    console.log("Launching Stop Server action");
    const item = await sectionName.findItem(MAVEN_PROJECT);    
    expect(item).not.undefined;   
    const menuItem = await item?.openContextMenu();  
    await menuItem?.select(STOP_DASHBOARD_ACTION);
  
  }

  export async function launchStartServer(sectionName: ViewSection) {

    console.log("Launching Start Server action");
    const item = await sectionName.findItem(MAVEN_PROJECT);
    expect(item).not.undefined;   
    const menuItem = await item?.openContextMenu();  
    await menuItem?.select(START_DASHBOARD_ACTION);
  
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
  