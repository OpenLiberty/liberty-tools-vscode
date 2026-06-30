/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import * as path from 'path';
import { logger } from '../utils/testLogger';
import { EditorView, VSBrowser } from 'vscode-extension-tester';
import { EditorPage } from '../pages/EditorPage';
import * as utils from '../utils/testUtils';
import { expect } from 'chai';
import { CodeAssistPage } from '../pages/CodeAssistPage';
import { ProblemsPage } from '../pages/ProblemsPage';
import { QuickFixPage } from '../pages/QuickFixPage';
import * as editorUtils from '../utils/editorUtils';

export interface HoverCase {
    element: string;
    line: number;
    column: number;
    expectedDoc: string;
}

export interface CompletionConfig {
    /** Text to type to trigger the completion. */
    trigger: string;
    /** Full item label to select from the completion list. */
    fullItem: string;
    /** Value to append after `=` once the key is inserted. */
    value: string;
}

export interface DiagnosticConfig {
    /** Token on the completed line used to locate it (usually the key name). */
    lineToken: string;
    /** The valid value that was set during completion. */
    validValue: string;
    /** The expected diagnostic message when the value is replaced with INVALID. */
    diagnosticMessage: string;
    /** The quick-fix label to apply (e.g. 'Replace value with JSON'). */
    quickFixLabel: string;
}

export interface ConfigFileTestConfig {
    /** Human-readable suite title, e.g. 'Server Env' or 'Bootstrap Properties'. */
    suiteTitle: string;
    /** Function that returns the project root path. */
    getProjectPath: () => string;
    /** Config-relative file path segments, e.g. ['src','main','liberty','config','server.env']. */
    filePathSegments: string[];
    /** Tab title shown in the VS Code editor (usually the file name). */
    tabTitle: string;
    /** Initial file content written before each hover test. */
    hoverInitialContent: string;
    /** Two hover test cases. */
    hoverCases: [HoverCase, HoverCase];
    /** Completion test config. */
    completion: CompletionConfig;
    /** Diagnostic + quick-fix test config (runs after completion, reuses its line). */
    diagnostic: DiagnosticConfig;
}

export function runConfigFileTestSuite(config: ConfigFileTestConfig): void {
    describe(`${config.suiteTitle} functionality tests for Maven Project`, () => {
        let editor: EditorPage;
        let wait: any;

        before(async function () {
            this.timeout(120000);
            logger.info(`Setting up Maven ${config.tabTitle} tests`);

            await VSBrowser.instance.openResources(config.getProjectPath());
            await VSBrowser.instance.waitForWorkbench();

            wait = utils.getWaitHelper();

            const filePath = path.resolve(config.getProjectPath(), ...config.filePathSegments);
            logger.info(`${config.tabTitle} path: ${filePath}`);

            editor = await new EditorPage().openFile(filePath, config.tabTitle);
            logger.info(`${config.tabTitle} file opened and editor obtained`);
        });

        afterEach(async function () {
            if (this.currentTest?.state === 'failed') {
                await VSBrowser.instance.driver.takeScreenshot();
                logger.error(`Test failed: ${this.currentTest.title}`);
            }
        });

        after(async function () {
            this.timeout(45000);
            try {
                if (editor) {
                    const currentText = await editor.getEditor().getText();
                    try {
                        await editor.getEditor().selectText(currentText);
                        await wait.sleep(300);
                    } catch {
                        // selectText may fail but setText still works
                    }
                    await editorUtils.clearEditor(editor.getEditor());
                    logger.info(`Reset ${config.tabTitle} to empty after tests`);
                }
            } catch (error) {
                logger.error(`Failed to reset ${config.tabTitle}`, error);
            }
            try {
                await new EditorView().closeAllEditors();
                logger.info('Closed all editors after test suite');
            } catch (error) {
                logger.error('Failed to close editors in after hook', error);
            }
            await utils.closeWorkspace();
            utils.copyScreenshotsToProjectFolder('maven');
        });

        it('Liberty Language Server should initialize', async function () {
            this.timeout(300000);
            logger.testStart('Liberty Language Server should initialize');
            try {
                await utils.waitForLanguageServerInit(
                    'Language Support for Liberty',
                    'Initialized Liberty Language server',
                    240
                );
                logger.testComplete('Liberty Language Server initialized successfully');
            } catch (error) {
                logger.testFailed('Liberty Language Server should initialize', error);
                throw error;
            }
        });

        config.hoverCases.forEach(testCase => {
            it(`Hover over ${testCase.element} shows Liberty Language Server documentation`, async function () {
                this.timeout(30000);
                logger.testStart(`Hover over ${testCase.element} shows Liberty Language Server documentation`);
                await editor.getEditor().setText(config.hoverInitialContent);
                await editor.getEditor().save();
                await wait.sleep(1000);

                try {
                    const hoverText = await editorUtils.hoverOver(editor.getEditor(), testCase.line, testCase.column, testCase.element);
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

        it(`${config.tabTitle} ${config.completion.trigger} populates correct ${config.completion.fullItem} type ahead`, async function () {
            this.timeout(275000);
            logger.testStart(`${config.tabTitle} ${config.completion.trigger} populates correct ${config.completion.fullItem} type ahead`);

            try {
                logger.step(1, 'Positioning cursor at end of file');
                await editor.getEditor().setCursor(3, 1);

                logger.step(2, 'Opening content assist');
                const codeAssist = new CodeAssistPage();
                await codeAssist.insertSnippet(editor, config.completion.trigger, config.completion.fullItem);
                logger.stepSuccess(2, 'Completion inserted');

                const after = await editor.getEditor().getText();
                expect(after).to.include(config.completion.fullItem);
                await wait.sleep(1000);

                const lineText = await editor.getEditor().getTextAtLine(3);
                await editor.getEditor().setTextAtLine(3, lineText.trimEnd() + `=${config.completion.value}`);

                await editor.getEditor().save();
                await wait.sleep(500);

                logger.testComplete(`${config.tabTitle} ${config.completion.trigger} populates correct ${config.completion.fullItem} completion`);
            } catch (error) {
                logger.testFailed(`${config.tabTitle} ${config.completion.trigger} populates correct ${config.completion.fullItem} completion`, error);
                throw error;
            }
        });

        it('Show that INVALID text displays diagnostic and quick fix removes it', async function () {
            this.timeout(90000);
            logger.testStart('Show that INVALID text displays diagnostic and quick fix removes it');
            try {
                await editorUtils.replaceTextWithinLineContaining(
                    editor.getEditor(),
                    config.diagnostic.lineToken,
                    config.diagnostic.validValue,
                    'INVALID'
                );

                await editor.getEditor().save();
                await wait.sleep(500);

                const problems = new ProblemsPage();
                const found = await problems.hasDiagnostic(config.diagnostic.diagnosticMessage);
                expect(found).to.be.true;
                logger.testComplete('Diagnostic shows INVALID value');

                const buffer = await editor.getEditor().getText();
                logger.info('Buffer before quick fix: ' + JSON.stringify(buffer));

                await new QuickFixPage().applyFix(editor, 'INVALID', config.diagnostic.quickFixLabel);
                await wait.sleep(3000);
                await editor.getEditor().save();
                await wait.sleep(5000);

                const afterFix = await editor.getEditor().getText();
                expect(afterFix).to.include(config.diagnostic.validValue);
                expect(await problems.hasDiagnostic(config.diagnostic.diagnosticMessage)).to.be.false;
            } catch (error) {
                logger.testFailed('Diagnostic/quick-fix test flow failed', error);
                throw error;
            }
        });
    });
}
