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
        // openEditor(title, groupIndex=0) only searches group 0. On CI, VS Code
        // sometimes opens the file in a non-zero group (e.g. after a workspace
        // transition). Search all groups and open from whichever one has the tab.
        const editorView = new EditorView();
        const groups = await editorView.getEditorGroups();
        for (const group of groups) {
            try {
                const titles = await group.getOpenEditorTitles();
                if ((titles as string[]).includes(tabTitle)) {
                    this.editor = await group.openEditor(tabTitle) as TextEditor;
                    return this;
                }
            } catch { /* group may be empty or stale — try next */ }
        }
        // Fall back to group 0 (will throw with a clear message if still not found)
        this.editor = await editorView.openEditor(tabTitle) as TextEditor;
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
