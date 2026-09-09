/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { expect } from 'chai';
import { VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';
import * as editorUtils from './utils/editorUtils';
import * as constants from './definitions/constants';
import { runHoverTestSuite } from './shared/hoverTestSuite';
import { EditorPage } from './pages/EditorPage';
import { logger } from './utils/testLogger';

import * as path from 'path';

runHoverTestSuite({
    buildTool: 'maven',
    getProjectPath: utils.getMvnProjectPath,
    hoverTestCases: [
        { element: 'httpEndpoint element', line: 19, column: 10, expectedDoc: 'Configuration properties for an HTTP endpoint.' },
        { element: 'feature element', line: 16, column: 16, expectedDoc: 'Specifies a feature to be used when the server runs.' },
        { element: 'featureManager element', line: 15, column: 10, expectedDoc: 'Defines how the server loads features.' },
        { element: 'webApplication element', line: 21, column: 10, expectedDoc: 'Defines the properties of a web application.' },
        { element: 'jsp-2.3 feature value', line: 16, column: 22, expectedDoc: 'This feature enables support for Java Server Pages (JSPs) that are written to the JSP 2.3 specification.' },
        { element: 'httpPort attribute', line: 19, column: 33, expectedDoc: 'The port used for client HTTP requests. Use -1 to disable this port.' }
    ]
});

// ─────────────────────────────────────────────────────────────────────────────
// Issue #442 – Hover support for the <platform> element
// Tested separately because it requires inserting content into server.xml first.
// ─────────────────────────────────────────────────────────────────────────────

describe('Platform element hover tests for Maven Project', () => {
    let serverXml: EditorPage;
    let originalContent: string;

    const serverXmlPath = path.resolve(
        utils.getMvnProjectPath(),
        'src', 'main', 'liberty', 'config', 'server.xml'
    );

    before(async function () {
        this.timeout(30000);
        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();
        serverXml = await new EditorPage().openFile(serverXmlPath, 'server.xml');
        originalContent = await serverXml.getEditor().getText();
        logger.info('Opened server.xml for platform hover tests');
    });

    afterEach(async function () {
        this.timeout(15000);
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
        }
        if (originalContent) {
            await serverXml.getEditor().setText(originalContent);
            await serverXml.getEditor().save();
            logger.info('Restored server.xml content after platform hover test');
        }
    });

    after(async function () {
        this.timeout(10000);
        await editorUtils.closeAllEditors();
        utils.copyScreenshotsToProjectFolder('maven');
    });

    it('#442 – Hover over platform element shows Liberty Language Server documentation', async function () {
        this.timeout(45000);
        logger.testStart('#442 – Hover over platform element shows Liberty Language Server documentation');

        const fmEndLine = await serverXml.getEditor().getLineOfText('</featureManager>');
        await serverXml.getEditor().typeTextAt(fmEndLine, 1, '        ' + constants.PLATFORM_JAKARTA_NINE + '\n');
        await utils.getWaitHelper().sleep(3000);

        const platformLine = await serverXml.getEditor().getLineOfText('jakartaee-9.1');
        const hoverText = await editorUtils.hoverOver(
            serverXml.getEditor(),
            platformLine,
            20,
            'platform element'
        );

        expect(hoverText).to.not.be.empty;
        expect(
            hoverText.includes('Jakarta EE 9.1') || hoverText.includes('platform'),
            `Did not get expected hover data for Liberty Server platform. Got: ${hoverText}`
        ).to.be.true;

        logger.testComplete('#442 – Hover over platform element shows Liberty Language Server documentation');
    });
});
