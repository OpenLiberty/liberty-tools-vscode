import { expect } from 'chai';
import { SideBarView, ViewItem, ViewSection,EditorView, DebugView } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
describe('Section', () => {
    let sidebar: SideBarView;
    let debugView: DebugView;
    let section: ViewSection;
    let menu: ViewItem[];    
    let tabs: string[];

    before(() => {
        sidebar = new SideBarView();
        debugView = new DebugView();          
    });

it('getViewControl works with the correct label',  async() => { 
   
   const contentPart = sidebar.getContent();
   section = await contentPart.getSection('Liberty Dashboard');   
   console.log("Found Liberty Dashboard....");
   expect(section).not.undefined; 
 
}).timeout(10000);


it('openDasboard shows items', async () => {

    
    await utils.delay(65000);    
    const menu = await section.getVisibleItems();            
    expect(menu).not.empty; 
   
    
}).timeout(75000);


it('start sample project from liberty dashboard', async () => {      
    
  
  await utils.launchDashboardAction(section,constants.START_DASHBOARD_ACTION,constants.START_DASHBOARD_MAC_ACTION);  
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(section, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);   
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);



it('start with options from liberty dashboard', async () => {      
    
  const deleteReport = await utils.deleteReports();
  expect (deleteReport).to.be.true;
  await utils.launchDashboardAction(section, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);
  await utils.setCustomParameter("-DhotTests=true");  
  await utils.delay(30000);  
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchDashboardAction(section, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
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
  await utils.launchDashboardAction(section, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);  
  const foundCommand = await utils.chooseCmdFromHistory();
  expect (foundCommand).to.be.true;  
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in the terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestFileExists();
    expect (checkFile).to.be.true;
    await utils.launchDashboardAction(section, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
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
    
  
  await utils.launchDashboardAction(section, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);  
  await utils.delay(60000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(section, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
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

it('Run tests for sample project', async () => {  
  
  await utils.launchDashboardAction(section, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);
  //await utils.startLibertyserver();
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  console.log("after checkTerminalforServerState"); 
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(section,constants.RUNTEST_DASHBOARD_ACTION,constants.RUNTEST_DASHBOARD_MAC_ACTION);
    const testStatus = await utils.checkTestStatus();
    expect (testStatus).to.be.true;    
    await utils.launchDashboardAction(section, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
    if(!serverStopStatus){ 
    console.error("Server stopped message not found in the terminal");
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);


it('View Unit test report for sample project', async () => {      
    
  await utils.launchDashboardAction(section,constants.UTR_DASHABOARD_ACTION, constants.UTR_DASHABOARD_MAC_ACTION);   
  tabs = await new EditorView().getOpenEditorTitles();
  expect (tabs.indexOf(constants.SUREFIRE_REPORT_TITLE)>-1, "Unit test report not found").to.equal(true);
    
}).timeout(10000);

it('View Integration test report for sample project', async () => {      
    
  await utils.launchDashboardAction(section, constants.ITR_DASHBOARD_ACTION, constants.ITR_DASHBOARD_MAC_ACTION);   
  tabs = await new EditorView().getOpenEditorTitles();
  expect (tabs.indexOf(constants.FAILSAFE_REPORT_TITLE)>-1, "Integration test report not found").to.equal(true);
    
}).timeout(10000);


it('attach debugger for start with custom parameter event', async () => {
  console.log("start attach debugger");
  let isServerRunning: Boolean = true;
  let attachStatus: Boolean = false;
  try {
    await utils.launchDashboardAction(section,constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);
    await utils.setCustomParameter("-DdebugPort=7777");   
    await utils.delay(30000);
    
    isServerRunning = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
    if (!isServerRunning)
      console.log("Server started with params message not found in terminal");
    else {
      console.log("Server succuessfully started");
      
    await utils.launchDashboardAction(section,constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);    
    console.log("Attach Debugger action done");
    await utils.delay(8000);
    const contentPart = debugView.getContent();
    console.log("Get Content");
    
    let mysecarry: Promise<ViewSection[]> = contentPart.getSections();    
    let mysecmap: IterableIterator<[number, ViewSection]> = (await mysecarry).entries();
    for (const [key, value] of (mysecmap)) {
      if ((await value.getEnclosingElement().getText()).includes("BREAKPOINTS")) {
        //console.log("******** mysecmap getEnclosingElement " + (await value.getEnclosingElement().getText()).valueOf());
        console.log("Found Breakpoints");
        attachStatus = true;
        break;
      }
    }

    await utils.stopLibertyserver();
    isServerRunning = !await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING); //negate isServerRunning
    if (!isServerRunning)
      console.log("Server stopped successfully ");
  }
  } catch (e) {
    console.error("error - ", e)
  } finally {
    console.log("finally block: is server running -  ", isServerRunning);
    if (isServerRunning) {
      utils.stopLibertyserver();
    }
    else
      console.log("good to close test - Attach Debugger for start with custom parameter(-DdebugPort=7777) event");
  }
  expect(attachStatus).to.be.true;
}).timeout(350000);

});