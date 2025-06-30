/**
 * Copyright (c) 2023, 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog, VSBrowser } from 'vscode-extension-tester';
import * as fs from 'fs';
import { STOP_DASHBOARD_MAC_ACTION  } from '../definitions/constants';
import { MapContextMenuforMac } from './macUtils';
import clipboard = require('clipboardy');
import { expect } from 'chai';
import * as constants from '../definitions/constants';

export function delay(millisec: number) {
    return new Promise( resolve => setTimeout(resolve, millisec) );
}

export function getMvnProjectPath(): string {
    const mvnProjectPath = path.join(__dirname, "..","..","..","src", "test","resources", "maven","liberty.maven.test.wrapper.app");  
    console.log("Path is : "+mvnProjectPath)  ;
    return mvnProjectPath; 
  }

  export function getGradleProjectPath(): string {
    const gradleProjectPath = path.join(__dirname, "..","..","..","src", "test","resources","gradle", "liberty.gradle.test.wrapper.app");  
    console.log("Path is : "+gradleProjectPath)  ;
    return gradleProjectPath; 
  }

 
 
  export async function launchDashboardAction(item: DefaultTreeItem, action: string, actionMac: string) {

    console.log("Launching action:" + action);  
    if (process.platform === 'darwin') {//Only for MAC platform      
      await MapContextMenuforMac( item,actionMac);            
    } else {  // NON MAC platforms    
      console.log("before contextmenu")  ;
      const menuItem = await item.openContextMenu(); 
      console.log("before select")  ; 
      await menuItem.select(action);
    }

  }
 

  export async function setCustomParameter(customParam: string) {

    console.log("Setting custom Parameter");    
    const input = new InputBox(); 
    await input.click();   
    await input.setText(customParam);      
    await input.confirm();       
  
  }

  export async function chooseCmdFromHistory(command: string): Promise<Boolean> {

    console.log("Choosing command from history");    
    const input = new InputBox();     
    const pick = await input.findQuickPick(command);    
    if (pick){
      await pick.select();    
      await input.confirm();       
      return true;
    }
    else     
      return false; 
  }

  export async function deleteReports(reportPath:  string) : Promise<Boolean> {

    //const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
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

  export async function checkIfTestReportExists(reportPath: string) : Promise<Boolean> {
    const maxAttempts = 10;
    let foundReport = false;
    //const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
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
      console.log("debug:" + text)      ;
      if( text.includes(serverStatusCode)){
        foundText = true;
        console.log("Found text "+ serverStatusCode);
        break;
      }
      else if(text.includes("FAILURE"))
      {     
        console.log("Found failure "+ text);
        foundText = false;             
        break;      
      }
      else
      {
        console.log("test is running ...")
        foundText = false;
      }
      count++;   
      await workbench.getDriver().sleep(10000);
    } while(!foundText && (count <= 20));
    await workbench.executeCommand('terminal clear');
    return foundText;
  }
  

  export async function checkTestStatus(testStatus: string): Promise <Boolean>{
    const workbench = new Workbench();
    let  foundText = false;
    let count=0;    
    do{
      clipboard.writeSync('');
      await workbench.executeCommand('terminal select all');      
      const text = clipboard.readSync();         
      if( text.includes(testStatus)){
        foundText = true;
        console.log("Found text "+ testStatus);
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
export async function stopLibertyserver(projectName: string) {
  console.log("Stop Server action for Project : " + projectName);
  const workbench = new Workbench();
  await workbench.executeCommand(STOP_DASHBOARD_MAC_ACTION);
  const input = InputBox.create();
  (await input).clear();
  (await input).setText(projectName);
  (await input).confirm();
  (await input).click();
  await delay(10000);
}

export async function clearCommandPalette() {
  await new Workbench().executeCommand('Clear Command History');
  await delay(30000);  
  const dialog = new ModalDialog();
  const message = await dialog.getMessage();

  expect(message).contains('Do you want to clear the history of recently used commands?');
  
  const buttons =  await dialog.getButtons();
  expect(buttons.length).equals(2);
  await dialog.pushButton('Clear');
}

/**
 * Function clears the mvn plugin cache 
 */
export async function clearMavenPluginCache(): Promise<void> {
  // Check if the platform is Linux or macOS
  const homeDirectory = process.platform === 'linux' || process.platform === 'darwin' ? process.env.HOME // For Linux/macOS, use HOME
    : process.platform === 'win32' ? process.env.USERPROFILE // For Windows, use USERPROFILE
      : undefined; // In case the platform is unknown
  if (!homeDirectory) {
    throw new Error('Home directory not found');
  }
  const mavenRepoPath = path.join(homeDirectory, '.m2', 'repository', 'org', 'apache', 'maven', 'plugins');
  removeDirectoryByPath(mavenRepoPath);
}
 
export async function removeDirectoryByPath(projectPath: string): Promise<void> {
  try {
    await fs.promises.access(projectPath);
    const projectContent = await fs.promises.readdir(projectPath);

    await Promise.all(
      projectContent.map(async (projectFiles) => {
        const projectContentPath = path.join(projectPath, projectFiles);
        const stats = await fs.promises.lstat(projectContentPath);

        if (stats.isDirectory()) {
          await removeDirectoryByPath(projectContentPath);
        } else {
          await fs.promises.unlink(projectContentPath);
        }
      })
    );

    await fs.promises.rmdir(projectPath);
  } catch (error) {
    console.error(`Error removing new project: ${error}`);
  }
}

// General function to modify any file content using RegExp for searching
export async function modifyFileContent(filePath: string, searchPattern: RegExp, replaceString: string) {
  // Read the file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    // Check if the searchPattern matches any content in the file
    if (searchPattern.test(data)) {
      // Replace the matched content with the replaceString
      const updatedData = data.replace(searchPattern, replaceString);

      // Write the modified content back to the file
      fs.writeFile(filePath, updatedData, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to the file:', err);
        } else {
          console.log('File updated successfully');
        }
      });
    } else {
      console.log(`The pattern "${searchPattern}" was not found in the file.`);
    }
  });
}
 
// Method to close the open tabs 
export async function closeEditor() {
  const workbench = new Workbench();
  await workbench.executeCommand(constants.CLOSE_EDITOR);
}
 
// Method to execute the maven clean before the tests are executed
export async function executeMvnClean() {
  await VSBrowser.instance.openResources(path.join(getMvnProjectPath(), 'ForTest.md'));
  const workbench = new Workbench();
  await workbench.executeCommand('workbench.action.terminal.runSelectedText');
}

  