/**
 * Copyright (c) 2023 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
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

  //buildscript + apply plugin method

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



  // plugins block method
   it('Copy gradle.build file which uses plugins block method.', async () => {

    await utils.delay(50000);
    const serverxmlPath = path.join(utils.getGradleProjectPath(), "gradlefile", "build1.gradle");
    const dest = path.join(utils.getGradleProjectPath(), "build.gradle");
    await utils.copyFile(serverxmlPath, dest);
    console.log("Finished copying file....");

  }).timeout(90000);

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

  it('Copy gradle.build file which uses buildscript + apply plugin method.', async () => {

    await utils.delay(50000);
    const serverxmlPath = path.join(utils.getGradleProjectPath(), "gradlefile", "build2.gradle");
    const dest = path.join(utils.getGradleProjectPath(), "build.gradle");
    await utils.copyFile(serverxmlPath, dest);
    console.log("Finished copying file....");

  }).timeout(90000);

  // Place server.xml back to the config folder.
  it('Copy server.xml to config folder', async () => {

    await utils.delay(50000);
    const serverxmlPath = path.join(utils.getGradleProjectPath(), "src", "main", "liberty", "config", "serverxml", "server.xml");
    const dest = path.join(utils.getGradleProjectPath(), "src", "main", "liberty", "config", "server.xml");
    await utils.copyFile(serverxmlPath, dest);
    console.log("Finished copying file....");

  }).timeout(90000);
});

