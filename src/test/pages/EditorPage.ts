/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { EditorView, TextEditor, VSBrowser } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';

export class EditorPage {
    private editor!: TextEditor;
    private editorView = new EditorView();

    /**
     * Open a file and bind this page object to its editor.
     * @param filePath    Absolute path to the file.
     * @param tabTitle    The editor tab title (usually the file name).
     * @param loadDelayMs Time to let the file/language server settle.
     */
    async openFile(filePath: string, tabTitle: string, loadDelay = 3000): Promise<this> {
        await VSBrowser.instance.openResources(filePath, async () => {
            await utils.getWaitHelper().sleep(loadDelay);
        });
        // openEditor can fail on slow CI if the tab hasn't rendered yet —
        // retry for up to 30 s before giving up.
        this.editor = await utils.waitForCondition(async () => {
            try {
                return await this.editorView.openEditor(tabTitle) as TextEditor;
            } catch {
                return undefined;
            }
        }, 30) as TextEditor;
        return this;
    }

    getEditor(): TextEditor {
        return this.editor;
    }
}
