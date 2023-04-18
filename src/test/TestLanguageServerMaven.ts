import { expect } from 'chai';
import { SideBarView, ViewItem, ViewSection,EditorView, DebugView, TitleBar,InputBox } from 'vscode-extension-tester';
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
/*

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

*/

it('Run Language server tests for maven project', async () => {  
  
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
    //Liberty Language server 
    const ServerXMLPath = utils.getServerxmlPath();
    if(ServerXMLPath != "")
    {
      console.log ("Inside if ServerXMLPath is : "+ ServerXMLPath);
      const titleBar = new TitleBar();
      console.log("Before File");
      const item = await titleBar.getItem('File');
      const fileMenu = await item!.select();
      console.log("Before Open...");
      const openItem = await fileMenu.getItem("Open...");
      await openItem!.select();
      const input = await InputBox.create();
      console.log("Before settext");
      await input.setText(ServerXMLPath);
      await input.confirm();
      console.log("after inputbox creation");
      await utils.delay(3000);
    }
    else console.log("serverxml path invalid");
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


});