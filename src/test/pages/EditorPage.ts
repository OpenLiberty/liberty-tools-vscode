/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { EditorView, TextEditor, VSBrowser } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';

export class EditorPage {
    private editor!: TextEditor;

    /**
     * Open a file and bind this page object to its editor.
     *
     * openResources already handles: code -r (reuse window), waitForWorkbench,
     * and tab verification (with quick-open retry if the CLI drops the request).
     * The optional `settleMs` delay runs after the workbench is ready to allow
     * language servers time to begin processing the newly opened file.
     *
     * @param filePath  Absolute path to the file.
     * @param tabTitle  The editor tab title (usually the file name).
     * @param settleMs  Extra wait after workbench ready, for LS settle time (default 1500ms).
     */
    async openFile(filePath: string, tabTitle: string, settleMs = 1500): Promise<this> {
        await VSBrowser.instance.openResources(filePath, async () => {
            await utils.getWaitHelper().sleep(settleMs);
        });
        this.editor = await new EditorView().openEditor(tabTitle) as TextEditor;
        return this;
    }

    static from(editor: TextEditor): EditorPage {
        const page = new EditorPage();
        page.editor = editor;
        return page;
    }

    getEditor(): TextEditor {
        return this.editor;
    }
}
