import {  WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';



describe('Open Maven Project - path with space', () => {

    let driver: WebDriver;  


    before(() => {
        driver = VSBrowser.instance.driver;
        utils.createMvnProjectPathWithSpace();
    });

    it('Open Sample Maven Project - path with space', async () => {       
        await VSBrowser.instance.openResources(utils.getMvnProjectDirWithSpace());

    }).timeout(15000);


});