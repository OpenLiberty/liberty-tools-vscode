
import {  WebDriver, VSBrowser ,InputBox, Workbench,SideBarView, ViewItem, ViewSection,EditorView, DebugView, ActivityBar, ViewControl } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { expect } from "chai";




describe('Open Maven Project', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
        
    });

    it('Open Sample Project', async () => {       
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());

    }).timeout(7000);

    
});

describe('Init View Section', () => {
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

});


