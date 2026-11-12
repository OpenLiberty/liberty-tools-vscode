/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */

'use strict';

import {
    DefaultTreeItem, Workbench,
    InputBox, VSBrowser, WaitHelper,
} from "vscode-extension-tester";

// NOTE: For MAC OS, Open issue with vscode-extension-tester for ContextMenu Click -> https://github.com/redhat-developer/vscode-extension-tester/issues/444
// So workaround using InputBOx to Map the contextmenu input to its corresponding Action for MAC till the issue is resolved in tool
export async function MapContextMenuforMac(item: DefaultTreeItem, MapAction: string): Promise<boolean> {
    const workbench = new Workbench();
    await workbench.openCommandPrompt();
    return await setInputBox(`>${MapAction}`);
}
export async function setInputBox(MapActionString: string): Promise<boolean> {
    const input = await InputBox.create();
    if (typeof MapActionString === "string") {
        await input.setText(MapActionString);
        // The command palette orders matches by recent use, so the top pick is not always the
        // command we typed (e.g. ">Liberty: Start..." can rank "Liberty: Start in debug mode" first).
        // Select the pick whose label matches exactly; fall back to Enter for non-command input.
        const label = MapActionString.startsWith(">") ? MapActionString.substring(1) : undefined;
        if (label) {
            const driver = VSBrowser.instance.driver;
            const pick = await driver.wait(async () => {
                for (const p of await input.getQuickPicks()) {
                    if ((await p.getLabel()) === label) {
                        return p;
                    }
                }
                return undefined;
            }, 10000, `Command palette item not found: ${label}`);
            await pick!.select();
            return true;
        }
        await input.confirm();
        return true;
    } else {
        return false;
    }
}