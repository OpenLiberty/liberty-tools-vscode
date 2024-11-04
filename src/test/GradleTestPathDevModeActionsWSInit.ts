
import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Gradle Project - path with space', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
        utils.createGradleProjectPathWithSpace();
        
    });

    it('Open Sample Gradle Project - path with space', async () => {       
    
        await VSBrowser.instance.openResources(utils.getGradleProjectPathDirWithSpace());

    }).timeout(25000);

    
});

