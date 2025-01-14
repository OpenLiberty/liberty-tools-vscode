'use strict';

import {
    DefaultTreeItem, Workbench,
    InputBox,
} from "vscode-extension-tester";
import * as utils from './testUtils';
import * as constants from '../definitions/constants';

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

/**
 * Function to enter corresponding command in the command prompt to display test report for gradle project
 */
export async function viewTestReportForMac() {
    const workbench = new Workbench();
      await workbench.openCommandPrompt();
      await utils.delay(3000);
      await workbench.executeCommand(constants.GRADLE_TR_DASHABOARD_MAC_ACTION);
      await utils.delay(3000);

      setInputBox(constants.GRADLE_PROJECT);
      await utils.delay(2500);
}