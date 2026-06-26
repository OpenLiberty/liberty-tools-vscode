import { TextEditor, VSBrowser, Workbench } from 'vscode-extension-tester';
import * as utils from './testUtils';

/**
 * Reset the editor to an empty, saved buffer.
 */
export async function clearEditor(editor: TextEditor): Promise<void> {
    await editor.setText('');
    await editor.save();
}

/**
 * Place the cursor at the start of the last line of content.
 * Note: split('\n').length counts a trailing empty segment when the file
 * ends in a newline, so `lastLine - 1` lands on the last real line.
 */
export async function moveCursorToEnd(editor: TextEditor): Promise<void> {
    const lastLine = (await editor.getText()).split('\n').length;
    await editor.setCursor(lastLine - 1, 1);
}

/**
 * On the first line containing `token`, replace `find` with `replace`.
 * Does not save.
 * @throws if no line contains `token`.
 */
export async function replaceTextWithinLineContaining(
    editor: TextEditor,
    token: string,
    find: string,
    replace: string
): Promise<void> {
    const lineNum = await editor.getLineOfText(token);
    if (lineNum < 1) throw new Error(`Could not find a line containing "${token}"`);
    const oldLine = await editor.getTextAtLine(lineNum);
    await editor.setTextAtLine(lineNum, oldLine.replace(find, replace));
}

/**
 * Position the cursor, trigger the hover widget, and return its text.
 * @param elementDescription Human-readable element name, for logging.
 */
export async function hoverOver(
    editor: TextEditor,
    line: number,
    column: number,
    elementDescription: string,
    timeoutMs = 15000
): Promise<string> {
    await editor.setCursor(line, column);
    await new Workbench().executeCommand('editor.action.showHover');
    return utils.waitForHoverWidget(VSBrowser.instance.driver, elementDescription, timeoutMs);
}
