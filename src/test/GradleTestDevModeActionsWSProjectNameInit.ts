import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Gradle Project - Project name with space', () => {

    let driver: WebDriver;  
    utils.renameProject();

    before(() => {    
        driver = VSBrowser.instance.driver;  
       
    });

    it('Open Sample Gradle Project - Project name with space', async () => {       
    
        await VSBrowser.instance.openResources(utils.getNewGradleProjectNameWithSpace());

    }).timeout(25000);

    
});


