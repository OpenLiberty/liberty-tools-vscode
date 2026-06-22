import { TextEditor } from 'vscode-extension-tester';
import { EditorPage } from "./EditorPage";

export class CodeAssistPage {

    async insertSnippet(editor: EditorPage, snippetTrigger: string, fullSnippet: string): Promise<void> {
        await editor.getEditor().typeText(snippetTrigger);
        const assist = await editor.getEditor().toggleContentAssist(true);
        if (assist) {
            await assist.select(fullSnippet);
            await new Promise(res => setTimeout(res, 600)); // 300–800ms
        }
        await editor.getEditor().toggleContentAssist(false);
    }
}