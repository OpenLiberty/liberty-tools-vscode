/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as fs from "fs";
import * as fse from "fs-extra";
import * as Path from "path";
import * as vscode from "vscode";
import * as helperUtil from "../util/helperUtil";
import { localize } from "../util/i18nUtil";
import { QuickPickItem } from "vscode";
import { LibertyProject } from "./libertyProject";
import { ProjectRegistry } from "./projectRegistry";
import { ProjectTreeProvider } from "./projectTreeProvider";
import { getReport } from "../util/helperUtil";
import {
    LIBERTY_SERVER_ENV_PORT_REGEX, isMaven, isGradle,
    MAVEN_GOAL_DEV, MAVEN_GOAL_DEVC, GRADLE_TASK_DEV, GRADLE_TASK_DEVC,
    CMD_EXPLORER_REFRESH, CMD_OPEN_BUILD_FILE, CMD_START, CMD_STOP, CMD_DEBUG, CMD_CUSTOM,
    CMD_START_CONTAINER, CMD_RUN_TESTS, CMD_OPEN_FAILSAFE_REPORT, CMD_OPEN_SUREFIRE_REPORT,
    CMD_OPEN_GRADLE_TEST_REPORT, CMD_ADD_PROJECT, CMD_REMOVE_PROJECT,
} from "../definitions/constants";
import { getGradleTestReport } from "../util/gradleUtil";
import { DashboardData } from "./dashboard";
import { ProjectStartCmdParam } from "./projectStartCmdParam";
import { getCommandForMaven, getCommandForGradle, defaultWindowsShell } from "../util/commandUtils";

export const terminals: { [libProjectId: number]: LibertyProject } = {};

function waitForShellIntegration(terminal: vscode.Terminal, timeoutMs = 5000): Promise<vscode.TerminalShellIntegration | undefined> {
    if (terminal.shellIntegration) { return Promise.resolve(terminal.shellIntegration); }
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            sub.dispose();
            console.warn(`[waitForShellIntegration] timed out after ${timeoutMs}ms for terminal=${terminal.name}`);
            resolve(undefined);
        }, timeoutMs);
        const sub = vscode.window.onDidChangeTerminalShellIntegration(event => {
            console.log(`[waitForShellIntegration] onDidChangeTerminalShellIntegration fired, terminal=${event.terminal.name}, match=${event.terminal === terminal}`);
            if (event.terminal === terminal) {
                clearTimeout(timer);
                sub.dispose();
                resolve(event.shellIntegration);
            }
        });
    });
}

class LibertyProjectQuickPickItem implements QuickPickItem {

    project: LibertyProject | undefined;
    label: string;
    description?: string;
    detail: string;

    constructor(itemLabel: string, itemDetail: string, itemProject?: LibertyProject, itemDescription?: string) {
        this.label = itemLabel;
        this.detail = itemDetail;
        this.project = itemProject;
        this.description = itemDescription;
    }
}
// opens pom associated with LibertyProject and starts dev mode
export async function openProject(pomPath: string): Promise<void> {
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pomPath));
}

// open the build file (pom.xml / build.gradle) for a Liberty project
export async function openBuildFile(libProject?: LibertyProject): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    // If the command is selected by the icon in the tree view, directly open that build file.
    if (libProject !== undefined) {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(libProject.getPath()));
        return;
    }
    const targetProject = await projectProvider.pickProject(undefined, CMD_OPEN_BUILD_FILE);
    if (targetProject === undefined) {
        return;
    }
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(targetProject.getPath()));
}

// List all liberty dev commands, triggered by hotkey (Shift+Alt+L)
const COMMAND_TITLES = new Map<string, string>([
    [localize("hotkey.commands.title.refresh"), CMD_EXPLORER_REFRESH],
    [localize("hotkey.commands.title.start"), CMD_START],
    [localize("hotkey.commands.title.start.custom"), CMD_CUSTOM],
    [localize("hotkey.commands.title.start.in.container"), CMD_START_CONTAINER],
    [localize("hotkey.commands.title.debug"), CMD_DEBUG],
    [localize("hotkey.commands.title.stop"), CMD_STOP],
    [localize("hotkey.commands.title.run.tests"), CMD_RUN_TESTS],
    [localize("hotkey.commands.title.view.integration.test.report"), CMD_OPEN_FAILSAFE_REPORT],
    [localize("hotkey.commands.title.view.unit.test.report"), CMD_OPEN_SUREFIRE_REPORT],
    [localize("hotkey.commands.title.view.test.report"), CMD_OPEN_GRADLE_TEST_REPORT],
    [localize("hotkey.commands.title.add.project"), CMD_ADD_PROJECT],
    [localize("hotkey.commands.title.remove.project"), CMD_REMOVE_PROJECT],
    [localize("hotkey.commands.title.open.build.file"), CMD_OPEN_BUILD_FILE],
]);

export async function listAllCommands(): Promise<void> {
    const libertyCommands = Array.from(COMMAND_TITLES.keys());
    vscode.window.showQuickPick(libertyCommands).then(selection => {
        if (!selection) {
            return;
        }
        const command = COMMAND_TITLES.get(selection);
        if (command !== undefined) {
            vscode.commands.executeCommand(command);
        } else {
            // should never happen
            console.error("Unable to find corresponding command for " + selection);
        }

    });
}


/**
 * Ensures a terminal exists for the project, creates one if needed, shows it,
 * and registers it. Returns the terminal, or undefined if creation failed.
 */
function ensureTerminal(project: LibertyProject): vscode.Terminal | undefined {
    let terminal = project.getTerminal();
    if (terminal === undefined) {
        const terminalPath = project.parent
            ? Path.dirname(project.parent.getPath())
            : Path.dirname(project.getPath());
        terminal = createTerminalforLiberty(project, terminal, terminalPath);
    }
    if (terminal !== undefined) {
        terminal.show();
        project.setTerminal(terminal);
    }
    return terminal;
}

async function sendDevModeCommand(
    terminal: vscode.Terminal,
    project: LibertyProject,
    mavenGoal: string,
    gradleTask: string,
    customCommand?: string
): Promise<boolean> {
    let cmd: string | undefined;
    if (isMaven(project.getContextValue())) {
        const pomPath = project.parent ? project.parent.getPath() : project.getPath();
        const artifactId = project.parent ? project.artifactId : undefined;
        cmd = await getCommandForMaven(pomPath, mavenGoal, project.getTerminalType(), customCommand, artifactId);
    } else if (isGradle(project.getContextValue())) {
        cmd = await getCommandForGradle(project.getPath(), gradleTask, project.getTerminalType(), customCommand);
    }
    if (cmd === undefined) { return false; }
    const si = terminal.shellIntegration ?? await waitForShellIntegration(terminal);
    if (si) {
        console.log(`[sendDevModeCommand] using shellIntegration.executeCommand for ${project.label}`);
        si.executeCommand(cmd);
        return true;
    } else {
        console.log(`[sendDevModeCommand] shellIntegration not ready after timeout, falling back to sendText for ${project.label}`);
        terminal.sendText(cmd);
        return false;
    }
}

// start dev mode
export async function startDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_START);
    if (targetProject === undefined) {
        return;
    }

    console.log(localize("starting.liberty.dev.on", targetProject.getLabel()));
    const terminal = ensureTerminal(targetProject);
    if (terminal !== undefined) {
        const tracked = await sendDevModeCommand(terminal, targetProject, MAVEN_GOAL_DEV, GRADLE_TASK_DEV);
        targetProject.setState(tracked ? "starting" : "started");
        projectProvider.notifyDevModeChanged(targetProject);
    }
}

export async function removeProject(): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    const registry = ProjectRegistry.getInstance();

    // clicked on the empty space and workspace has more than one folders, or
    // from command palette
    // Display the list of current user added projects for user to select.
    const items: LibertyProjectQuickPickItem[] = [];
    registry.getUserAddedProjects().forEach(function (item) {
        const qpItem = new LibertyProjectQuickPickItem(item.label,
            item.path);
        items.push(qpItem);
    });
    if (items.length === 0) {
        const message = localize("remove.custom.project.empty.list");
        console.error(message);
        vscode.window.showInformationMessage(message);
    } else {
        vscode.window.showQuickPick(items).then(selection => {
            if (!selection) {
                return;
            }
            const yes = localize("confirmation.button.label.yes");
            const no = localize("confirmation.button.label.no");
            vscode.window
                .showInformationMessage(localize("remove.custom.project.confirmation", Path.dirname(selection.detail)), yes, no)
                .then(answer => {
                    if (answer === yes) {
                        // delete and save
                        registry.removeInPersistedProjects(selection.detail);
                        vscode.window
                            .showInformationMessage(localize("remove.custom.project.successful"));
                        projectProvider.fireChangeEvent();
                    }
                });
        });

    }
}

export async function addProject(): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    const registry = ProjectRegistry.getInstance();

    // Folders with build files rejected by auto-detection — candidates for manual add.
    const folderPaths: string[] = registry.getUnregisteredBuildFolders();

    if (folderPaths.length === 0) {
        const message = localize("add.project.manually.no.projects.available.to.add");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }

    const items: LibertyProjectQuickPickItem[] = folderPaths.map(folderPath => {
        const wsFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folderPath));
        const displayPath = wsFolder
            ? Path.relative(wsFolder.uri.fsPath, folderPath)
            : folderPath;
        return new LibertyProjectQuickPickItem(Path.basename(folderPath), folderPath, undefined, displayPath);
    });

    vscode.window.showQuickPick(items).then(async selection => {
        if (!selection) {
            return;
        }
        if (projectProvider.isMultiProjectUntitledWorkspace()) {
            await ProjectRegistry.getInstance().getContext().globalState.update('selectedProject', selection.detail);
            await projectProvider.checkUntitledWorkspaceAndSaveIt();
        }
        await addProjectsToTheDashBoard(projectProvider, selection.detail);
    });
}
// stop dev mode
export async function stopDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.stop.liberty.dev.on.undefined");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_STOP);
    if (targetProject === undefined) {
        return;
    }

    console.log(localize("stopping.liverty.dev.on", targetProject.getLabel()));
    const terminal = targetProject.getTerminal();
    if (terminal !== undefined) {
        terminal.show();
        terminal.sendText("exit");
        terminal.dispose();
        targetProject.setState("stopping");
        projectProvider.notifyDevModeChanged(targetProject);
    } else {
        const message = localize("liberty.dev.not.started.on", targetProject.getLabel());
        vscode.window.showWarningMessage(message);
    }
}

// attach debugger
export async function attachDebugger(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.attach.debugger.to.undefined");
        console.error(message);
        vscode.window.showErrorMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_DEBUG);
    if (targetProject === undefined) {
        return;
    }

    const EXCLUDED_DIR_PATTERN = "**/{bin,classes}/**";
    let pathPrefix = "";
    if (isMaven(targetProject.getContextValue())) {
        pathPrefix = "target";
    } else if (isGradle(targetProject.getContextValue())) {
        pathPrefix = "build";
    }
    let paths: string[] = [];
    if (pathPrefix !== "") {
        const serverEnvPattern = new vscode.RelativePattern(Path.dirname(targetProject.getPath()), pathPrefix + "/**/server.env");
        paths = (await vscode.workspace.findFiles(serverEnvPattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
    }
    if (paths.length === 1) {
        console.log(localize("attach.debugger.liverty.dev.in", targetProject.getLabel()));
        const file = Path.resolve(paths[0]);
        const lines = await fse.readFileSync(file, "utf8").split("\n");
        let port = "";
        for (let i = 0; i < lines.length && port === ""; i++) {
            const line = lines[i];
            let match = undefined;
            if ((match = LIBERTY_SERVER_ENV_PORT_REGEX.exec(line)) !== null) {
                port = match[1];
            }
        }
        if (port !== "") {
            const path = Path.dirname(targetProject.getPath());
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(targetProject.getPath()));
            vscode.debug.startDebugging(workspaceFolder, {
                "type": "java",
                "name": localize("liberty.dev.debug.label", Path.dirname(targetProject.getPath())),
                "request": "attach",
                "hostName": "localhost",
                "port": port,
                "cwd": path,
                "projectName": targetProject.getLabel()
            }).then(() => {
                // do not show any message
            }, err => {
                vscode.window.showErrorMessage(localize("liberty.dev.attach.debugger.failed.with.error", err.message));
            });
        } else {
            const message = localize("liberty.dev.attach.debugger.failed.no.port.in.server.env", file);
            vscode.window.showErrorMessage(message);
        }
    } else {
        const message = localize("liberty.dev.attach.debugger.failed");
        vscode.window.showErrorMessage(message);
    }
}



// custom start dev mode command with history list
export async function customDevModeWithHistory(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.custom.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_CUSTOM);
    if (targetProject === undefined) {
        return;
    }

    // check if we have history for the selected project.
    const dashboardData: DashboardData = helperUtil.getStorageData(ProjectRegistry.getInstance().getContext());
    const history = dashboardData.lastUsedStartParams.filter(element => element.path === targetProject.getPath());
    if (history.length === 0) {
        // no history, show input.
        await customDevMode(targetProject);
    } else {
        // show history — first item is the default (no params)
        const items: LibertyProjectQuickPickItem[] = [];
        items.push(new LibertyProjectQuickPickItem(" ", history[0].path, targetProject));
        for (const item of history) {
            items.push(new LibertyProjectQuickPickItem(item.param, item.path, targetProject));
        }
        vscode.window.showQuickPick(items).then(selection => {
            if (!selection) {
                return;
            }
            customDevMode(selection.project, selection.label);
        });
    }
}

// custom start dev mode command
// Note: libProject here is already resolved by customDevModeWithHistory — it is always a leaf.
export async function customDevMode(libProject?: LibertyProject | undefined, params?: string | undefined): Promise<void> {
    const _customParameters = (params === undefined) ? "" : params.trim();
    if (libProject === undefined) {
        const message = localize("cannot.custom.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    const registry = ProjectRegistry.getInstance();
    const targetProject = libProject;

    const terminal = ensureTerminal(targetProject);
    if (terminal !== undefined) {

        let placeHolderStr = "";
        let promptString = localize("specify.custom.params.maven");
        if (isMaven(targetProject.getContextValue())) {
            placeHolderStr = "e.g. -DhotTests=true";
        } else if (isGradle(targetProject.getContextValue())) {
            placeHolderStr = "e.g. --hotTests";
            promptString = localize("specify.custom.params.gradle");
        }

        // set focus on the Inputbox
        await vscode.commands.executeCommand('workbench.action.focusNextGroup');

        // prompt for custom command
        let customCommand: string | undefined = await vscode.window.showInputBox(Object.assign({
            validateInput: (value: string) => {
                if (value && value.trim().length > 0 && !value.trim().startsWith("-")) {
                    return localize("params.must.start.with.dash");
                }
                return null;
            },
        },
            {
                placeHolder: placeHolderStr,
                prompt: promptString,
                ignoreFocusOut: true,
                value: _customParameters
            },
        ));
        if (customCommand !== undefined) {
            customCommand = customCommand.trim();
            if (customCommand.length > 0) {
                const projectStartCmdParam: ProjectStartCmdParam = new ProjectStartCmdParam(targetProject.getPath(), customCommand);
                const dashboardData: DashboardData = helperUtil.getStorageData(registry.getContext());
                dashboardData.addStartCmdParams(projectStartCmdParam);
                await helperUtil.saveStorageData(registry.getContext(), dashboardData);
            }

            const tracked = await sendDevModeCommand(terminal, targetProject, MAVEN_GOAL_DEV, GRADLE_TASK_DEV, customCommand);
            targetProject.setState(tracked ? "starting" : "started");
            projectProvider.notifyDevModeChanged(targetProject);
        }
    }
}

// start dev mode in a container
export async function startContainerDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.start.liberty.dev.in.container.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_START_CONTAINER);
    if (targetProject === undefined) {
        return;
    }

    const terminal = ensureTerminal(targetProject);
    if (terminal !== undefined) {
        const tracked = await sendDevModeCommand(terminal, targetProject, MAVEN_GOAL_DEVC, GRADLE_TASK_DEVC);
        targetProject.setState(tracked ? "starting" : "started");
        projectProvider.notifyDevModeChanged(targetProject);
    }
}

// run tests on dev mode
export async function runTests(libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const message = localize("cannot.run.test.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, CMD_RUN_TESTS);
    if (targetProject === undefined) {
        return;
    }

    console.log(localize("running.liberty.dev.tests.on", targetProject.getLabel()));
    const terminal = targetProject.getTerminal();
    if (terminal !== undefined) {
        terminal.show();
        terminal.sendText(" ");
    } else {
        vscode.window.showWarningMessage(localize("liberty.dev.has.not.been.started.on", targetProject.getLabel()));
    }
}

// open surefire, failsafe, or gradle test report
export async function openReport(reportType: string, libProject?: LibertyProject | undefined): Promise<void> {
    const projectProvider: ProjectTreeProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider || !reportType) {
        const message = localize("cannot.open.test.reports.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
        return;
    }
    const targetProject = await projectProvider.pickProject(libProject, reportType);
    if (targetProject === undefined) {
        return;
    }

    const path = Path.dirname(targetProject.getPath());
    if (path !== undefined) {
        let report: any;
        let reportTypeLabel = reportType;
        if (reportType === "gradle") {
            reportTypeLabel = "test";
        }
        let showErrorMessage: boolean = true;
        if (isMaven(targetProject.getContextValue())) {
            report = getReportFile(path, "reports", reportType + ".html");
            showErrorMessage = false;
            if (!await checkReportAndDisplay(report, reportType, reportTypeLabel, targetProject, showErrorMessage)) {
                report = getReportFile(path, "site", reportType + "-report.html");
                showErrorMessage = true;
                await checkReportAndDisplay(report, reportType, reportTypeLabel, targetProject, showErrorMessage);
            }
        } else if (isGradle(targetProject.getContextValue())) {
            report = await getGradleTestReport(targetProject.path, path);
            await checkReportAndDisplay(report, reportType, reportTypeLabel, targetProject, showErrorMessage);
        }
    }
}

// retrieve LibertyProject corresponding to closed terminal and delete terminal
export async function deleteTerminal(terminal: vscode.Terminal): Promise<void> {
    try {
        const pid = await terminal.processId;
        const libProject = terminals[Number(pid)];
        libProject.deleteTerminal();
        const pp = ProjectTreeProvider.getInstance();
        if (pp) { pp.notifyDevModeChanged(libProject); }
    } catch {
        console.error(localize("unable.to.delete.terminal", terminal.name));
    }
}
/**
 * function to create new terminal of default type
 * @param libProject The Liberty project
 * @param terminal The existing terminal (if any)
 * @param terminalPath Optional path to create terminal in (defaults to project directory)
 */
function createTerminalforLiberty(libProject: LibertyProject, terminal: vscode.Terminal | undefined, terminalPath?: string) {
    const path = terminalPath || Path.dirname(libProject.getPath());
    //fetch the default terminal details and store it in LibertyProject object
    const terminalType = defaultWindowsShell();
    libProject.setTerminalType(terminalType);
    terminal = libProject.createTerminal(path);
    if (terminal !== undefined) {
        terminal.processId.then(pid => {
            if (pid !== undefined) {
                terminals[pid] = libProject;
            }
        });
    }
    return terminal;
}

/*
will return the path of the report, since there are diffrent folders to look into and the file names can be different 
we need to get the paths to look for dynamically
*/
function getReportFile(path: any, dir: string, filename: string): any {
    return Path.join(path, "target", dir, filename);
}

/*
Function will check if the report is available within the given path and returns a boolean based on it and also 
the report will be displayed if it is available
*/
function checkReportAndDisplay(report: any, reportType: string, reportTypeLabel: string, libProject: LibertyProject, showErrorMessage: boolean): Promise<boolean> {
    return new Promise((resolve) => {
        fs.exists(report, (exists) => {
            if (exists) {
                const panel = vscode.window.createWebviewPanel(
                    reportType, // Identifies the type of the webview. Used internally
                    libProject.getLabel() + " " + reportTypeLabel + " report", // Title of the panel displayed to the user
                    vscode.ViewColumn.Two, // Open the panel in the second window
                    {}, // Webview options
                );
                panel.webview.html = getReport(report); // display HTML content
                /*
                For Maven projects we need to check for the test report in the 'reports' and 'site' dirs. 
                We only need to show the message if it is not available in both locations. 
                The `showErrorMessage` flag will only be set to true when checking the second location.
                */
            } else if (showErrorMessage) {
                const message = localize("test.report.does.not.exist.run.test.first", report);
                vscode.window.showInformationMessage(message);
            }
            resolve(exists);
        });
    });
}

/*
Method adds a project which is selected by the user from the list to the liberty dashboard 
*/
export async function addProjectsToTheDashBoard(projectProvider: ProjectTreeProvider, selection: string): Promise<void> {
    const registry = ProjectRegistry.getInstance();
    const result = await registry.addUserSelectedPath(selection);
    const message = localize(`add.project.manually.message.${result}`, selection);
    (result !== 0) ? console.error(message) : console.info(message);
    vscode.window.showInformationMessage(message);
    // refresh() re-runs full discovery (including hierarchy) and shows the status bar indicator
    await projectProvider.refresh();
    return Promise.resolve();
}
