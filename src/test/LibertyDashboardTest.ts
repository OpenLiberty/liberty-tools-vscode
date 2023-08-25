
import { expect } from 'chai';
import {SideBarView, ViewItem, ViewSection, DefaultTreeItem, DebugView } from 'vscode-extension-tester';
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

    it('getViewControl works with the correct label', async () => {

        const contentPart = sidebar.getContent();
        section = await contentPart.getSection('Liberty Dashboard');
        console.log("Found Liberty Dashboard test....");
        expect(section).not.undefined;

    }).timeout(10000);

    it('Liberty dashboard is empty', async () => {

        await utils.delay(30000);
        const isEmpty = await utils.isViewSectionEmpty(section);
        expect(isEmpty).true;

    }).timeout(70000);

    it('Copy server.xml to config folder', async () => {

        await utils.delay(50000);
        const serverxmlPath = path.join(utils.getMvnServerXmlProjectPath(), "src", "main", "liberty", "config", "serverxml", "server.xml");
        const dest = path.join(utils.getMvnServerXmlProjectPath(), "src", "main", "liberty", "config", "server.xml");
        await utils.copyFile(serverxmlPath, dest);
        console.log("Finished copying file....");

    }).timeout(90000);

    it('Open dasboard shows items - Maven', async () => {

        await utils.delay(50000);
        const menu = await section.getVisibleItems();
        expect(menu).not.empty;
        item = await section.findItem(constants.MAVEN_SERVERXML_PROJECT) as DefaultTreeItem;
        expect(item).not.undefined;


    }).timeout(80000);

    it('Delete server.xml from config.', async () => {
        const dest = path.join(utils.getMvnServerXmlProjectPath(), "src", "main", "liberty", "config", "server.xml");
        const deleteServerxml = await utils.deleteReports(dest);
        expect(deleteServerxml).to.be.true;
    }).timeout(80000);


});