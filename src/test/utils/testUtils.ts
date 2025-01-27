import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog } from 'vscode-extension-tester';
import * as fs from 'fs';
import { STOP_DASHBOARD_MAC_ACTION  } from '../definitions/constants';
import { MapContextMenuforMac } from './macUtils';
import clipboard = require('clipboardy');
import { expect } from 'chai';

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
    fs.accessSync(projectPath);
    const projectContent = fs.readdirSync(projectPath);
    await Promise.all(
      projectContent.map(async (projectFiles) => {
        const projectContentPath = path.join(projectPath, projectFiles);
        const stats = fs.lstatSync(projectContentPath);
        if (stats.isDirectory()) {
          await removeDirectoryByPath(projectContentPath);
        } else {
          fs.unlinkSync(projectContentPath);
        }
      })
    );
    fs.rmdirSync(projectPath);
  } catch (error) {
    console.error(`Error removing new project: ${error}`);
  }
}

// Function to modify content inside pom XML to add surefire version 3.4.0 plugin
export async function modifyPomFile() {
  //Read the POM file
  fs.readFile('src/test/resources/maven/liberty.maven.test.wrapper.app/pom.xml', 'utf8', (err, data) => {
    if (err) {
      console.log('Error reading the file:', err);
      console.error('Error reading the file:', err);
      return;
    }

    //Find the specific comment and replace its content
    const commentRegex = /<!--\s*Test report insertion point, do not remove\s*-->/;
    const newContent = `<plugin>
                                <groupId>org.apache.maven.plugins</groupId>
                                <artifactId>maven-surefire-report-plugin</artifactId>
                                <version>3.4.0</version>
                          </plugin>`;
    // Check if the comment is found
    if (commentRegex.test(data)) {
      const updatedData = data.replace(commentRegex, `<!-- replace this content -->\n${newContent}\n<!-- replace this content end -->`);

      //Write the modified content back to the POM file
      fs.writeFile('src/test/resources/maven/liberty.maven.test.wrapper.app/pom.xml', updatedData, 'utf8', (err) => {
        if (err) {
          console.log('Error writing to the file:', err);
          console.error('Error writing to the file:', err);
        } else {
          console.log('POM file updated successfully');
        }
      });
    } else {
      console.log('Comment with the specified marker not found in the POM file');
    }
  });
}

// Function to revert changes made by modifyPomFile()
export async function revertPomFile() {
  //path to pom.xml in the test project
  const pomFilePath = 'src/test/resources/maven/liberty.maven.test.wrapper.app/pom.xml';

  //Read the POM file
  fs.readFile(pomFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    //Find the inserted plugin block and revert it back to the original comment
    const pluginBlockRegex = /<!--\s*replace this content\s*-->([\s\S]*?)<!--\s*replace this content end\s*-->/;

    // Check if the inserted plugin block exists
    if (pluginBlockRegex.test(data)) {
      const revertedData = data.replace(pluginBlockRegex, `<!-- Test report insertion point, do not remove -->`);

      //Write the reverted content back to the POM file
      fs.writeFile(pomFilePath, revertedData, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to the file:', err);
        } else {
          console.log('POM file reverted successfully');
        }
      });
    } else {
      console.log('Plugin block not found, nothing to revert.');
    }
  });
}


