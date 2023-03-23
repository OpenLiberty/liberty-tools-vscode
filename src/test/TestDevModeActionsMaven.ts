import { expect } from 'chai';
import * as fs from 'fs';
import { SideBarView, ViewItem, ViewSection } from 'vscode-extension-tester';
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
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  console.log("after checkTerminalforServerState");
 // const serverStartStatus= await utils.validateIfServerStarted();
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchStopServer(section);
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
   // const serverStopStatus= await utils.validateIfServerStopped();
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);


//========================================


it('start with options from liberty dashboard', async () => {      
    
  const deleteReport = await utils.deleteReports();
  expect (deleteReport).to.be.true;
  await utils.launchStartServerWithParam(section);  
  await utils.setCustomParameter("-DhotTests=true");  
  await utils.delay(30000);
  // const serverStartStatus= await utils.validateIfServerStarted();
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchStopServer(section);
    //const serverStopStatus= await utils.validateIfServerStopped();
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in ther terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(350000);


it('start with history from liberty dashboard', async () => {  

  const deleteReport = await utils.deleteReports();
  expect (deleteReport).to.be.true;  
  await utils.launchStartServerWithParam(section);  
  const foundCommand = await utils.chooseCmdFromHistory();
  expect (foundCommand).to.be.true;
  console.log("after choosing command from history");
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in the terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchStopServer(section);
    //const serverStopStatus= await utils.validateIfServerStopped();
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(350000);

/*
it('start with docker from liberty dashboard', async () => {      
    
  
  await utils.launchStartServerWithDocker(section);
  await utils.delay(60000);
  const serverStartStatus = await utils.checkTerminalforServerState(SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchStopServer(section);
    const serverStopStatus= await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);
*/

/*
This is attach debugger for start)
*/

it('attach debugger for start event', async () => {
  console.log("***********************");
  console.log("debugPort has to be set in server.env as part of init script");
  console.log("***********************");
  let isServerRunning: Boolean = true;
  let isServerStopped: Boolean = true;
  let attachStatus: boolean = false;
  try {
    utils.delay(5000);
    await utils.launchStartServer(section);
    await utils.delay(55000);

    isServerRunning = await utils.checkTerminalforServerState(SERVER_START_STRING);
    if (!isServerRunning)
      console.log("Server started with params message not found in terminal");
    else {
      console.log("Server succuessfully started");
    
    await utils.attachDebugger(section);
    console.log("**** Attach Debugger done ");
    const contentPart = sidebar.getContent();
    
    //************************** iterate*/
    let mysecarry: Promise<ViewSection[]> = contentPart.getSections();
    //let mysec: IterableIterator<ViewSection> =(await mysecarry).values();

    let mysecmap: IterableIterator<[number, ViewSection]> = (await mysecarry).entries();
    for (const [key, value] of (mysecmap)) {
      if ((await value.getEnclosingElement().getText()).includes("BREAKPOINTS")) {
        attachStatus = true;
        break;
      }
    }
    await utils.launchStopServer(section);
    isServerStopped = await utils.checkTerminalforServerState(SERVER_STOP_STRING);
    if (isServerStopped)
      console.log("Server stopped successfully ");
  }
  } catch (e) {
    console.error("error - ", e)
  } finally {
    console.log("defaulServer running status in finally block: ", isServerRunning);
    if (isServerRunning) {
      utils.launchStopServer(section);
    }
    else
      console.log("good to close test - Attach Debugger for start with custom parameter(-DdebugPort=7777) event");
  }
  expect(attachStatus).to.be.true;
}).timeout(750000);

});