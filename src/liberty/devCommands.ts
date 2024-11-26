/**
 * Copyright (c) 2020, 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import * as fs from "fs";
import * as fse from "fs-extra";
import * as Path from "path";
import * as vscode from "vscode";
import * as helperUtil from "../util/helperUtil";
import { localize } from "../util/i18nUtil";
import { QuickPickItem } from "vscode";
import { LibertyProject, ProjectProvider } from "./libertyProject";
import { getReport, filterProjects } from "../util/helperUtil";
import { COMMAND_TITLES, LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER, LIBERTY_SERVER_ENV_PORT_REGEX } from "../definitions/constants";
import { getGradleTestReport } from "../util/gradleUtil";
import { DashboardData } from "./dashboard";
import { ProjectStartCmdParam } from "./projectStartCmdParam";
import { getCommandForMaven, getCommandForGradle, defaultWindowsShell } from "../util/commandUtils";

export const terminals: { [libProjectId: number]: LibertyProject } = {};

class LibertyProjectQuickPickItem implements QuickPickItem {

    project: LibertyProject | undefined;
    label: string;
    detail: string;

    constructor(itemLabel: string, itemDetail: string, itemProject?: LibertyProject) {
        this.label = itemLabel;
        this.detail = itemDetail;
        this.project = itemProject;
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
function showProjects(command: string, callback: Function, reportType?: string): void {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    // Find a list of projects that can be started
    const projects: LibertyProject[] = filterProjects(Array.from(projectProvider.getProjects().values()),
        command);
    if (projects.length === 0) {
        const message = localize("no.liberty.projects.found");
        console.error(message);
        vscode.window.showInformationMessage(message);
    } else {
        const items: LibertyProjectQuickPickItem[] = [];
        for (let index = 0; index < projects.length; index++) {
            const item = projects[index];
            const qpItem = new LibertyProjectQuickPickItem(item.label,
                item.path, item);
            items.push(qpItem);
        }
        vscode.window.showQuickPick(items).then(selection => {
            if (!selection) {
                return;
            }
            if (reportType) {
                callback(reportType, selection.project);
            }
            else {
                callback(selection.project);
            }
        });
    }
}
// opens pom associated with LibertyProject and starts dev mode
export async function openProject(pomPath: string): Promise<void> {
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pomPath));
}

// List all liberty dev commands, triggerred by hotkey only (Shift+Cmd+L)
export async function listAllCommands(): Promise<void> {
    const libertyCommands = Array.from(COMMAND_TITLES.keys());
    vscode.window.showQuickPick(libertyCommands).then(selection => {
            if (!selection) {
                return;
            }
            const command = COMMAND_TITLES.get(selection);
            if ( command !== undefined )
            {
                vscode.commands.executeCommand(command);
            } else {
                // should never happen
                console.error("Unable to find corresponding command for " + selection);
            }
                
    });
}


// start dev mode
export async function startDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("starting.liberty.dev.on", libProject.getLabel()));
        let terminal = libProject.getTerminal();
        if (terminal === undefined) {
            //function call to create new terminal for LTV
            terminal = createTerminalforLiberty(libProject, terminal);
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                const cmd = await getCommandForMaven(libProject.getPath(), "io.openliberty.tools:liberty-maven-plugin:dev", libProject.getTerminalType());
                terminal.sendText(cmd); // start dev mode on current project
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                const cmd = await getCommandForGradle(libProject.getPath(), "libertyDev", libProject.getTerminalType());
                terminal.sendText(cmd); // start dev mode on current project
            }
        }
    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.start", startDevMode);
    } else {
        const message = localize("cannot.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}


export async function removeProject(): Promise<void> {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    
    // clicked on the empty space and workspace has more than one folders, or
    // from command palette
    // Display the list of current user added projects for user to select.
    const items: LibertyProjectQuickPickItem[] = [];
    projectProvider.getUserAddedProjects().forEach(function (item) {
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
                        projectProvider.removeInPersistedProjects(selection.detail);
                        vscode.window
                            .showInformationMessage(localize("remove.custom.project.successful"));
                        projectProvider.fireChangeEvent();
                    }
                });
        });
        
    }
}

function showListOfPathsToAdd(uris: string[]) {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    vscode.window.showQuickPick(uris).then(async selection => {
        if (!selection) {
            return;
        }
        if (projectProvider.isMultiProjectUntitledWorkspace()) {
            /**
             * Saving the selected project to globalstate for adding it to the dashboard after 
             * reinitialization of the extension when workspace is saved
             */
            await projectProvider.getContext().globalState.update('selectedProject', selection);
            /*
            if the workspace is untitled suggest the user to save the workspace first 
            */
            await projectProvider.checkUntitledWorkspaceAndSaveIt();
        }
        await addProjectsToTheDashBoard(projectProvider, selection);
    });
}

export async function addProject(uri: vscode.Uri): Promise<void> {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    if (undefined !== uri && undefined !== uri.fsPath) {
        // Right mouse clicked on a root folder, or on empty space with only one folder in workspace.
        // Add project if:
        // 1. Not in liberty dashboard
        // 2. Project has build files (pom.xml or build.gradle)
        // 
        // Once added, presist the data in workspace storage.
        console.error("projects " + JSON.stringify(projectProvider.getProjects()));
        // scan the folder and get a list of folders with pom.xml and build.gradle
        const uris: string[] = await projectProvider.getListOfMavenAndGradleFolders(uri.fsPath);
        console.log(JSON.stringify(uris));
        if ( uris.length > 0) {
            // present the list to add
            showListOfPathsToAdd(uris);
        }
        

    } else {
        // clicked on the empty space and workspace has more than one folders, or
        // from command palette
        // Display the list of workspace folders for user to select.
        // The list should not contain any existing projects
        let uris: string[] = [];
        const wsFolders = vscode.workspace.workspaceFolders;
        if (wsFolders) {
            for (const folder of wsFolders) {
                const path = folder.uri.fsPath;
                uris = uris.concat(await projectProvider.getListOfMavenAndGradleFolders(path));
            }
        }
        if (uris.length === 0) {
            // show error
            const message = localize("add.project.manually.no.projects.available.to.add");
            console.error(message);
            vscode.window.showInformationMessage(message);
        } else {
            // present the list
            showListOfPathsToAdd(uris);
        }
    }
}
// stop dev mode
export async function stopDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("stopping.liverty.dev.on", libProject.getLabel()));
        const terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText("exit"); // stop dev mode on current project
        } else {
            const message = localize("liberty.dev.not.started.on", libProject.getLabel());
            vscode.window.showWarningMessage(message);
        }
    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.stop", stopDevMode);

    } else {
        const message = localize("cannot.stop.liberty.dev.on.undefined");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// stop dev mode
export async function attachDebugger(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        const EXCLUDED_DIR_PATTERN = "**/{bin,classes}/**";
        let pathPrefix = "";
        if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
            pathPrefix = "target";

        } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
            pathPrefix = "build";
        }
        let paths: string[] = [];
        if (pathPrefix !== "") {
            const serverEnvPattern = new vscode.RelativePattern(Path.dirname(libProject.getPath()), pathPrefix + "/**/server.env");
            paths = (await vscode.workspace.findFiles(serverEnvPattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
        }
        if (paths.length === 1) {
            console.log(localize("attach.debugger.liverty.dev.in", libProject.getLabel()));
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
                const path = Path.dirname(libProject.getPath());
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(libProject.getPath()));
                vscode.debug.startDebugging(workspaceFolder, {
                    "type": "java",
                    "name": localize("liberty.dev.debug.label", Path.dirname(libProject.getPath())),
                    "request": "attach",
                    "hostName": "localhost",
                    "port": port,
                    "cwd": path
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


    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.debug", attachDebugger);

    } else {
        const message = localize("cannot.attach.debugger.to.undefined");
        console.error(message);
        vscode.window.showErrorMessage(message);
    }
}



// custom start dev mode command with history list
export async function customDevModeWithHistory(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        // check if we have history for the select project.
        const projectProvider: ProjectProvider = ProjectProvider.getInstance();
        const dashboardData: DashboardData = helperUtil.getStorageData(projectProvider.getContext());
        const history = dashboardData.lastUsedStartParams.filter(element => element.path === libProject.getPath());
        if (history.length === 0) {
            //no history, show input.
            await customDevMode(libProject);
        } else {
            // show history
            // first item is the default custom command with no params
            const items: LibertyProjectQuickPickItem[] = [];
            const qpItem = new LibertyProjectQuickPickItem(" ",
                history[0].path, libProject);
            items.push(qpItem);

            for (let index = 0; index < history.length; index++) {
                const item = history[index];
                const qpItem = new LibertyProjectQuickPickItem(item.param,
                    item.path, libProject);
                items.push(qpItem);
            }
            vscode.window.showQuickPick(items).then(selection => {
                if (!selection) {
                    return;
                }
                customDevMode(selection.project, selection.label);
            });
        }

    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.custom", customDevModeWithHistory);

    } else {
        const message = localize("cannot.custom.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// custom start dev mode command
export async function customDevMode(libProject?: LibertyProject | undefined, params?: string | undefined): Promise<void> {
    const _customParameters = (params === undefined) ? "" : params.trim();
    if (libProject !== undefined) {
        let terminal = libProject.getTerminal();
        if (terminal === undefined) {
            //function call to create new terminal for LTV
            terminal = createTerminalforLiberty(libProject, terminal);
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);

            let placeHolderStr = "";
            let promptString = localize("specify.custom.parms.maven");
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                placeHolderStr = "e.g. -DhotTests=true";
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                placeHolderStr = "e.g. --hotTests";
                promptString = localize("specify.custom.parms.gradle");
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
                // save command
                customCommand = customCommand.trim();
                if ( customCommand.length > 0 ) {
                    const projectStartCmdParam: ProjectStartCmdParam = new ProjectStartCmdParam(libProject.getPath(), customCommand);
                    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
                    const dashboardData: DashboardData = helperUtil.getStorageData(projectProvider.getContext());
                    dashboardData.addStartCmdParams(projectStartCmdParam);
                    await helperUtil.saveStorageData(projectProvider.getContext(), dashboardData);
                }

                if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                    const cmd = await getCommandForMaven(libProject.getPath(), "io.openliberty.tools:liberty-maven-plugin:dev", libProject.getTerminalType(), customCommand);
                    terminal.sendText(cmd);
                } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                    const cmd = await getCommandForGradle(libProject.getPath(), "libertyDev", libProject.getTerminalType(), customCommand);
                    terminal.sendText(cmd);
                }
            }
        }
    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.custom", customDevModeWithHistory);

    } else {
        const message = localize("cannot.custom.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// start dev mode in a container
export async function startContainerDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        let terminal = libProject.getTerminal();
        if (terminal === undefined) {
            //function call to create new terminal for LTV
            terminal = createTerminalforLiberty(libProject, terminal);
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                const cmd = await getCommandForMaven(libProject.getPath(), "io.openliberty.tools:liberty-maven-plugin:devc", libProject.getTerminalType());
                terminal.sendText(cmd);
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                const cmd = await getCommandForGradle(libProject.getPath(), "libertyDevc", libProject.getTerminalType());
                terminal.sendText(cmd);
            }
        }
    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.start.container", startContainerDevMode);

    } else {
        const message = localize("cannot.start.liberty.dev.in.container.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// run tests on dev mode
export async function runTests(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("running.liberty.dev.tests.on", libProject.getLabel()));
        const terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText(" "); // sends Enter to run tests in terminal
        } else {
            vscode.window.showWarningMessage(localize("liberty.dev.has.not.been.started.on", libProject.getLabel()));
        }
    } else if (ProjectProvider.getInstance()) {
        showProjects("liberty.dev.run.tests", runTests);

    } else {
        const message = localize("cannot.run.test.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// open surefire, failsafe, or gradle test report
export async function openReport(reportType: string, libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        const path = Path.dirname(libProject.getPath());
        if (path !== undefined) {
            let report: any;
            let reportTypeLabel = reportType;
            if (reportType === "gradle") {
                reportTypeLabel = "test";
            }
            let showErrorMessage: boolean = true;
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                report = getReportFile(path, "reports", reportType + ".html");
                // show the error message only if both "reports" and "site" dirs do not contain the test reports
                // set to false since this will be the first location checked
                showErrorMessage = false; 
                if (!await checkReportAndDisplay(report, reportType, reportTypeLabel, libProject, showErrorMessage)) {
                    report = getReportFile(path, "site", reportType + "-report.html");
                    // show the error message only if both "reports" and "site" dirs do not contain the test reports
                    // set to true since this will be the second location checked
                    showErrorMessage = true; 
                    await checkReportAndDisplay(report, reportType, reportTypeLabel, libProject, showErrorMessage);
                }
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                report = await getGradleTestReport(libProject.path, path);
                await checkReportAndDisplay(report, reportType, reportTypeLabel, libProject, showErrorMessage);
            }
        }
    } else if (ProjectProvider.getInstance() && reportType) {
        showProjects(reportType, openReport, reportType);
    } else {
        const message = localize("cannot.open.test.reports.on.undefined.project");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// retrieve LibertyProject corresponding to closed terminal and delete terminal
export function deleteTerminal(terminal: vscode.Terminal): void {
    try {
        const libProject = terminals[Number(terminal.processId)];
        libProject.deleteTerminal();
    } catch {
        console.error(localize("unable.to.delete.terminal", terminal.name));
    }
}
/**
 * function to create new terminal of default type 
 */
function createTerminalforLiberty(libProject: LibertyProject, terminal: vscode.Terminal | undefined) {
    const path = Path.dirname(libProject.getPath());
    //fetch the default terminal details and store it in LibertyProject object 
    const terminalType = defaultWindowsShell();
    libProject.setTerminalType(terminalType);
    terminal = libProject.createTerminal(path);
    if (terminal !== undefined) {
        terminals[Number(terminal.processId)] = libProject;
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
export async function addProjectsToTheDashBoard(projectProvider: ProjectProvider, selection: string): Promise<void> {
    const result = await projectProvider.addUserSelectedPath(selection, projectProvider.getProjects());
    const message = localize(`add.project.manually.message.${result}`, selection);
    (result !== 0) ? console.error(message) : console.info(message); projectProvider.fireChangeEvent();
    vscode.window.showInformationMessage(message);
    return Promise.resolve();
}
