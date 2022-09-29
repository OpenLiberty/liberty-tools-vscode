/**
 * Copyright (c) 2020, 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import * as fs from "fs";
import * as Path from "path";
import * as vscode from "vscode";
import { localize } from "../util/i18nUtil";
import { QuickPickItem } from "vscode";
import { LibertyProject, ProjectProvider } from "./libertyProject";
import { getReport, filterProjects } from "../util/helperUtil";
import { LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER } from "../definitions/constants";
import { getGradleTestReport } from "../util/gradleUtil";
import { pathExists } from "fs-extra";

export const terminals: { [libProjectId: number]: LibertyProject } = {};
let _customParameters = "";

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
            if ( reportType ) {
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

// start dev mode
export async function startDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("starting.liberty.dev.on",libProject.getLabel()));
        let terminal = libProject.getTerminal();
        if (terminal === undefined) {
            terminal = libProject.createTerminal();
            if (terminal !== undefined) {
                terminals[Number(terminal.processId)] = libProject;
            }
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                const mvnCmdStart = await mvnCmd(libProject.getPath());
                const cmd = `${mvnCmdStart} io.openliberty.tools:liberty-maven-plugin:dev -f "${libProject.getPath()}"`;
                terminal.sendText(cmd); // start dev mode on current project
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                const gradleCmdStart = await gradleCmd(libProject.getPath());
                const cmd = `${gradleCmdStart} libertyDev -b="${libProject.getPath()}"`;
                terminal.sendText(cmd); // start dev mode on current project
            }
        }
    } else  if ( ProjectProvider.getInstance() ) {
        showProjects("liberty.dev.start", startDevMode);
    } else {
        const message = localize("cannot.start.liberty.dev");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}


export async function removeProject(uri: vscode.Uri): Promise<void> {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    if (undefined !== uri && undefined !== uri.fsPath ) {
        // Right mouse clicked on a root folder, or on empty space with only one folder in workspace.
        // Add project if:
        // 1. Project has build files (pom.xml or build.gradle)
        // 2. Not in liberty dashboard
        // Once added, presist the data in workspace storage.\
        // check if the path is in current list
        const file = projectProvider.isPathExistsInPersistedProjects(uri.fsPath);
        if (undefined !== file) {
            const yes = localize("confirmation.button.label.yes");
            const no = localize("confirmation.button.label.no");
            vscode.window
                .showInformationMessage(localize("remove.custom.project.confirmation", uri.fsPath), yes, no)
                .then(answer => {
                    if (answer === yes) {
                    // delete and save
                        projectProvider.removeInPersistedProjects(file);
                        vscode.window
                            .showInformationMessage(localize("remove.custom.project.successful"));
                            projectProvider.fireChangeEvent();
                    }
                });
        } else {
            const message = localize("remove.custom.project.not.in.list");
            console.error(message);
            vscode.window.showInformationMessage(message);
        }
    } else {
        // clicked on the empty space and workspace has more than one folders, or
        // from command palette
        // Display the list of current cusomer added project for user to select.
        const items: LibertyProjectQuickPickItem[] = [];
        projectProvider.getUserAddedProjects().forEach(function (item) {
            const qpItem = new LibertyProjectQuickPickItem(item.label,
                item.path);
            items.push(qpItem);
        });
        if ( items.length === 0 ) {
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
}

export async function addProject(uri: vscode.Uri): Promise<void> {
    const projectProvider: ProjectProvider = ProjectProvider.getInstance();
    if (undefined !== uri && undefined !== uri.fsPath ) {
        // Right mouse clicked on a root folder, or on empty space with only one folder in workspace.
        // Add project if:
        // 1. Not in liberty dashboard
        // 2. Project has build files (pom.xml or build.gradle)
        // 
        // Once added, presist the data in workspace storage.
        const result: number = await projectProvider.addUserSelectedPath(uri.fsPath, projectProvider.getProjects());
        const message = localize(`add.project.manually.message.${result}`);
        (result!==0)? console.error(message):console.info(message);projectProvider.fireChangeEvent();
        vscode.window.showInformationMessage(message);
        
    } else {
        // clicked on the empty space and workspace has more than one folders, or
        // from command palette
        // Display the list of workspace folders for user to select.
        // The list should not contain any existing projects
        const uris: string[] = [];
        const wsFolders = vscode.workspace.workspaceFolders;
		if ( wsFolders ) {
			for ( const folder of wsFolders ) {
				const path = folder.uri.fsPath;
				if ( projectProvider.projectRootPathExists(path, projectProvider.getProjects().keys() ) === false ) {
					uris.push(folder.uri.fsPath);
				}
			}
		}
        if ( uris.length === 0 ) {
            // show error
            const message = localize("add.project.manually.no.projects.available.to.add");
            console.error(message);
            vscode.window.showInformationMessage(message);
        } else {
            // present the list
            vscode.window.showQuickPick(uris).then(async selection => {
                if (!selection) {
                    return;
                }
                const result = await projectProvider.addUserSelectedPath (selection, projectProvider.getProjects());
                const message = localize(`add.project.manually.message.${result}`);
                (result!==0)? console.error(message):console.info(message);projectProvider.fireChangeEvent();
                vscode.window.showInformationMessage(message);
            });
        }
    } 
}
// stop dev mode
export async function stopDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("stopping.liverty.dev.on",libProject.getLabel()));
        const terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText("exit"); // stop dev mode on current project
        } else {
            const message = localize("liberty.dev.not.started.on",libProject.getLabel());
            vscode.window.showWarningMessage(message);
        }
    } else if ( ProjectProvider.getInstance() ) {
        showProjects("liberty.dev.stop", stopDevMode);
        
    } else {
        const message = localize("cannot.stop.liberty.dev.on.undefined");
        console.error(message);
        vscode.window.showInformationMessage(message);
    }
}

// custom start dev mode command
export async function customDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log(localize("starting.liberty.dev.with.custom.param",libProject.getLabel()));
        let terminal = libProject.getTerminal();
        if (terminal === undefined) {
            terminal = libProject.createTerminal();
            if (terminal !== undefined) {
                terminals[Number(terminal.processId)] = libProject;
            }
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);

            let placeHolderStr = "";
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                placeHolderStr = "e.g. -DhotTests=true";
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                placeHolderStr = "e.g. --hotTests";
            }

            // prompt for custom command
            const customCommand: string | undefined = await vscode.window.showInputBox(Object.assign({
                validateInput: (value: string) => {
                    if (value && !value.startsWith("-")) {
                        return localize("params.must.start.with.dash");
                    }
                    return null;
                },
            },
                {
                    placeHolder: placeHolderStr,
                    prompt: localize("specify.custom.parms"),
                    ignoreFocusOut: true,
                    value: _customParameters
                },
            ));
            if (customCommand !== undefined) {
                _customParameters = customCommand;
                if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                    const mvnCmdStart = await mvnCmd(libProject.getPath());
                    const cmd = `${mvnCmdStart} io.openliberty.tools:liberty-maven-plugin:dev ${customCommand} -f "${libProject.getPath()}"`;
                    terminal.sendText(cmd);
                } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                    const gradleCmdStart = await gradleCmd(libProject.getPath());
                    const cmd = `${gradleCmdStart} libertyDev ${customCommand} -b="${libProject.getPath()}"`;
                    terminal.sendText(cmd);
                }
            }
        }
    } else if ( ProjectProvider.getInstance() ) {
        showProjects("liberty.dev.custom", customDevMode);
        
    }  else {
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
            terminal = libProject.createTerminal();
            if (terminal !== undefined) {
                terminals[Number(terminal.processId)] = libProject;
            }
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                const mvnCmdStart = await mvnCmd(libProject.getPath());
                const cmd = `${mvnCmdStart} io.openliberty.tools:liberty-maven-plugin:devc -f "${libProject.getPath()}"`;
                terminal.sendText(cmd);
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                const gradleCmdStart = await gradleCmd(libProject.getPath());
                const cmd = `${gradleCmdStart} libertyDevc -b="${libProject.getPath()}"`;
                terminal.sendText(cmd);
            }
        }
    } else if ( ProjectProvider.getInstance() ) {
        showProjects("liberty.dev.start.container", startContainerDevMode);
        
    }  else {
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
            vscode.window.showWarningMessage(localize("liberty.dev.has.not.been.started.on",libProject.getLabel()));
        }
    } else if ( ProjectProvider.getInstance() ) {
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
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(libProject.getPath()));
        if (workspaceFolder !== undefined) {
            let report: any;
            if (libProject.getContextValue() === LIBERTY_MAVEN_PROJECT || libProject.getContextValue() === LIBERTY_MAVEN_PROJECT_CONTAINER) {
                report = Path.join(workspaceFolder.uri.fsPath, "target", "site", reportType + "-report.html");
            } else if (libProject.getContextValue() === LIBERTY_GRADLE_PROJECT || libProject.getContextValue() === LIBERTY_GRADLE_PROJECT_CONTAINER) {
                report = await getGradleTestReport(libProject.path, workspaceFolder);
            }
            let reportTypeLabel = reportType;
            if (reportType === "gradle") {
                reportTypeLabel = "test";
            }
            fs.exists(report, (exists) => {
                if (exists) {
                    const panel = vscode.window.createWebviewPanel(
                        reportType, // Identifies the type of the webview. Used internally
                        libProject.getLabel() + " " + reportTypeLabel + " report", // Title of the panel displayed to the user
                        vscode.ViewColumn.Two, // Open the panel in the second window
                        {}, // Webview options
                    );
                    panel.webview.html = getReport(report); // display HTML content
                } else {
                    const message = localize("test.report.does.not.exist.run.test.first", report);
                    vscode.window.showInformationMessage(message);
                }
            });
        }
    } else if ( ProjectProvider.getInstance() && reportType ) {
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
        console.error(localize("unable.to.delete.terminal",terminal.name));
    }
}


// return Maven executable path, Maven wrapper, or mvn
export async function mvnCmd(pomPath: string): Promise<string> {

    // attempt to use the Maven executable path, if empty try using mvn or mvnw according to the preferMavenWrapper setting
    const mavenExecutablePath: string | undefined = vscode.workspace.getConfiguration("maven").get<string>("executable.path");
    if (mavenExecutablePath) {
        return mavenExecutablePath;
    }
    const preferMavenWrapper: boolean | undefined = vscode.workspace.getConfiguration("maven").get<boolean>("executable.preferMavenWrapper");
    if (preferMavenWrapper) {
        const localMvnwPath: string | undefined = await getLocalMavenWrapper(Path.dirname(pomPath));
        if (localMvnwPath) {
            return localMvnwPath;
        }
    }
    return "mvn";
}

export async function gradleCmd(buildGradle: string): Promise<string> {
    const preferGradleWrapper: boolean | undefined = vscode.workspace.getConfiguration("java").get<boolean>("import.gradle.wrapper.enabled");
    if (preferGradleWrapper) {
        const localGradlewPath: string | undefined = await getLocalGradleWrapper(Path.dirname(buildGradle));
        if (localGradlewPath) {
            return localGradlewPath;
        }
    }
    return "gradle";
}

/**
 * Search for potential Maven wrapper, return undefined if does not exist
 *
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 * @param projectFolder
 */
async function getLocalMavenWrapper(projectFolder: string): Promise<string | undefined> {
    const mvnw: string = isWin() ? "mvnw.cmd" : "mvnw";

    // walk up parent folders
    let current: string = projectFolder;
    while (Path.basename(current)) {
        const potentialMvnwPath: string = Path.join(current, mvnw);
        if (await pathExists(potentialMvnwPath)) {
            return potentialMvnwPath;
        }
        current = Path.dirname(current);
    }
    return undefined;
}

/**
 * Search for potential Gradle wrapper, return undefined if it does not exist
 * Modified from vscode-maven, see getLocalMavenWrapper method above
 * @param projectFolder
 */
async function getLocalGradleWrapper(projectFolder: string): Promise<string | undefined> {
    const gradlew: string = isWin() ? "gradlew.bat" : "gradlew";

    // walk up parent folders
    let current: string = projectFolder;
    while (Path.basename(current)) {
        const potentialGradlewPath: string = Path.join(current, gradlew);
        if (await pathExists(potentialGradlewPath)) {
            return potentialGradlewPath;
        }
        current = Path.dirname(current);
    }
    return undefined;
}

/**
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 */
function isWin(): boolean {
    return process.platform.startsWith("win");
}