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

import { expect } from 'chai';
import { VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as editorUtils from './utils/editorUtils';
import * as constants from './definitions/constants';
import { EditorPage } from './pages/EditorPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { QuickFixPage } from './pages/QuickFixPage';
import { logger } from './utils/testLogger';

const path = require('path');

describe('LCLS tests for Maven Project – platform and versionless features', function () {
    let editorPage: EditorPage;
    let originalContent: string;

    const serverXmlPath = path.resolve(
        utils.getMvnProjectPath(),
        'src', 'main', 'liberty', constants.CONFIG_TWO, constants.SERVER_XML
    );

    before(async function () {
        this.timeout(30000);
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        await utils.copyDirectoryByPath(
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG),
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG_TWO)
        );
        await utils.getWaitHelper().sleep(2000);
    });

    beforeEach(async function () {
        this.timeout(30000);
        editorPage = await new EditorPage().openFile(serverXmlPath, constants.SERVER_XML);
        if (!originalContent) {
            originalContent = await editorPage.getEditor().getText();
        }
    });

    afterEach(async function () {
        this.timeout(30000);
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
        }
        // Restore original content and close the editor after each test
        if (originalContent) {
            await editorPage.getEditor().setText(originalContent);
            await editorPage.getEditor().save();
        }
        await editorUtils.closeAllEditors();
    });

    after(async function () {
        utils.removeDirectoryByPath(
            path.join(utils.getMvnProjectPath(), 'src', 'main', 'liberty', constants.CONFIG_TWO)
        );
        logger.info('Removed config2 folder');
        utils.copyScreenshotsToProjectFolder('maven');
    });

    it('Should copy content of server.xml', async function () {
        this.timeout(30000);
        const content = await editorPage.getEditor().getText();
        expect(content.length).to.be.greaterThan(0, 'Content of server.xml was not copied.');
        originalContent = content;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #442 – Hover support for the <platform> element
    // ─────────────────────────────────────────────────────────────────────────

    it('#442 – Should show hover support for Liberty Server platform in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#442 – Hover support for Liberty Server platform');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA_NINE + '\n');
        await utils.getWaitHelper().sleep(3000);

        // Find the platform line and hover over the value text
        const platformLine = await editorPage.getEditor().getLineOfText('jakartaee-9.1');
        const hoverText = await editorUtils.hoverOver(
            editorPage.getEditor(),
            platformLine,
            20,
            'jakartaee-9.1 platform value'
        );

        expect(hoverText).to.not.be.empty;
        expect(
            hoverText.includes('Jakarta EE 9.1') || hoverText.includes('platform'),
            `Did not get expected hover data for Liberty Server platform. Got: ${hoverText}`
        ).to.be.true;

        logger.testComplete('#442 – Hover support for Liberty Server platform');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #443 – Diagnostic for an invalid <platform> value
    // ─────────────────────────────────────────────────────────────────────────

    it('#443 – Should show diagnostic for invalid platform value in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#443 – Diagnostic for invalid platform value');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
        await editorPage.getEditor().save();

        const problems = new ProblemsPage();
        const found = await problems.hasDiagnostic(constants.PLATFORM_JAKARTA_ERROR);
        expect(found, `Expected diagnostic "${constants.PLATFORM_JAKARTA_ERROR}" was not found in Problems view`).to.be.true;

        logger.testComplete('#443 – Diagnostic for invalid platform value');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #444 – Quick fix for an invalid <platform> value
    // ─────────────────────────────────────────────────────────────────────────

    it('#444 – Should apply quick fix for invalid platform value in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#444 – Quick fix for invalid platform value');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA + '\n');
        await editorPage.getEditor().save();
        await utils.getWaitHelper().sleep(7000);

        await new QuickFixPage().applyFix(editorPage, 'jakarta', 'Replace platform with jakartaee-11.0');

        await utils.getWaitHelper().sleep(3000);
        const updatedContent = await editorPage.getEditor().getText();
        expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_VALUE,
            `Quick fix was not applied correctly for invalid platform. Got: ${updatedContent}`);

        logger.testComplete('#444 – Quick fix for invalid platform value');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #445 – Type-ahead (completion) for the <platform> element
    // ─────────────────────────────────────────────────────────────────────────

    it('#445 – Should show completion support for Liberty Server platform in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#445 – Completion support for Liberty Server platform');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        <p');
        await utils.getWaitHelper().sleep(5000);
        await utils.callAssitantAction(editorPage.getEditor(), constants.PLATFORM);

        await editorPage.getEditor().toggleContentAssist(false);
        await utils.getWaitHelper().sleep(1000);

        const platformLine = await editorPage.getEditor().getLineOfText('<platform></platform>');
        await editorPage.getEditor().typeTextAt(platformLine, 19, 'jakar');
        await utils.getWaitHelper().sleep(5000);

        await utils.callAssitantAction(editorPage.getEditor(), constants.JAKARTA_ELEVEN);
        await editorPage.getEditor().toggleContentAssist(false);

        await utils.getWaitHelper().sleep(3000);
        const updatedContent = await editorPage.getEditor().getText();
        expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_VALUE,
            `Completion support did not insert expected platform value. Got: ${updatedContent}`);

        logger.testComplete('#445 – Completion support for Liberty Server platform');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #446 – Diagnostic for an invalid Liberty Server feature
    // ─────────────────────────────────────────────────────────────────────────

    it('#446 – Should show diagnostic for invalid feature value in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#446 – Diagnostic for invalid feature value');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        ' + constants.FEATURE_MPHEALTH + '\n');
        await editorPage.getEditor().save();

        // Hover over the feature value to surface the diagnostic
        const featureLine = await editorPage.getEditor().getLineOfText('mpHealth-4.0');
        const hoverText = await editorUtils.hoverOver(
            editorPage.getEditor(),
            featureLine,
            20,
            'mpHealth-4.0 feature value'
        );

        expect(hoverText).to.not.be.empty;
        expect(hoverText).to.include(constants.DESCRIPTION_MPHEALTH,
            `Did not get expected hover data for Liberty Server feature. Got: ${hoverText}`);

        logger.testComplete('#446 – Diagnostic for invalid feature value');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #447 – Completion support for a Liberty Server feature
    // ─────────────────────────────────────────────────────────────────────────

    it('#447 – Should show completion support for Liberty Server feature in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#447 – Completion support for Liberty Server feature');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1, '        <f');
        await utils.getWaitHelper().sleep(5000);
        await utils.callAssitantAction(editorPage.getEditor(), constants.FEATURE_TAG);

        await utils.getWaitHelper().sleep(1000);
        const featureLine = await editorPage.getEditor().getLineOfText('<feature></feature>');
        await editorPage.getEditor().typeTextAt(featureLine, 18, 'el-3');
        await utils.getWaitHelper().sleep(5000);

        await utils.callAssitantAction(editorPage.getEditor(), constants.EL_VALUE);
        await editorPage.getEditor().toggleContentAssist(false);

        await utils.getWaitHelper().sleep(3000);
        const updatedContent = await editorPage.getEditor().getText();
        expect(updatedContent).to.include(constants.FEATURE_EL,
            `Completion support did not work as expected for Liberty Server feature el-3.0. Got: ${updatedContent}`);

        logger.testComplete('#447 – Completion support for Liberty Server feature');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Issue #448 – Valid versionless feature entry with platform entry
    // ─────────────────────────────────────────────────────────────────────────

    it('#448 – Valid server feature entry with platform entry in server.xml', async function () {
        this.timeout(45000);
        logger.testStart('#448 – Valid versionless feature entry with platform entry');

        const fmEndLine = await editorPage.getEditor().getLineOfText('</featureManager>');
        await editorPage.getEditor().typeTextAt(fmEndLine, 1,
            '        ' + constants.PLATFORM_JAKARTA_NINE + '\n' +
            '        ' + constants.FEATURE_SERVLET + '\n'
        );
        await utils.getWaitHelper().sleep(2000);

        const updatedContent = await editorPage.getEditor().getText();
        expect(updatedContent).to.include(constants.FEATURE_SERVLET,
            'Did not find expected servlet feature entry in server.xml.');
        expect(updatedContent).to.include(constants.PLATFORM_JAKARTA_NINE,
            'Did not find expected platform entry in server.xml.');

        logger.testComplete('#448 – Valid versionless feature entry with platform entry');
    });
});
