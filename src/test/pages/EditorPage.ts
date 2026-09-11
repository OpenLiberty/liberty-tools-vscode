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
     * Polls until the editor tab is visible rather than sleeping a fixed amount,
     * so it works reliably even when VSCode is slow to register the new tab.
     *
     * @param filePath  Absolute path to the file.
     * @param tabTitle  The editor tab title (usually the file name).
     * @param timeoutS  Maximum seconds to wait for the tab to appear (default 30).
     */
    async openFile(filePath: string, tabTitle: string, timeoutS = 30): Promise<this> {
        await VSBrowser.instance.openResources(filePath);
        this.editor = await utils.waitForCondition(async () => {
            try {
                const titles = await this.editorView.getOpenEditorTitles();
                if (!(titles as string[]).includes(tabTitle)) { return undefined; }
                return await this.editorView.openEditor(tabTitle) as TextEditor;
            } catch {
                return undefined;
            }
        }, timeoutS);
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
