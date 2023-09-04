import { expect } from 'chai';
import { InputBox, Workbench, SideBarView, ViewItem, ViewSection, EditorView, DefaultTreeItem, DebugView } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';
import path = require('path');

describe('Devmode action tests for Gradle Project', () => {
  let sidebar: SideBarView;
  let section: ViewSection;
  let item: DefaultTreeItem;

  before(() => {
    sidebar = new SideBarView();
  });

  /*************************************************************************************
  ** detect project with LGP config in build file only (ie. no server.xml in project)  **        
  *************************************************************************************/

  it('Delete server.xml from config.', async () => {

    const dest = path.join(utils.getGradleProjectPath(), "src", "main", "liberty", "config", "server.xml");
    const deleteServerxml = await utils.deleteReports(dest);
    expect(deleteServerxml).to.be.true;

  }).timeout(80000);

  it('getViewControl works with the correct label', async () => {

    const contentPart = sidebar.getContent();
    section = await contentPart.getSection('Liberty Dashboard');
    console.log("Found Liberty Dashboard....");
    expect(section).not.undefined;

  }).timeout(10000);

  it('Open dasboard shows items - Gradle', async () => {

    await utils.delay(80000);
    const menu = await section.getVisibleItems();
    expect(menu).not.empty;
    item = await section.findItem(constants.GRADLE_PROJECT) as DefaultTreeItem;
    expect(item).not.undefined;

  }).timeout(300000);

  it('Copy server.xml to config folder', async () => {

    await utils.delay(50000);
    const serverxmlPath = path.join(utils.getGradleProjectPath(), "src", "main", "liberty", "config", "serverxml", "server.xml");
    const dest = path.join(utils.getGradleProjectPath(), "src", "main", "liberty", "config", "server.xml");
    await utils.copyFile(serverxmlPath, dest);
    console.log("Finished copying file....");

  }).timeout(90000);

});

