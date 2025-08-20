/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2025
 */

'use strict';

import {
    DefaultTreeItem, Workbench,
    InputBox,
} from "vscode-extension-tester";


// NOTE: For MAC OS, Open issue with vscode-extension-tester for ContextMenu Click -> https://github.com/redhat-developer/vscode-extension-tester/issues/444
// So workaround using InputBOx to Map the contextmenu input to its corresponding Action for MAC till the issue is resolved in tool
export async function MapContextMenuforMac(item: DefaultTreeItem, MapAction: string): Promise<boolean> {
    await item.click();
    const workbench = new Workbench();
    await workbench.openCommandPrompt();
    return await setInputBox(`>${MapAction}`);
}
export async function setInputBox(MapActionString: string): Promise<boolean> {
    const input = await InputBox.create();
    if (typeof MapActionString === "string") {
        await input.setText(MapActionString);
        await input.confirm();
        await input.click();
        return true;
    } else {
        return false;
    }
}