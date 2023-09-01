
import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Maven Server xml Project', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
    });

    it('Open Sample Maven Project with no server.xml', async () => {       
        await VSBrowser.instance.openResources(utils.getMvnServerXmlProjectPath());

    }).timeout(15000);

    
});


