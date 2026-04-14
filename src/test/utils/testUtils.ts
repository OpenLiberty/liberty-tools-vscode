/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog, VSBrowser, WaitHelper } from 'vscode-extension-tester';
import * as fs from 'fs';
import { STOP_DASHBOARD_MAC_ACTION } from '../definitions/constants';
import { MapContextMenuforMac } from './macUtils';
import { logger } from './testLogger';
import clipboard = require('clipboardy');
import { expect } from 'chai';

// Singleton WaitHelper instance
let waitHelper: WaitHelper | undefined;

/**
 * Get or create the singleton WaitHelper instance.
 * This should be used for all wait operations in tests.
 */
export function getWaitHelper(): WaitHelper {
    if (!waitHelper) {
        waitHelper = new WaitHelper(VSBrowser.instance.driver);
    }
    return waitHelper;
}

/**
 * @deprecated Use getWaitHelper().sleep() or preferably condition-based waiting instead
 */
export function delay(millisec: number) {
    return new Promise(resolve => setTimeout(resolve, millisec));
}

/**
 * Utility to retry a function until its value becomes nonnull and nonfalse.
 * Needed for handling timing issues with UI elements.
 */
export async function waitForCondition<T>(func: () => Promise<T>, timeout: number = 30): Promise<NonNullable<T>> {
    const wait = getWaitHelper();
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
        // Get fresh content on each iteration to avoid stale references
        const contentPart = sidebar.getContent();
        const sections = await contentPart.getSections();
        
        // Find the Liberty Dashboard section
        for (const sec of sections) {
            const title = await sec.getTitle();
            if (title === 'Liberty Dashboard') {
                return sec;
            }
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
    
    // Wait for section container to become stable after expansion
    const wait = getWaitHelper();
    await wait.sleep(2000);
    
    // Wait for items to be visible after expansion with retry on ElementNotInteractableError
    await wait.forCondition(async () => {
        try {
            const items = await section.getVisibleItems();
            return items && items.length > 0;
        } catch (error: any) {
            // Retry on ElementNotInteractableError
            if (error.name === 'ElementNotInteractableError') {
                logger.info('Container not yet interactable, retrying...');
                return;
            }
            throw error;
        }
    }, { timeout: 10000, message: 'Dashboard items did not appear after expansion' });
    
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

export async function chooseCmdFromHistory(command: string): Promise<boolean> {

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

export async function deleteReports(reportPath: string): Promise<boolean> {

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

export async function checkIfTestReportExists(reportPath: string): Promise<boolean> {
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

export async function checkTerminalforServerState(serverStatusCode: string): Promise<boolean> {
    const workbench = new Workbench();
    const wait = getWaitHelper();
    
    try {
        await wait.forCondition(async () => {
            clipboard.writeSync(''); // clean slate for clipboard
            await workbench.executeCommand('terminal select all');
            const text = clipboard.readSync();
            
            if (text.includes(serverStatusCode)) {
                logger.info("Found text " + serverStatusCode);
                return true;
            }
            else if (text.includes("FAILURE")) {
                logger.info("Found failure in terminal output");
                throw new Error("Server startup/shutdown failed");
            }
            else {
                logger.info("Waiting for server state...");
                return;
            }
        }, {
            timeout: 200000, // 200 seconds max wait
            pollInterval: 10000, // check every 10 seconds
            message: `Server state '${serverStatusCode}' not found in terminal`
        });
        
        await workbench.executeCommand('terminal clear');
        return true;
    } catch (error) {
        logger.error("Failed to find server state in terminal", error);
        await workbench.executeCommand('terminal clear');
        return false;
    }
}

export async function checkTestStatus(testStatus: string): Promise<boolean> {
    const workbench = new Workbench();
    const wait = getWaitHelper();
    
    try {
        await wait.forCondition(async () => {
            clipboard.writeSync('');
            await workbench.executeCommand('terminal select all');
            const text = clipboard.readSync();
            
            if (text.includes(testStatus)) {
                logger.info("Found text " + testStatus);
                return true;
            }
            return;
        }, {
            timeout: 10000, // 10 seconds max wait
            pollInterval: 2000, // check every 2 seconds
            message: `Test status '${testStatus}' not found in terminal`
        });
        
        await workbench.executeCommand('terminal clear');
        return true;
    } catch (error) {
        logger.error("Failed to find test status in terminal", error);
        await workbench.executeCommand('terminal clear');
        return false;
    }
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
    
    // Wait for command to be processed
    const wait = getWaitHelper();
    await wait.sleep(5000);
}

export async function clearCommandPalette() {
    const wait = getWaitHelper();
    await new Workbench().executeCommand('Clear Command History');
    
    // Wait for dialog to appear
    await wait.forCondition(async () => {
        try {
            const dialog = new ModalDialog();
            const message = await dialog.getMessage();
            return message.includes('Do you want to clear the history of recently used commands?');
        } catch {
            return;
        }
    }, { timeout: 5000, message: 'Clear command history dialog did not appear' });
    
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
 * Wait for the Liberty Dashboard to load and become ready.
 * This replaces arbitrary delays with condition-based waiting.
 */
export async function waitForDashboardToLoad(section: any): Promise<void> {
    const wait = getWaitHelper();
    logger.info('Waiting for Liberty Dashboard to load');
    
    // Expand the section
    await waitForSuccess(async () => {
        await section.expand();
    });
    
    // Wait for section container to become stable after expansion
    await wait.sleep(2000);
    
    // Wait for items to appear with retry on ElementNotInteractableError
    await wait.forCondition(async () => {
        try {
            const items = await section.getVisibleItems();
            if (items && items.length > 0) {
                logger.info(`Dashboard loaded with ${items.length} items`);
                return true;
            }
        } catch (error: any) {
            // Retry on ElementNotInteractableError
            if (error.name === 'ElementNotInteractableError') {
                logger.info('Container not yet interactable, retrying...');
                return;
            }
            throw error;
        }
        return;
    }, {
        timeout: 120000, // 2 minutes max
        pollInterval: 5000, // check every 5 seconds
        message: 'Dashboard items did not load'
    });
}

/**
 * Wait for server to start by checking terminal output.
 * Replaces fixed 30-second delays with condition-based waiting.
 */
export async function waitForServerStart(serverStartString: string): Promise<boolean> {
    logger.info('Waiting for server to start');
    const wait = getWaitHelper();
    
    // Give server a moment to begin startup
    await wait.sleep(5000);
    
    return await checkTerminalforServerState(serverStartString);
}

/**
 * Wait for server to stop by checking terminal output.
 */
export async function waitForServerStop(serverStopString: string): Promise<boolean> {
    logger.info('Waiting for server to stop');
    return await checkTerminalforServerState(serverStopString);
}

/**
 * Wait for test report file to exist on filesystem.
 * Replaces polling loop with condition-based waiting.
 */
export async function waitForTestReport(reportPath: string): Promise<boolean> {
    const wait = getWaitHelper();
    logger.info(`Waiting for test report at: ${reportPath}`);
    
    try {
        await wait.forCondition(async () => {
            return fs.existsSync(reportPath);
        }, {
            timeout: 50000, // 50 seconds
            pollInterval: 5000, // check every 5 seconds
            message: `Test report not found at ${reportPath}`
        });
        logger.info('Test report found');
        return true;
    } catch (error) {
        logger.info('Report not found at primary location. Checking alternate location...');
        return false;
    }
}

/**
 * Wait for debugger to attach by checking for BREAKPOINTS section.
 * Replaces fixed 8-second delay with condition-based waiting.
 */
export async function waitForDebuggerAttach(debugView: any): Promise<boolean> {
    const wait = getWaitHelper();
    logger.info('Waiting for debugger to attach');
    
    try {
        await wait.forCondition(async () => {
            const contentPart = debugView.getContent();
            const sections = await contentPart.getSections();
            
            for (const section of sections) {
                const sectionText = await section.getEnclosingElement().getText();
                if (sectionText.includes("BREAKPOINTS")) {
                    logger.info('BREAKPOINTS section found - debugger attached');
                    return true;
                }
            }
            return;
        }, {
            timeout: 30000, // 30 seconds
            pollInterval: 2000, // check every 2 seconds
            message: 'Debugger did not attach - BREAKPOINTS section not found'
        });
        return true;
    } catch (error) {
        logger.error('Failed to detect debugger attachment', error);
        return false;
    }
}

/**
 * Wait for editor tab to open with specific title.
 * Replaces waitForCondition pattern with specialized helper.
 */
export async function waitForEditorTab(tabTitle: string): Promise<string[]> {
    const EditorView = require('vscode-extension-tester').EditorView;
    logger.info(`Waiting for editor tab: ${tabTitle}`);
    return await waitForCondition(async () => {
        const titles = await new EditorView().getOpenEditorTitles();
        if (titles && titles.length > 0 && titles.includes(tabTitle)) {
            return titles;
        }
        return;
    }, 10);
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
