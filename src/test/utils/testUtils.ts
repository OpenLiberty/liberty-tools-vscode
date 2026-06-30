/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */
import path = require('path');
import { Workbench, InputBox, DefaultTreeItem, ModalDialog, VSBrowser, WaitHelper, BottomBarPanel, OutputView, DebugToolbar } from 'vscode-extension-tester';
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
 * Wait for a language server to initialize by checking its output channel.
 * Uses clipboard to read full output content by clicking in output view to focus it.
 *
 * @param channelName The name of the output channel (e.g., 'Language Support for Liberty')
 * @param initMessage The message to look for indicating initialization (e.g., 'Initialized Liberty Language server')
 * @param timeout Timeout in seconds (default: 60)
 */
export async function waitForLanguageServerInit(
    channelName: string,
    initMessage: string,
    timeout: number = 60
): Promise<void> {
    const wait = getWaitHelper();
    const workbench = new Workbench();
    
    logger.info(`Checking if the ${channelName} channel has initialized...`);
    
    await wait.forCondition(async () => {
        try {
            // Open the bottom bar panel (Output).
            // On macOS CI after workspace transitions the BottomBarPanel element
            // can be stale or not yet visible — create a fresh reference each
            // iteration and give it time to become interactable.
            const bottomBar = new BottomBarPanel();
            try {
                await bottomBar.toggle(true);
            } catch (toggleErr: any) {
                // If the panel element itself is not visible/interactable, wait
                // briefly and signal retry rather than immediately failing.
                logger.info(`BottomBarPanel toggle failed (${toggleErr.name}), will retry...`);
                await wait.sleep(2000);
                return false;
            }
            await wait.sleep(500);
            
            // Get the OutputView
            let outputView;
            try {
                outputView = await bottomBar.openOutputView();
            } catch (ovErr: any) {
                logger.info(`openOutputView failed (${ovErr.name}), will retry...`);
                await wait.sleep(2000);
                return false;
            }
            await wait.sleep(500);
            
            // Select the specific output channel.
            // The channel option may not exist yet if the language server hasn't
            // registered its output channel — treat as retry.
            try {
                await outputView.selectChannel(channelName);
            } catch (selErr: any) {
                logger.info(`selectChannel failed (${selErr.name}), channel not yet registered, will retry...`);
                await dismissNotifications();
                await bottomBar.toggle(false);
                await wait.sleep(2000);
                return false;
            }
            await wait.sleep(1000);
            
            // Click in the output view to focus it, then use clipboard to get content
            const outputElement = await outputView.getEnclosingElement();
            await outputElement.click();
            await wait.sleep(500);
            
            clipboard.writeSync(''); // Clear clipboard
            await workbench.executeCommand('editor.action.selectAll');
            await wait.sleep(500);
            await workbench.executeCommand('editor.action.clipboardCopyAction');
            await wait.sleep(500);
            const outputText = clipboard.readSync();
            
            // Dismiss any notification toasts before closing — a toast covering
            // the panel close button causes ElementClickInterceptedError on macOS CI
            await dismissNotifications();
            // Close the output panel
            await bottomBar.toggle(false);
            
            if (outputText.includes(initMessage)) {
                logger.info(`${channelName} initialized successfully`);
                return true;
            }
            
            logger.info(`Waiting for the ${channelName} channel initialization message...`);
            return false;
        } catch (error) {
            logger.info(`Error checking the ${channelName} channel: ${error}, retrying...`);
            // Ensure panel is closed so the next iteration starts clean
            try {
                await dismissNotifications();
                await new BottomBarPanel().toggle(false);
            } catch { /* ignore */ }
            return false;
        }
    }, {
        timeout: timeout * 1000,
        pollInterval: 3000,
        message: `The ${channelName} output channel did not initialize within ${timeout} seconds`
    });
}

/**
 * Wait for hover widget to appear with content after triggering hover command.
 * This function dynamically waits for the hover widget to render and contain content,
 * accounting for language server initialization delays.
 * Works for both Liberty Language Server and LSP4Jakarta hover content.
 *
 * @param driver The WebDriver instance
 * @param elementDescription Description of the element being hovered (for logging)
 * @param timeout Timeout in milliseconds (default: 15000)
 * @returns The hover text content if widget appeared with content, empty string otherwise
 */
export async function waitForHoverWidget(
    driver: any,
    elementDescription: string,
    timeout: number = 15000
): Promise<string> {
    const wait = getWaitHelper();
    
    const result = await wait.forCondition(async () => {
        try {
            const hoverWidget = await driver.findElement({ css: '.monaco-hover' });
            const isDisplayed = await hoverWidget.isDisplayed();
            if (isDisplayed) {
                const hoverText = await hoverWidget.getText();
                logger.info(`Hover content for ${elementDescription}: ${hoverText.length} characters`);
                // Verify hover contains content (language server provides documentation)
                if (hoverText && hoverText.length > 0) {
                    return hoverText;
                }
            }
        } catch {
            return undefined;
        }
        return undefined;
    }, {
        timeout: timeout,
        pollInterval: 500,
        message: `Hover widget did not appear with content for ${elementDescription}`
    });
    
    return result || '';
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

/**
 * Dismiss any visible VS Code notification toasts.
 * Toasts can intercept clicks on other elements (e.g. the BottomBarPanel close
 * button), causing ElementClickInterceptedError.  Call this before toggle(false)
 * when the panel was opened for reading output.
 */
export async function dismissNotifications(): Promise<void> {
    try {
        const workbench = new Workbench();
        await workbench.executeCommand('notifications.clearAll');
        await getWaitHelper().sleep(300);
    } catch {
        // Non-fatal — if there are no notifications the command is a no-op
    }
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

export function getGradle9ProjectPath(): string {
    const gradle9ProjectPath = path.join(__dirname, "..", "..", "..", "src", "test", "resources", "gradle", "liberty-gradle-9-test-wrapper-app");
    logger.info("Path is : " + gradle9ProjectPath);
    return gradle9ProjectPath;
}


export async function getDashboardSection(sidebar: any): Promise<any> {
    logger.info("Getting Liberty Tools section");
    const wait = getWaitHelper();
    return await wait.forCondition(async () => {
        try {
            // Get fresh content on each iteration to avoid stale references
            const contentPart = sidebar.getContent();
            const sections = await contentPart.getSections();
            
            // Find the Liberty Tools section
            for (const sec of sections) {
                const title = await sec.getTitle();
                if (title === 'Liberty Tools') {
                    return sec;
                }
            }
        } catch (error: any) {
            // Sidebar DOM may be stale during a workspace transition — retry
            if (error.name === 'StaleElementReferenceError' ||
                error.name === 'ElementNotInteractableError') {
                logger.info(`getDashboardSection: transient error (${error.name}), retrying...`);
                return;
            }
            throw error;
        }
        return;
    }, {
        timeout: 120000,
        pollInterval: 3000,
        message: 'Liberty Tools section not found in sidebar within 120 seconds'
    });
}

export async function getDashboardItem(section: any, projectName: string): Promise<DefaultTreeItem> {
    logger.info(`Getting dashboard item: ${projectName}`);
    
    const wait = getWaitHelper();

    // Ensure section is expanded — retry on stale/interactable errors which
    // are common on macOS CI after a workspace transition.
    await wait.forCondition(async () => {
        try {
            await section.expand();
            return true;
        } catch (error: any) {
            if (error.name === 'ElementNotInteractableError' ||
                error.name === 'StaleElementReferenceError') {
                logger.info('Section not yet interactable for expand, retrying...');
                return;
            }
            throw error;
        }
    }, { timeout: 30000, pollInterval: 2000, message: 'Section could not be expanded' });
    
    // Wait for section container to become stable after expansion
    await wait.sleep(2000);
    
    // Wait for items to be visible after expansion with retry on stale/interactable errors.
    // On macOS CI after a workspace open the Liberty extension can take 30–60s to populate
    // the dashboard tree — use a generous timeout.
    await wait.forCondition(async () => {
        try {
            const items = await section.getVisibleItems();
            return items && items.length > 0;
        } catch (error: any) {
            // Retry on transient DOM errors
            if (error.name === 'ElementNotInteractableError' ||
                error.name === 'StaleElementReferenceError') {
                logger.info('Container not yet interactable, retrying...');
                return;
            }
            throw error;
        }
    }, { timeout: 120000, pollInterval: 5000, message: 'Dashboard items did not appear after expansion' });
    
    // Find the item
    return await waitForCondition(async () => {
        return await section.findItem(projectName) as DefaultTreeItem;
    }, 60);
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
        
        // Wait for input to be fully ready before confirming
        const wait = getWaitHelper();
        await wait.sleep(2000);
        
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
            
            // Wait for selection to be processed before confirming
            const wait = getWaitHelper();
            await wait.sleep(2000);
            
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
            else if (text.includes("FAILURE") || text.includes("BUILD FAILURE")) {
                logger.info("Found failure in terminal output");
                throw new Error("Server startup/shutdown failed");
            }
            else {
                logger.info("Waiting for server state...");
                return;
            }
        }, {
            timeout: 300000, // 300 seconds (5 minutes) max wait - increased for custom params
            pollInterval: 10000, // check every 10 seconds
            message: `Server state '${serverStatusCode}' not found in terminal`
        });
        
        return true;
    } catch (error) {
        logger.error("Failed to find server state in terminal", error);
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
            timeout: 120000, // 120 seconds (2 minutes) max wait for tests to complete
            pollInterval: 5000, // check every 5 seconds
            message: `Test status '${testStatus}' not found in terminal`
        });
        
        return true;
    } catch (error) {
        logger.error("Failed to find test status in terminal", error);
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
 * @param reportPath Primary report path to check
 * @param alternatePath Optional alternate report path to check simultaneously
 * @returns true if report found at either location, false otherwise
 */
export async function waitForTestReport(reportPath: string, alternatePath?: string): Promise<boolean> {
    const wait = getWaitHelper();
    logger.info(`Waiting for test report at: ${reportPath}`);
    if (alternatePath) {
        logger.info(`Also checking alternate location: ${alternatePath}`);
    }
    
    try {
        await wait.forCondition(async () => {
            if (fs.existsSync(reportPath)) {
                logger.info('Test report found at primary location');
                return true;
            }
            if (alternatePath && fs.existsSync(alternatePath)) {
                logger.info('Test report found at alternate location');
                return true;
            }
            return;
        }, {
            timeout: 50000, // 50 seconds max (for slow systems)
            pollInterval: 1000, // check every 1 second (faster detection)
            message: alternatePath
                ? `Test report not found at either ${reportPath} or ${alternatePath}`
                : `Test report not found at ${reportPath}`
        });
        return true;
    } catch (error) {
        logger.error('Test report not found');
        return false;
    }
}

/**
 * Wait for debugger to attach by checking for the DebugToolbar.
 * The DebugToolbar only appears when a debug session is successfully connected.
 */
export async function waitForDebuggerAttach(): Promise<boolean> {
    logger.info('Waiting for debugger to attach (checking for DebugToolbar)');
    
    try {
        // Wait for the debug toolbar to appear, which indicates debugger is attached
        const findDebugBarTimeout = 30000;
        await DebugToolbar.create(findDebugBarTimeout);
        logger.info('DebugToolbar appeared - debugger attached successfully');
        return true;
    } catch (error) {
        logger.error('Failed to detect debugger attachment - DebugToolbar did not appear', error);
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
    }, 60); // Increased to 60 seconds to allow time for report generation
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

/**
 * Close the current workspace to prepare for the next test file.
 * This ensures each test file starts with a clean workspace when running multiple test files.
 * Essential when test files open different projects (e.g., Gradle 9 vs regular Gradle vs Maven).
 */
export async function closeWorkspace(): Promise<void> {
    try {
        logger.info('Closing current workspace for next test file...');
        const workbench = new Workbench();
        const wait = getWaitHelper();

        // Revert all files first so VS Code doesn't show a "Save changes?" modal
        // when closeFolder is issued. On Linux this modal blocks the renderer entirely.
        try {
            await workbench.executeCommand('revert file');
            await wait.sleep(300);
        } catch { /* no active editor — fine */ }

        // Close all open editors first
        try {
            const EditorView = require('vscode-extension-tester').EditorView;
            await new EditorView().closeAllEditors();
            logger.info('Closed all editors');
        } catch (error) {
            logger.info('Failed to close editors, continuing...');
        }

        // Close the workspace/folder
        await workbench.executeCommand('workbench.action.closeFolder');

        // Dismiss any blocking modal that VS Code may show after closeFolder
        // (e.g. "Do you want to save?" or "A task is running, terminate it?").
        // These modals freeze the renderer on Linux if left open.
        await wait.sleep(500);
        try {
            const dialog = new ModalDialog();
            const buttons = await dialog.getButtons();
            const dismissLabels = ["Don't Save", 'Terminate', 'OK', 'Yes'];
            for (const btn of buttons) {
                const label = await btn.getText();
                if (dismissLabels.includes(label)) {
                    await btn.click();
                    break;
                }
            }
        } catch { /* no modal present — fine */ }

        // Wait until VS Code has actually finished closing the workspace.
        // On macOS CI runners the teardown can take 10+ seconds; a fixed sleep
        // is insufficient.  Poll until the Explorer sidebar no longer shows the
        // Liberty Tools section (which disappears when no folder is open).
        try {
            await wait.forCondition(async () => {
                try {
                    const { SideBarView } = require('vscode-extension-tester');
                    const sidebar = new SideBarView();
                    const content = sidebar.getContent();
                    const sections = await content.getSections();
                    for (const sec of sections) {
                        const title = await sec.getTitle();
                        if (title === 'Liberty Tools') {
                            // Section still present — workspace not fully closed yet
                            return;
                        }
                    }
                    // Liberty Tools section gone — workspace closed
                    return true;
                } catch {
                    // Sidebar may throw while the window is transitioning — treat as ready
                    // (no sidebar content means workspace is closed)
                    return true;
                }
            }, {
                timeout: 30000,
                pollInterval: 1000,
                message: 'Workspace did not finish closing within 30 seconds'
            });
        } catch {
            // If the gate itself fails, fall back to a generous sleep
            logger.info('closeWorkspace gate timed out, falling back to fixed wait');
            await wait.sleep(5000);
        }

        logger.info('Workspace closed successfully');
    } catch (error) {
        logger.error('Error closing workspace', error);
        // Don't throw - allow tests to continue even if close fails
    }
}
