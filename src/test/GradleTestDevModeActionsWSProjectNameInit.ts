import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';

describe('Open Gradle Project - Project name with space', () => {

    let driver: WebDriver;  

    before(() => {    
        utils.renameProject();  
        driver = VSBrowser.instance.driver;  
       
    });

    it('Open Sample Gradle Project - Project name with space', async () => {  
        await utils.delay(8000);  
        await VSBrowser.instance.openResources(utils.getNewGradleProjectNameWithSpace());       
        }).timeout(25000);        
});


