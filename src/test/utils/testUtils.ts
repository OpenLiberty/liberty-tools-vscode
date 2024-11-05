import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog } from 'vscode-extension-tester';
import * as fs from 'fs';
import { MAVEN_PROJECT, STOP_DASHBOARD_MAC_ACTION  } from '../definitions/constants';
import { MapContextMenuforMac } from './macUtils';
import clipboard = require('clipboardy');
import { expect } from 'chai';
import * as fse from 'fs-extra';

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
export async function stopLibertyserver() {
  console.log("Stop Server action for MAVEN_PROJECT : " + MAVEN_PROJECT);
  const workbench = new Workbench();
  await workbench.executeCommand(STOP_DASHBOARD_MAC_ACTION);
  const input = InputBox.create();
  (await input).clear();
  (await input).setText(MAVEN_PROJECT);
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
 * Function return project name with space
 */
export function getNewGradleProjectNameWithSpace(): any {
  const gradleProjectPath = path.join(__dirname, "..","..","..","src","test","resources","gradleproject", "liberty.gradle.te st.wrapper.app");

  return gradleProjectPath;
}

/**
 * Create new gradle project name with space in the directory
 */

export async function  renameProject(): Promise<void>{
  fse.copy(getGradleProjectPath(),getNewGradleProjectNameWithSpace())
    .then(()=> console.log("Project renamed.,  Gradle Project path is :"+getNewGradleProjectNameWithSpace()))
    .catch(err => console.log("Error renaming the project"));  
  }

/**
 * Remove newly created Project folder with content
 */

export async function removeProjectFolder(projectPath: string): Promise<void> {
  try {
    await fs.accessSync(projectPath);
    const projectFiles = await fs.readdirSync(projectPath);
    await Promise.all(
      projectFiles.map(async (projectFile) => {
            const projectFilePath = path.join(projectPath, projectFile);
            const stats = await fs.lstatSync(projectFilePath); 
            
            if (stats.isDirectory()) {
                await removeProjectFolder(projectFilePath);
            } else {
                await fs.unlinkSync(projectFilePath);
            }
        })
    );
    await fs.rmdirSync(projectPath);
  } catch (error) {
      console.error(`Error removing project folder: ${error}`);
  }
}
/**
 * Function return project path with space
 */
export function getGradleProjectPathDirWithSpace(): any {
  const gradleProjectPath = path.join(__dirname, "..","..","..","src", "test","resources","gradle project", "liberty.gradle.test.wrapper.app");   
  console.log("Gradle project path is: "+gradleProjectPath);

  return gradleProjectPath;
}
/**
 * Create new gradle project with space in the directory
 */
export function createGradleProjectPathWithSpace(): void {
  const existingGradleProjectPath = path.join(__dirname, "..","..","..","src", "test","resources");  

  const sourcepath=path.join(existingGradleProjectPath, 'gradle');
  const gradleProjectFolder = path.join(existingGradleProjectPath, 'gradle project'); 

  /* function will copy gradle project from existing gradle project */
  copyDirectoryAndProject(sourcepath, gradleProjectFolder);
  const gradleProjectPath = path.join(__dirname, "..","..","..","src", "test","resources","gradle project", "liberty.gradle.test.wrapper.app");
  console.log("Gradle project copy created - path: "+gradleProjectPath);

}  
/**
 * Function to create new folder and create a copy of the project
 */
async function copyDirectoryAndProject(src : string, dest : string){
  try {
      await fs.mkdirSync(dest, { recursive: true });

      const projectFiles = await fs.readdirSync(src, { withFileTypes: true });

      for (const projectFile of projectFiles) {
          const srcPath = path.join(src, projectFile.name);
          const destPath = path.join(dest, projectFile.name);

          if (projectFile.isDirectory()) {
              await copyDirectoryAndProject(srcPath, destPath);
          } else {
            await fs.copyFileSync(srcPath, destPath);
        }
      }
  } catch (err) {
      console.error(`Error copying project directory: ${err}`);
  }
}
/**
 * Function return project path with space
 */
export function getMvnProjectDirWithSpace(): any {

  const mavenProjectPath = path.join(__dirname, "..","..","..","src", "test","resources","maven project", "liberty.maven.test.wrapper.app");

  console.log("Maven project path is  ",mavenProjectPath);
  return mavenProjectPath;
}  
/*
* Create new maven project with space in the directory
*/
export function createMvnProjectPathWithSpace(): void {
 const existingMavenProjectPath = path.join(__dirname, "..","..","..","src", "test","resources");  

 const sourcepath=path.join(existingMavenProjectPath, 'maven');
 const mavenProjectFolder = path.join(existingMavenProjectPath, 'maven project'); 

 /* function will copy Maven project from existing Maven project */
 copyDirectoryAndProject(sourcepath, mavenProjectFolder);
 const mavenProjectPath = path.join(__dirname, "..","..","..","src", "test","resources","maven project", "liberty.maven.test.wrapper.app");
 console.log("Maven project copy created - path: ",mavenProjectPath);

}