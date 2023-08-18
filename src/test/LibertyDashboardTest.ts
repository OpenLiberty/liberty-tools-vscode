
import { expect } from 'chai';
import { InputBox, Workbench,SideBarView, ViewItem, ViewSection,EditorView, DefaultTreeItem ,  DebugView, ActivityBar, ViewControl} from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import path = require('path');


describe('Liberty dashboard project detection tests', () => {
    let sidebar: SideBarView;
    let debugView: DebugView;
    let section: ViewSection;
    let menu: ViewItem[];  
    let item: DefaultTreeItem;  
    let tabs: string[];

    before(() => {
        sidebar = new SideBarView(); 
        debugView = new DebugView();        
    });

it('getViewControl works with the correct label',  async() => { 
   
   const contentPart = sidebar.getContent();
   section = await contentPart.getSection('Liberty Dashboard');   
   console.log("Found Liberty Dashboard test....");
   expect(section).not.undefined; 
 
}).timeout(10000);
});
