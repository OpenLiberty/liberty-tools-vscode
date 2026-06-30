/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { TextEditor } from 'vscode-extension-tester';
import { EditorPage } from "./EditorPage";

export class CodeAssistPage {

    async insertSnippet(editor: EditorPage, snippetTrigger: string, fullSnippet: string): Promise<void> {
        await editor.getEditor().typeText(snippetTrigger);
        const assist = await editor.getEditor().toggleContentAssist(true);
        if (assist) {
            // Wait until the target item is interactable before selecting.
            // Newer VS Code virtualises the content-assist list — the item exists
            // in the DOM immediately but is not scrolled into view/clickable until
            // the list has fully rendered.
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                try {
                    await assist.getItem(fullSnippet);
                    break; // item is present and didn't throw
                } catch {
                    await new Promise(res => setTimeout(res, 500));
                }
            }
            await assist.select(fullSnippet);
            await new Promise(res => setTimeout(res, 600)); // 300–800ms
        }
        await editor.getEditor().toggleContentAssist(false);
    }
}