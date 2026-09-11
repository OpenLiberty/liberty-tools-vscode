/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { TextEditor } from 'vscode-extension-tester';
import { EditorPage } from "./EditorPage";
import * as utils from '../utils/testUtils';

export class CodeAssistPage {

    /**
     * Type `snippetTrigger` at the current cursor position, wait for the
     * content-assist list to contain `fullSnippet`, then select it.
     */
    async insertSnippet(editor: EditorPage, snippetTrigger: string, fullSnippet: string): Promise<void> {
        await editor.getEditor().typeText(snippetTrigger);

        // Wait for the assist list to open and contain the target item before selecting.
        // toggleContentAssist(true) can return before the LS has populated the list.
        const assist = await utils.waitForCondition(async () => {
            return await editor.getEditor().toggleContentAssist(true) ?? undefined;
        }, 15);

        await utils.waitForCondition(async () => {
            try {
                const item = await assist.getItem(fullSnippet);
                return item ? true : undefined;
            } catch {
                return undefined;
            }
        }, 15);

        await assist.select(fullSnippet);
        await editor.getEditor().toggleContentAssist(false);
    }
}