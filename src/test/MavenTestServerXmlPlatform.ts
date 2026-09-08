/**
 * Copyright (c) 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/**
 * LCLS tests for Maven project – platform and versionless feature support in server.xml.
 *
 * Covers GitHub issues:
 *   #442 – Hover support for a Liberty Server Platform element
 *   #443 – Diagnostic support for an invalid Liberty Server Platform
 *   #444 – Quick fix for an invalid Liberty Server Platform
 *   #445 – Type-ahead (completion) for a Liberty Server Platform element
 *   #446 – Diagnostic support for an invalid Liberty Server feature
 *   #447 – Quick fix for an invalid Liberty Server feature
 *   #448 – Valid server feature entry with platform entry in server.xml
 */

import { By, EditorView, TextEditor, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as constants from './definitions/constants';

const path = require('path');
const assert = require('assert');

describe('LCLS tests for Maven Project – platform and versionless features', function () {
    let editor: TextEditor;
    let actualServerXMLContent: string;

    before(async function() {
        this.timeout(30000);
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        await utils.copyDirectoryByPath(
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG),
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG_TWO)
        );
        await utils.delay(2000);
    });

    it('Should copy content of server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        actualServerXMLContent = await editor.getText();
        assert(actualServerXMLContent.length !== 0, 'Content of server.xml was not copied.');

    }).timeout(30000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #442 – Hover support for the <platform> element
    // ─────────────────────────────────────────────────────────────────────────

    it('#442 – Should show hover support for Liberty Server platform in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        // Insert platform inside <featureManager> by pushing </featureManager> down
        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA_NINE + '\n');
        await utils.delay(3000);

        // Re-find the element after the DOM has updated
        const focusTargetedElement = await editor.findElement(By.xpath("//div[contains(@class,'view-lines')]//span[contains(text(),'jakartaee-9.1')]"));
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoveredValue = await hoverContents.getText();
        console.log('Hover text is: ' + hoveredValue);

        // LCLS returns the platform description in the hover
        assert(
            hoveredValue.includes('Jakarta EE 9.1') || hoveredValue.includes('platform'),
            `Did not get expected hover data for Liberty Server platform. Got: ${hoveredValue}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #443 – Diagnostic for an invalid <platform> value
    // ─────────────────────────────────────────────────────────────────────────

    it('#443 – Should show diagnostic for invalid platform value in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        // Insert invalid platform inside <featureManager>
        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
        await utils.delay(3000);

        // Re-find after DOM update to avoid stale reference
        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverFoundOutcome = await hoverContents.getText();
        console.log('Hover text is: ' + hoverFoundOutcome);

        assert(
            hoverFoundOutcome.includes(constants.PLATFORM_JAKARTA_ERROR),
            `Did not get expected diagnostic for invalid platform. Got: ${hoverFoundOutcome}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #444 – Quick fix for an invalid <platform> value
    // ─────────────────────────────────────────────────────────────────────────

    it('#444 – Should apply quick fix for invalid platform value in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
        await utils.delay(2000);

        const flaggedString = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA));
        await utils.delay(7000);

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: flaggedString }).perform();
        await utils.delay(3000);

        const driver = VSBrowser.instance.driver;
        const hoverRowStatusBar = await editor.findElement(By.className('hover-row status-bar'));
        await utils.delay(2000);

        const quickFixPopupLink = await hoverRowStatusBar.findElement(By.xpath(constants.FOCUS_QUICKFIX));
        await quickFixPopupLink.click();

        const hoverWindowTaskBar = await editor.findElement(By.className('context-view monaco-component bottom left fixed'));
        await hoverWindowTaskBar.findElement(By.className('actionList'));
        await utils.delay(2000);

        const pointerBlockedElement = await driver.findElement(By.css('.context-view-pointerBlock'));
        if (pointerBlockedElement) {
            await driver.executeScript("arguments[0].style.display = 'none';", pointerBlockedElement);
        } else {
            console.log('pointerBlockElement is not found!');
        }
        const quickfixOption = await editor.findElement(By.xpath(constants.FOCUS_JAKARTA_ELEVEN));
        await quickfixOption.click();

        const updatedServerXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log('Content after quick fix: ', updatedServerXMLContent);
        assert(
            updatedServerXMLContent.includes(constants.PLATFORM_JAKARTA_VALUE),
            `Quick fix was not applied correctly for invalid platform. Got: ${updatedServerXMLContent}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #445 – Type-ahead (completion) for the <platform> element
    // ─────────────────────────────────────────────────────────────────────────

    it('#445 – Should show completion support for Liberty Server platform in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        // Insert partial platform tag inside <featureManager> to trigger completion
        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        <p');
        await utils.delay(5000);
        await utils.callAssitantAction(editor, constants.PLATFORM);

        await editor.toggleContentAssist(false);
        await utils.delay(1000);

        // Type partial value to trigger platform value completion
        const platformLine = await editor.getLineOfText('<platform></platform>');
        await editor.typeTextAt(platformLine, 19, 'jakar');
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.JAKARTA_ELEVEN);
        await editor.toggleContentAssist(false);

        const updatedServerXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log('Content after completion support: ', updatedServerXMLContent);
        assert(
            updatedServerXMLContent.includes(constants.PLATFORM_JAKARTA_VALUE),
            `Completion support did not insert expected platform value. Got: ${updatedServerXMLContent}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #446 – Diagnostic for an invalid Liberty Server feature
    // ─────────────────────────────────────────────────────────────────────────

    it('#446 – Should show diagnostic for invalid feature value in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        ' + constants.FEATURE_MPHEALTH + '\n');
        await utils.delay(3000);

        const focusTargetedElement = await editor.findElement(By.xpath(constants.FOCUS_MPHEALTH));
        focusTargetedElement.click();
        await editor.click();

        const driverActionList = VSBrowser.instance.driver.actions();
        await driverActionList.move({ origin: focusTargetedElement }).perform();
        await utils.delay(5000);

        const hoverContents = editor.findElement(By.className('hover-contents'));
        const hoverValue = await hoverContents.getText();
        console.log('Hover text is: ' + hoverValue);

        assert(
            hoverValue.includes(constants.DESCRIPTION_MPHEALTH),
            `Did not get expected hover data for Liberty Server feature. Got: ${hoverValue}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #447 – Completion support for a Liberty Server feature
    // ─────────────────────────────────────────────────────────────────────────

    it('#447 – Should show completion support for Liberty Server feature in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1, '        <f');
        await utils.delay(5000);
        await utils.callAssitantAction(editor, constants.FEATURE_TAG);

        await utils.delay(1000);
        const stanzaSnippet = 'el-3';
        // After completion, the feature tag is the newly inserted empty one
        const featureLine = await editor.getLineOfText('<feature></feature>');
        await editor.typeTextAt(featureLine, 18, stanzaSnippet);
        await utils.delay(5000);

        await utils.callAssitantAction(editor, constants.EL_VALUE);
        await editor.toggleContentAssist(false);

        const updatedServerXMLContent = await editor.getText();
        await utils.delay(3000);
        console.log('Content after completion support: ', updatedServerXMLContent);
        assert(
            updatedServerXMLContent.includes(constants.FEATURE_EL),
            `Completion support did not work as expected for Liberty Server feature el-3.0. Got: ${updatedServerXMLContent}`
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #448 – Valid versionless feature entry with platform entry
    // ─────────────────────────────────────────────────────────────────────────

    it('#448 – Valid server feature entry with platform entry in server.xml', async () => {
        await utils.openMvnFileByPath(constants.CONFIG_TWO, constants.SERVER_XML);
        editor = await new EditorView().openEditor(constants.SERVER_XML) as TextEditor;

        // Add platform and versionless feature inside <featureManager>
        const fmEndLine = await editor.getLineOfText('</featureManager>');
        await editor.typeTextAt(fmEndLine, 1,
            '        ' + constants.PLATFORM_JAKARTA_NINE + '\n' +
            '        ' + constants.FEATURE_SERVLET + '\n'
        );
        await utils.delay(2000);

        const updatedServerXMLContent = await editor.getText();
        console.log('Updated server.xml content: ' + updatedServerXMLContent);

        assert(
            updatedServerXMLContent.includes(constants.FEATURE_SERVLET) &&
            updatedServerXMLContent.includes(constants.PLATFORM_JAKARTA_NINE),
            'Did not get expected entries in server.xml for versionless feature and platform combination.'
        );

        editor.clearText();
        await editor.setText(actualServerXMLContent);
        console.log('server.xml content is restored');
        await utils.closeFileTab(constants.SERVER_XML);

    }).timeout(45000);

    after(() => {
        utils.removeDirectoryByPath(
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG_TWO)
        );
        console.log('Removed config2 folder');
    });

});
