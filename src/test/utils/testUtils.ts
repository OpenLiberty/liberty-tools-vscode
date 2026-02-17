/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog, VSBrowser, createWaitHelper } from 'vscode-extension-tester';
import * as fs from 'fs';
import { STOP_DASHBOARD_MAC_ACTION } from '../definitions/constants';
import { MapContextMenuforMac } from './macUtils';
import { logger } from './testLogger';
import clipboard = require('clipboardy');
import { expect } from 'chai';

export function delay(millisec: number) {
    return new Promise(resolve => setTimeout(resolve, millisec));
}

/**
 * Utility to retry a function until its value becomes nonnull and nonfalse.
 * Needed for handling timing issues with UI elements.
 */
export async function waitForCondition<T>(func: () => Promise<T>, timeout: number = 30): Promise<NonNullable<T>> {
    const wait = createWaitHelper(VSBrowser.instance.driver);
    const result = await wait.forCondition(async () => {
        try {
            const value = await func();
            if (value === null || value === undefined || value === false) {
                return;
            }
            return { value };
        } catch {
            return;
        }
    }, { timeout: timeout * 1000 });
    return result!.value;
}

/**
 * Utility to retry a function until it doesn't error.
 * Useful for handling ElementNotInteractableError and other timing issues.
 */
export async function waitForSuccess(func: () => Promise<any>, timeout: number = 30): Promise<void> {
    await waitForCondition(async () => {
        try {
            await func();
            return true;
        } catch {
            return;
        }
    }, timeout);
}

export function getMvnProjectPath(): string {
    const mvnProjectPath = path.join(__dirname, "..", "..", "..", "src", "test", "resources", "maven", "liberty-maven-test-wrapper-app");
    logger.info("Path is : " + mvnProjectPath);
    return mvnProjectPath;
}

export function getGradleProjectPath(): string {
    const gradleProjectPath = path.join(__dirname, "..", "..", "..", "src", "test", "resources", "gradle", "liberty-gradle-test-wrapper-app");
    logger.info("Path is : " + gradleProjectPath);
    return gradleProjectPath;
}

export async function getDashboardSection(sidebar: any): Promise<any> {
    logger.info("Getting Liberty Dashboard section");
    return await waitForCondition(async () => {
        const contentPart = sidebar.getContent();
        const sec = await contentPart.getSection('Liberty Dashboard');
        if (sec) {
            return sec;
        }
        return;
    }, 30);
}

export async function getDashboardItem(section: any, projectName: string): Promise<DefaultTreeItem> {
    logger.info(`Getting dashboard item: ${projectName}`);
    
    // Ensure section is expanded
    await waitForSuccess(async () => {
        await section.expand();
    });
    
    await delay(5000);
    
    // Find the item
    return await waitForCondition(async () => {
        return await section.findItem(projectName) as DefaultTreeItem;
    }, 30);
}

export async function launchDashboardAction(item: DefaultTreeItem, action: string, actionMac: string) {
    if (!item) {
        throw new Error("Cannot launch dashboard action: item is undefined");
    }

    logger.info("Launching action: " + action);
    if (process.platform === 'darwin') {//Only for MAC platform
        await MapContextMenuforMac(item, actionMac);
    } else {  // NON MAC platforms
        logger.info("before contextmenu");
        const menuItem = await item.openContextMenu();
        logger.info("before select");
        await menuItem.select(action);
    }

}

export async function setCustomParameter(customParam: string) {

    logger.info("Setting custom Parameter");
    
    await waitForSuccess(async () => {
        const input = new InputBox();
        await input.click();
        await input.setText(customParam);
        await input.confirm();
    });

}

export async function chooseCmdFromHistory(command: string): Promise<Boolean> {

    logger.info("Choosing command from history");
    
    try {
        await waitForSuccess(async () => {
            const input = new InputBox();
            const pick = await input.findQuickPick(command);
            if (!pick) {
                throw new Error("Quick pick not found");
            }
            await pick.select();
            await input.confirm();
        });
        return true;
    } catch (error) {
        logger.error("Failed to choose command from history", error);
        return false;
    }
}

export async function deleteReports(reportPath: string): Promise<Boolean> {

    //const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
    if (fs.existsSync(reportPath)) {
        fs.unlink(reportPath, (err) => {
            if (err)
                return false;
            else {
                logger.info(reportPath + ' was deleted');
                return true;
            }
        });
    }
    return true;
}

export async function checkIfTestReportExists(reportPath: string): Promise<Boolean> {
    const maxAttempts = 10;
    let foundReport = false;
    //const reportPath = path.join(getMvnProjectPath(),"target","site","failsafe-report.html");
    for (let i = 0; i < maxAttempts; i++) {
        try {

            if (fs.existsSync(reportPath)) {
                foundReport = true;
                break;
            }
            else {
                await delay(5000);
                foundReport = false;
                continue;
            }
        }
        catch (e) {
            logger.error("Caught exception when checking for test report", e);

        }
    }
    return foundReport;
}

export async function checkTerminalforServerState(serverStatusCode: string): Promise<Boolean> {
    const workbench = new Workbench();
    let foundText = false;
    let count = 0;
    do {
        clipboard.writeSync('');//clean slate for clipboard
        await workbench.executeCommand('terminal select all');
        const text = clipboard.readSync();
        if (text.includes(serverStatusCode)) {
            foundText = true;
            logger.info("Found text " + serverStatusCode);
            break;
        }
        else if (text.includes("FAILURE")) {
            logger.info("Found failure " + text);
            foundText = false;
            break;
        }
        else {
            logger.info("test is running ...");
            foundText = false;
        }
        count++;
        await workbench.getDriver().sleep(10000);
    } while (!foundText && (count <= 20));
    await workbench.executeCommand('terminal clear');
    return foundText;
}

export async function checkTestStatus(testStatus: string): Promise<Boolean> {
    const workbench = new Workbench();
    let foundText = false;
    let count = 0;
    do {
        clipboard.writeSync('');
        await workbench.executeCommand('terminal select all');
        const text = clipboard.readSync();
        if (text.includes(testStatus)) {
            foundText = true;
            logger.info("Found text " + testStatus);
            break;
        }
        else
            foundText = false;
        count++;
        await workbench.getDriver().sleep(2000);
    } while (!foundText && (count <= 5));
    await workbench.executeCommand('terminal clear');
    return foundText;
}

/* Stop Server Liberty dashboard post Attach Debugger*/
/* As the Window view changes using command to stop server instead of devmode action */
export async function stopLibertyserver(projectName: string) {
    logger.info("Stop Server action for Project : " + projectName);
    const workbench = new Workbench();
    await workbench.executeCommand(STOP_DASHBOARD_MAC_ACTION);
    const input = InputBox.create();
    (await input).clear();
    (await input).setText(projectName);
    (await input).confirm();
    (await input).click();
    await delay(10000);
}

export async function clearCommandPalette() {
    await new Workbench().executeCommand('Clear Command History');
    await delay(30000);
    
    await waitForSuccess(async () => {
        const dialog = new ModalDialog();
        const message = await dialog.getMessage();

        expect(message).contains('Do you want to clear the history of recently used commands?');

        const buttons = await dialog.getButtons();
        expect(buttons.length).equals(2);
        await dialog.pushButton('Clear');
    });
}

/**
 * Copies screenshots from the temporary VSCode screenshots directory to a permanent location
 * organized by build tool (maven or gradle).
 * @param buildTool The build tool name ('maven' or 'gradle') to organize screenshots
 */
export function copyScreenshotsToProjectFolder(buildTool: string): void {
    const VSBrowser = require('vscode-extension-tester').VSBrowser;
    const sourcePath = VSBrowser.instance.getScreenshotsDir();
    const destinationPath = path.join('./screenshots', buildTool);

    copyFolderContents(sourcePath, destinationPath);
}

/**
 * Recursively copies all files from source folder to destination folder.
 * @param sourceFolder Source directory path
 * @param destinationFolder Destination directory path
 */
function copyFolderContents(sourceFolder: string, destinationFolder: string): void {
    if (!fs.existsSync(sourceFolder)) {
        return;
    }

    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
    }

    const files = fs.readdirSync(sourceFolder);
    for (const file of files) {
        const sourcePath = path.join(sourceFolder, file);
        const destinationPath = path.join(destinationFolder, file);

        if (fs.statSync(sourcePath).isDirectory()) {
            copyFolderContents(sourcePath, destinationPath);
        } else {
            fs.copyFileSync(sourcePath, destinationPath);
        }
    }
}
