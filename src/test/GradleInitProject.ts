/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2025
 */
import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Gradle Project', () => {

    let driver: WebDriver;  
    

    before(() => {
        driver = VSBrowser.instance.driver;
        
    });

    it('Open Sample Gradle Project', async () => {       
        await VSBrowser.instance.openResources(utils.getGradleProjectPath());

    }).timeout(15000);

    
});


