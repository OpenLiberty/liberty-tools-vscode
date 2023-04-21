
import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Maven Project', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
        
    });

    it('Open Sample Maven Project', async () => {       
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());

    }).timeout(15000);

    
});


