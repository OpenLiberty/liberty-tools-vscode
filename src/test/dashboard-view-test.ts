import { expect } from 'chai';
import { time } from 'console';
import * as fs from 'fs';
import { BottomBarPanel,SideBarView, ActivityBar, ViewItem, ViewSection, ViewControl, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';

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

it('check if server already running', async () => {

  const mvnProjectLogPath = utils.getMvnProjectLogPath();
  if (fs.existsSync(mvnProjectLogPath)) {
    console.log("file exists");
    
    fs.unlink(mvnProjectLogPath, async(err) => {
      if (err) {
        console.log(err.message);
        await utils.launchStopServer(section);
        const serverStopStatus= await utils.validateIfServerStopped();
        if(!serverStopStatus){ 
          console.error("Message CWWKE0036I not found in "+ utils.getMvnProjectLogPath());
        }
        else
          console.log("Server stopped successfully"); 
        }
        console.log( mvnProjectLogPath +" was deleted");
        });
  };        
}).timeout(10000);


it('start sample project from liberty dashboard', async () => {      
    
  
  await utils.launchStartServer(section);
  const serverStartStatus= await utils.validateIfServerStarted();
  if(!serverStartStatus)
    console.log("Message CWWKZ0001I not found in "+ utils.getMvnProjectLogPath());
  else
  {
    console.log("Server succuessfully started");  
    await utils.launchStopServer(section);
    const serverStopStatus= await utils.validateIfServerStopped();
    if(!serverStopStatus){ 
    console.error("Message CWWKE0036I not found in "+ utils.getMvnProjectLogPath());
    }
    else
      console.log("Server stopped successfully");
    expect (serverStopStatus,"Could not stop server").to.be.true;
}
 expect (serverStartStatus, "Could not start server").to.be.true;
    
}).timeout(350000);

});