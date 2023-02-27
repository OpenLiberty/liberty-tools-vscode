
import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import { expect } from "chai";


describe('Open Project', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
        
    });

    it('Open Sample Project', async () => {       
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());

    }).timeout(5000);

    
});


