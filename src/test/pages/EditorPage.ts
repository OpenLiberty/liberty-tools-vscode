import { EditorView, TextEditor, VSBrowser, Workbench } from 'vscode-extension-tester';
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
    async openFile(filePath: string, tabTitle: string, loadDelay = 3000) : Promise<this> {
            await VSBrowser.instance.openResources(filePath, async () => {
            await utils.getWaitHelper().sleep(loadDelay); 
        });
        this.editor = await this.editorView.openEditor(tabTitle) as TextEditor;
        return this; 
    }

    getEditor(): TextEditor {
        return this.editor;
    }

    /** Reset the editor to an empty, saved buffer. */
    async clear(): Promise<void> {
        await this.editor.setText('');
        await this.editor.save();
    }

    /**
     * Place the cursor at the start of the last line of content.
     * Note: split('\n').length counts a trailing empty segment when the file
     * ends in a newline, so `lastLine - 1` lands on the last real line.
     */
    async moveCursorToEnd(): Promise<void> {
        const lastLine = (await this.editor.getText()).split('\n').length;
        await this.editor.setCursor(lastLine - 1, 1);

    }

    /**
     * On the first line containing `token`, replace `find` with `replace`.
     * Does not save. 
     * @throws if no line contains `token`.
     */
    async replaceTextWithinLineContaining(token: string, find: string, replace: string) : Promise<void>{
        const lineNum = await this.editor.getLineOfText(token);
        if (lineNum < 1) throw new Error(`Could not find a line containing "${token}"`);
        const oldLine = await this.editor.getTextAtLine(lineNum);
        await this.editor.setTextAtLine(lineNum, oldLine.replace(find, replace));
    }

    /**
     * Position the cursor, trigger the hover widget, and return its text.
     * @param elementDescription Human-readable element name, for logging.
     */
    async hoverOver(
            line: number,
            column: number,
            elementDescription: string,
            timeoutMs = 15000
        ): Promise<string> {
            await this.editor.setCursor(line, column);
            await new Workbench().executeCommand('editor.action.showHover');
            return utils.waitForHoverWidget(VSBrowser.instance.driver, elementDescription, timeoutMs);
        }



}