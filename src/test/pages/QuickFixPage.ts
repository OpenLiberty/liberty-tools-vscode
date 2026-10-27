/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { By, Key, VSBrowser, WebDriver } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';
import { EditorPage } from "./EditorPage";


export class QuickFixPage {
    private get driver(): WebDriver {
        return VSBrowser.instance.driver;
    }
    
    async applyFix(editorPage: EditorPage, token: string, fixLabel: string, timeoutMs = 30000){
        const wait = utils.getWaitHelper();
        const applied = await wait.forCondition(async () => {
            try {
                await this.openQuickFix(editorPage, token);

                const options = await this.driver.findElements(By.css('.action-widget .action-list-item, .action-widget .monaco-list-row'));
                for (const opt of options) {
                    const text = await opt.getText();
                    if (text.toLowerCase().includes(fixLabel.toLowerCase())) {
                        await this.driver.executeScript('arguments[0].click();', opt);
                        return true;
                    }
                }
                // Dismiss so the next iteration can reopen cleanly
                await this.driver.actions().sendKeys(Key.ESCAPE).perform();
                return undefined;
            } catch {
                return undefined;
            }
        }, { timeout: timeoutMs, pollInterval: 3000, message: `No quick fix matching "${fixLabel}" was offered` });

        return applied;
    }

    async openQuickFix(editorPage: EditorPage, token:string){
        // Get column on the method name 
        await editorPage.getEditor().selectText(token);  
        await utils.getWaitHelper().sleep(300); 
        
        // Open the quick-fix menu with Cmd+. (Mac) / Ctrl+. (Linux/Windows)
        const modKey = process.platform === 'darwin' ? Key.COMMAND : Key.CONTROL;
        await this.driver.actions().keyDown(modKey).sendKeys('.').keyUp(modKey).perform();
        await utils.getWaitHelper().sleep(2000); 
    }
}