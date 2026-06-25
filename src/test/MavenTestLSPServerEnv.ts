/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import * as path from 'path';
import { logger } from './utils/testLogger';
import { EditorView, VSBrowser } from 'vscode-extension-tester';
import { EditorPage } from './pages/EditorPage';
import * as utils from './utils/testUtils';
import { expect } from 'chai';
import { CodeAssistPage } from './pages/CodeAssistPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { QuickFixPage } from './pages/QuickFixPage';
import * as editorUtils from './utils/editorUtils';

const HOVER_INITIAL_CONTENT = 'WLP_USER_DIR=/opt/wlp/usr\nLOG_DIR=/logs\n';

const HOVER_TEST_CASES = [
    {
        element: 'WLP_USER_DIR',
        line: 1,
        column: 1,
        expectedDoc: 'The user or custom configuration directory that is used to store shared and server-specific configuration. See the path_to_liberty/wlp/README.TXT file for details about shared resource locations. A server configuration is at the %WLP_USER_DIR%/servers/serverName location. The default value is the user directory in the installation directory.',
    },
    {
        element: 'LOG_DIR',
        line: 2,
        column: 1,
        expectedDoc: 'The directory that contains the log file. The default value is %WLP_OUTPUT_DIR%/serverName/logs',
    },
];

describe('Server Env functionality tests for Maven Project', () => {
    let serverEnv: EditorPage;
    let wait: any;

    before(async function() {
        this.timeout(60000);

        logger.info('Setting up Maven server.env tests');

        await VSBrowser.instance.openResources(utils.getMvnProjectPath());
        await VSBrowser.instance.waitForWorkbench();

        wait = utils.getWaitHelper();

        logger.info('Opening server.env file for all tests');
        const serverEnvPath = path.resolve(
            utils.getMvnProjectPath(),
            'src', 'main', 'liberty', 'config', 'server.env'
        );
        logger.info(`Server.env path: ${serverEnvPath}`);

        serverEnv = await new EditorPage().openFile(serverEnvPath, 'server.env');
        logger.info('Server.env file opened and editor obtained');
    });

    afterEach(async function() {
        if (this.currentTest?.state === 'failed') {
            await VSBrowser.instance.driver.takeScreenshot();
            logger.error(`Test failed: ${this.currentTest.title}`);
        }
    });

    after(async function() {
        this.timeout(10000);
        try {
            if (serverEnv) {
                const currentText = await serverEnv.getEditor().getText();
                try {
                    await serverEnv.getEditor().selectText(currentText);
                    await wait.sleep(300);
                } catch (selectError) {
                    // selectText may fail but setText still works
                }
                await editorUtils.clearEditor(serverEnv.getEditor());
                logger.info('Reset server.env to empty after tests');
            }
        } catch (error) {
            logger.error('Failed to reset server.env', error);
        }
        try {
            await new EditorView().closeAllEditors();
            logger.info('Closed all editors after test suite');
        } catch (error) {
            logger.error('Failed to close editors in after hook', error);
        }
        utils.copyScreenshotsToProjectFolder('maven');
    });

    it('Liberty Language Server should initialize', async function() {
        this.timeout(60000);
        logger.testStart('Liberty Language Server should initialize');
        try {
            await utils.waitForLanguageServerInit(
                'Language Support for Liberty',
                'Initialized Liberty Language server',
                60
            );
            logger.testComplete('Liberty Language Server initialized successfully');
        } catch (error) {
            logger.testFailed('Liberty Language Server should initialize', error);
            throw error;
        }
    });

    HOVER_TEST_CASES.forEach(testCase => {
        it(`Hover over ${testCase.element} shows Liberty Language Server documentation`, async function() {
            this.timeout(30000);
            logger.testStart(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
            await serverEnv.getEditor().setText(HOVER_INITIAL_CONTENT);
            await serverEnv.getEditor().save();
            await wait.sleep(1000);

            try {
                const hoverText = await editorUtils.hoverOver(serverEnv.getEditor(), testCase.line, testCase.column, testCase.element);
                expect(hoverText).to.not.be.empty;
                logger.stepSuccess(3, `Hover widget displayed with Liberty Language Server content for ${testCase.element}`);

                logger.step(4, 'Verifying hover contains expected documentation');
                expect(hoverText).to.include(testCase.expectedDoc);
                logger.stepSuccess(4, `Hover text contains expected documentation: "${testCase.expectedDoc}"`);

                logger.testComplete(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
            } catch (error) {
                logger.testFailed(`Hover over ${testCase.element} shows Liberty Language Server documentation`, error);
                throw error;
            }
        });
    });

    it('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT type ahead', async function() {
        this.timeout(275000);
        logger.testStart('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT type ahead');

        try {
            logger.step(1, 'Positioning cursor');
            await serverEnv.getEditor().setCursor(3, 1);

            logger.step(2, 'Opening content assist');
            const codeAssist = new CodeAssistPage();
            await codeAssist.insertSnippet(serverEnv, 'WLP_LOG', 'WLP_LOGGING_MESSAGE_FORMAT');
            logger.stepSuccess(2, 'Completion inserted');
            const after = await serverEnv.getEditor().getText();
            expect(after).to.include('WLP_LOGGING_MESSAGE_FORMAT');
            await wait.sleep(1000);

            const lineText = await serverEnv.getEditor().getTextAtLine(3);
            await serverEnv.getEditor().setTextAtLine(3, lineText.trimEnd() + '=JSON');

            await serverEnv.getEditor().save();
            await wait.sleep(500);

            logger.testComplete('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT completion');
        } catch (error) {
            logger.testFailed('server.env WLP_LOG populates correct WLP_LOGGING_MESSAGE_FORMAT completion', error);
            throw error;
        }
    });

    it('Show that INVALID text displays diagnostic and quick fix removes it', async function() {
        this.timeout(90000);
        logger.testStart('Show that INVALID text displays diagnostic and quick fix removes it');
        try {
            await editorUtils.replaceTextWithinLineContaining(serverEnv.getEditor(), 'WLP_LOGGING_MESSAGE_FORMAT', 'JSON', 'INVALID');

            await serverEnv.getEditor().save();
            await wait.sleep(500);

            const problems = new ProblemsPage();
            const found = await problems.hasDiagnostic('The value `INVALID` is not valid for the variable `WLP_LOGGING_MESSAGE_FORMAT`.');
            expect(found).to.be.true;
            logger.testComplete('Diagnostic shows INVALID variable');

            const buffer = await serverEnv.getEditor().getText();
            logger.info('Buffer before quick fix: ' + JSON.stringify(buffer));

            await new QuickFixPage().applyFix(serverEnv, 'INVALID', 'Replace value with JSON');
            await wait.sleep(3000);
            await serverEnv.getEditor().save();
            await wait.sleep(5000);

            const afterFix = await serverEnv.getEditor().getText();
            expect(afterFix).to.include('JSON');
            expect(await problems.hasDiagnostic('The value `INVALID` is not valid for the variable `WLP_LOGGING_MESSAGE_FORMAT`.')).to.be.false;
        } catch (error) {
            logger.testFailed('Diagnostic/quick-fix test flow failed', error);
            throw error;
        }
    });
});
