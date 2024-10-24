import { expect } from 'chai';
import { InputBox, Workbench,SideBarView, ViewSection,EditorView,DefaultTreeItem, DebugView } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import path = require('path');

describe('Devmode action tests for Gradle Project', () => {
    let sidebar: SideBarView;
    let debugView: DebugView;
    let section: ViewSection;
    let item: DefaultTreeItem;    
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


it('Open dasboard shows items - Gradle', async () => {

    // Wait for the Liberty Dashboard to load and expand. The dashboard only expands after using the 'expand()' method.  
    await utils.delay(65000);
    await section.expand(); 
    await utils.delay(6000);
    const menu = await section.getVisibleItems();            
    expect(menu).not.empty;     
    item = await section.findItem(constants.GRADLE_PROJECT) as DefaultTreeItem;   
    expect(item).not.undefined;   
   
    
}).timeout(300000);


it('Start gradle project from liberty dashboard', async () => {      
    
  
  await utils.launchDashboardAction(item,constants.START_DASHBOARD_ACTION,constants.START_DASHBOARD_MAC_ACTION);  
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
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

it('Run tests for gradle project', async () => {  
  
  await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION, constants.START_DASHBOARD_MAC_ACTION);
  await utils.delay(30000);  
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  console.log("after checkTerminalforServerState"); 
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(item,constants.RUNTEST_DASHBOARD_ACTION,constants.RUNTEST_DASHBOARD_MAC_ACTION);    
    const testStatus = await utils.checkTestStatus(constants.GRADLE_TEST_RUN_STRING);        
    await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
    if(!serverStopStatus)
      console.error("Server stopped message not found in the terminal");    
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
    expect (testStatus).to.be.true;
}
 expect (serverStartStatus).to.be.true; 
 
    
}).timeout(350000);


it('start gradle with options from liberty dashboard', async () => {      
    
  const reportPath = path.join(utils.getGradleProjectPath(),"build", "reports", "tests", "test", "index.html");
  const deleteReport = await utils.deleteReports(reportPath);
  expect (deleteReport).to.be.true;
  await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);
  await utils.setCustomParameter("--hotTests");  
  await utils.delay(30000);  
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestReportExists(reportPath);    
    await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
    console.log("after dashboard action");
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
    if(!serverStopStatus) 
      console.error("Server stopped message not found in ther terminal");    
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
    expect (checkFile).to.be.true;    
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(550000);

it('start gradle with history from liberty dashboard', async () => {  

  const reportPath = path.join(utils.getGradleProjectPath(),"build", "reports", "tests", "test", "index.html");
  const deleteReport = await utils.deleteReports(reportPath);
  expect (deleteReport).to.be.true;  
  await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);  
  const foundCommand = await utils.chooseCmdFromHistory("--hotTests");
  console.log("foundcmd:" + foundCommand);
  expect (foundCommand).to.be.true;  
  await utils.delay(30000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started with params message not found in the terminal ");
  else
  {
    console.log("Server succuessfully started");  
    let checkFile = await utils.checkIfTestReportExists(reportPath);    
    await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
    const serverStopStatus= await utils.checkTerminalforServerState(constants.SERVER_STOP_STRING);
    if(!serverStopStatus)
      console.error("Server stopped message not found in terminal");
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus).to.be.true;
    expect (checkFile).to.be.true;
}
 expect (serverStartStatus).to.be.true;
    
}).timeout(350000);
















it('attach debugger for gradle with custom parameter event', async () => {
  console.log("start attach debugger");
  let isServerRunning: Boolean = true;
  let attachStatus: Boolean = false;
  try {
    await utils.launchDashboardAction(item,constants.START_DASHBOARD_ACTION_WITH_PARAM, constants.START_DASHBOARD_MAC_ACTION_WITH_PARAM);
    await utils.setCustomParameter("-DdebugPort=7777");   
    await utils.delay(30000);
    
    isServerRunning = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
    if (!isServerRunning)
      console.log("Server started with params message not found in terminal");
    else {
      console.log("Server succuessfully started");
    await utils.launchDashboardAction(item,constants.ATTACH_DEBUGGER_DASHBOARD_ACTION, constants.ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION);    
    console.log("Attach Debugger action done");
    await utils.delay(8000);
    const contentPart = debugView.getContent();
    //console.log("Get Content");
    
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
}).timeout(550000);

it('start gradle with docker from liberty dashboard', async () => {     
  
  if((process.platform === 'darwin' ) || (process.platform === 'win32') || (process.platform == 'linux'))
  {
    //skip running for platforms , enable them for linux after resolving docker setup in GHA
    return true;
  }
    
  
  await utils.launchDashboardAction(item, constants.START_DASHBOARD_ACTION_WITHDOCKER, constants.START_DASHBOARD_MAC_ACTION_WITHDOCKER);  
  await utils.delay(60000);
  const serverStartStatus = await utils.checkTerminalforServerState(constants.SERVER_START_STRING);
  if(!serverStartStatus)
    console.log("Server started message not found in the terminal");
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchDashboardAction(item, constants.STOP_DASHBOARD_ACTION, constants.STOP_DASHBOARD_MAC_ACTION);    
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

it('View test report for gradle project', async () => {      

  if((process.platform === 'darwin' ) || (process.platform === 'win32') || (process.platform == 'linux'))
  {
    //skip running for platforms , enable once https://github.com/OpenLiberty/liberty-tools-vscode/issues/266 is resolved
    return true;
  }
    
  await utils.launchDashboardAction(item,constants.GRADLE_TR_DASHABOARD_ACTION, constants.GRADLE_TR_DASHABOARD_MAC_ACTION);   
  tabs = await new EditorView().getOpenEditorTitles();
 // expect (tabs[1]], "Gradle test report not found").to.equal(constants.GRADLE_TEST_REPORT_TITLE);
 expect (tabs.indexOf(constants.GRADLE_TEST_REPORT_TITLE)>-1, "Gradle test report not found").to.equal(true); 
    
}).timeout(30000);

  // Based on the UI testing code, it sometimes selects the wrong command in "command palette", such as choosing "Liberty: Start ..." instead of "Liberty: Start" from the recent suggestions. This discrepancy occurs because we specifically need "Liberty: Start" at that moment.
  // Now, clear the command history of the "command palette" to avoid receiving "recently used" suggestions. This action should be performed at the end of Gradle Project tests.
it('Clear Command Palatte', async () => {
  await utils.clearCommandPalette();
}).timeout(100000);

});

