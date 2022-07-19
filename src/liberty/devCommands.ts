import * as fs from "fs";
import * as Path from "path";
import * as vscode from "vscode";
import axios from "axios";
import { LibertyProject } from "./libertyProject";
import { getReport } from "../util/helperUtil";
import { LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER } from "../definitions/constants";
import { getGradleTestReport } from "../util/gradleUtil";
import { pathExists } from "fs-extra";
 
export const terminals: { [libProjectId: number]: LibertyProject } = {};
let _customParameters = "";

// opens pom associated with LibertyProject and starts dev mode
export async function openProject(pomPath: string): Promise<void> {
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pomPath));
}

// start dev mode
export async function startDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Starting liberty dev on " + libProject.getLabel());
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
    } else {
        console.error("Cannot start liberty dev on an undefined project");
    }
}

// stop dev mode
export async function stopDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Stopping liberty dev on " + libProject.getLabel());
        const terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText("exit"); // stop dev mode on current project
        } else {
            vscode.window.showWarningMessage("liberty dev has not been started on " + libProject.getLabel());
        }
    } else {
        console.error("Cannot stop liberty dev on an undefined project");
    }
}

// custom start dev mode command
export async function customDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Starting liberty dev with custom parameters on " + libProject.getLabel());
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
                        return "Parameters must start with -";
                    }
                    return null;
                },
            },
                {
                    placeHolder: placeHolderStr,
                    prompt: "Specify custom parameters for the liberty dev command.",
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
    } else {
        console.error("Cannot custom start liberty dev on an undefined project");
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
    } else {
        console.error("Cannot start liberty dev in a container on an undefined project");
    }
}

export async function buildStarterProject( state?: any, libProject?: LibertyProject | undefined): Promise<void> {
    var apiURL = `https://start.openliberty.io/api/start?a=${state.a}&b=${state.b}&e=${state.e}&g=${state.g}&j=${state.j}&m=${state.m}`;
    let folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const downloadStarterProject = async function(downloadLocation: string): Promise<void> {
        axios({
        method: "get",
        url: apiURL,
        responseType: "stream"
        }).then( function (response){
            response.data.pipe(fs.createWriteStream(downloadLocation))
            .on("close", () => {
                var unzip = require("unzip-stream");
                fs.createReadStream(downloadLocation).pipe(unzip.Extract({ path: `${folderPath}/${state.a}`}));
                fs.unlink(downloadLocation, (err) => {
                  if (err) {
                    console.error(err)
                    return
                  }
                })
            })
        });
    }
    let zipPath = `${folderPath}/${state.a}.zip`;
    downloadStarterProject(zipPath);
}

// run tests on dev mode
export async function runTests(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Running liberty dev tests on " + libProject.getLabel());
        const terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText(" "); // sends Enter to run tests in terminal
        } else {
            vscode.window.showWarningMessage("liberty dev has not been started on " + libProject.getLabel());
        }
    } else {
        console.error("Cannot run tests on an undefined project");
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
                    vscode.window.showInformationMessage("Test report (" + report + ") does not exist.  Run tests to generate a test report.");
                }
            });
        }
    } else {
        console.error("Cannot open test reports on an undefined project");
    }
}

// retrieve LibertyProject corresponding to closed terminal and delete terminal
export function deleteTerminal(terminal: vscode.Terminal): void {
    try {
        const libProject = terminals[Number(terminal.processId)];
        libProject.deleteTerminal();
    } catch {
        console.error("Unable to delete terminal: " + terminal.name);
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