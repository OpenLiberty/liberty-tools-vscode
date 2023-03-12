import { assert, expect } from 'chai';
import { time } from 'console';
import * as fs from 'fs';
import { BottomBarPanel,SideBarView, ActivityBar, ViewItem, ViewSection, ViewControl, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { SERVER_START_STRING, SERVER_STOP_STRING } from './definitions/constants';

describe('Section', () => {
    let sidebar: SideBarView;
    let section: ViewSection;
    let menu: ViewItem[];

    before(() => {
        sidebar = new SideBarView();
        
        
    });

it('getViewControl works with the correct label',  async() => { 
   
   const contentPart = sidebar.getContent();
   section = await contentPart.getSection('Liberty Dashboard');   
   console.log("Found Liberty Dashboard....");
   expect(section).not.undefined; 
 
}).timeout(10000);


it('openDasboard shows items', async () => {

    
    await utils.delay(60000);
    const menu = await section.getVisibleItems();  
    console.log("after getvisibleitems");         
    expect(menu).not.empty; 
   
    
}).timeout(75000);




it('start sample project from liberty dashboard', async () => {      
    
  
  await utils.launchStartServer(section);
  await utils.delay(60000);
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
 // const serverStartStatus= await utils.validateIfServerStarted();
  if(!serverStartStatus)
    console.log("Server started message not found in the logs");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchStopServer(section);
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
   // const serverStopStatus= await utils.validateIfServerStopped();
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the logs");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);


//========================================


it('start with options from liberty dashboard', async () => {      
    
  console.log("b4 launchStartServerWithParam");
  await utils.launchStartServerWithParam(section);
  console.log("after launchStartServerWithParam");
  await utils.setCustomParameter("-DhotTests=true");
 // console.log("b4 launchStartServerWithParam");
  console.log("after setting custom parameter");
  // const serverStartStatus= await utils.validateIfServerStarted();
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in logs ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchStopServer(section);
    //const serverStopStatus= await utils.validateIfServerStopped();
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in logs");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(350000);


it('start with history from liberty dashboard', async () => {      
    
  await utils.launchStartServerWithParam(section);
  const foundCommand = await utils.chooseCmdFromHistory();
  expect (foundCommand).to.be.true;
  console.log("after choosing command from history");
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in logs ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchStopServer(section);
    //const serverStopStatus= await utils.validateIfServerStopped();
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in logs");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(350000);

it('start with docker from liberty dashboard', async () => {      
    
  
  await utils.launchStartServerWithDocker(section);
  await utils.delay(60000);
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the logs");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchStopServer(section);
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the logs");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);



});