
import * as vscode from 'vscode';
import { LibertyProject } from './libertyProject';
import * as fs from 'fs';
import * as Path from 'path';

import { getReport } from './Util';

export const terminals: { [libProjectId: string]: LibertyProject } = {};

// opens pom associated with LibertyProject and starts dev mode
export async function openProject(pomPath: string): Promise<void> {
    console.log("Opening " + pomPath);
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(pomPath));
}

// start dev mode
export async function startDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Starting liberty:dev on " + libProject.getLabel());
        var terminal = libProject.getTerminal();
        if (terminal === undefined) {
            terminal = libProject.createTerminal();
            terminals[libProject.getLabel() + " (liberty:dev)"] = libProject;
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            if (libProject.getContextValue() == "libertyMavenProject") {
                terminal.sendText('mvn io.openliberty.tools:liberty-maven-plugin:dev -f "' + libProject.getPath() + '"'); // start dev mode on current project
            }
            else if (libProject.getContextValue() == "libertyGradleProject") {
                terminal.sendText('gradle libertyDev -b=' + libProject.getPath()); // start dev mode on current project
            }
        }
    } else {
        console.error("Cannot start liberty:dev on an undefined project");
    }
}

// stop dev mode
export async function stopDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Stopping liberty:dev on " + libProject.getLabel());
        var terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText("exit"); // stop dev mode on current project
        } else {
            vscode.window.showWarningMessage("liberty:dev has not been started on " + libProject.getLabel());
        }
    } else {
        console.error("Cannot stop liberty:dev on an undefined project");
    }
}

// custom start dev mode command
export async function customDevMode(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Starting liberty:dev with custom parameters on " + libProject.getLabel());
        var terminal = libProject.getTerminal();
        if (terminal === undefined) {
            terminal = libProject.createTerminal();
            terminals[libProject.getLabel() + " (liberty:dev)"] = libProject;
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);

            var placeHolderStr = "";
            if (libProject.getContextValue() == "libertyMavenProject") {
                placeHolderStr = "e.g. -DhotTests=true";
            } 
            else if (libProject.getContextValue() == "libertyGradleProject") {
                placeHolderStr = "e.g. --hotTests";
            }

            // prompt for custom command
            const customCommand: string | undefined = await vscode.window.showInputBox(Object.assign({
                validateInput: (value: string) => {
                    if (value && !value.startsWith('-')) {
                        return 'Parameters must start with -';
                    }
                    return null;
                }
            },
                {
                    placeHolder: placeHolderStr,
                    prompt: "Specify custom parameters for the liberty:dev command.",
                    ignoreFocusOut: true
                }
            ));
            if (customCommand !== undefined) {
                if (libProject.getContextValue() == "libertyMavenProject") {
                    terminal.sendText('mvn io.openliberty.tools:liberty-maven-plugin:dev ' + customCommand + ' -f "' + libProject.getPath() + '"');
                } 
                else if (libProject.getContextValue() == "libertyGradleProject") {
                    terminal.sendText('gradle libertyDev ' + customCommand + ' -b="' + libProject.getPath() + '"');
                }
            }
        }
    } else {
        console.error("Cannot custom start liberty:dev on an undefined project");
    }
}

// run tests on dev mode
export async function runTests(libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Running liberty:dev tests on " + libProject.getLabel());
        var terminal = libProject.getTerminal();
        if (terminal !== undefined) {
            terminal.show();
            terminal.sendText(" "); // sends Enter to run tests in terminal
        } else {
            vscode.window.showWarningMessage("liberty:dev has not been started on " + libProject.getLabel());
        }
    } else {
        console.error("Cannot run tests on an undefined project");
    }
}

// open surefire, failsafe, or gradle test report
export async function openReport(reportType: string, libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Opening test reports for " + libProject.getLabel());
        var workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(libProject.getPath()));
        if (workspaceFolder !== undefined) {
            var report: any
            if (libProject.getContextValue() == "libertyMavenProject") {
                report = Path.join(workspaceFolder.uri.fsPath, 'target', 'site', reportType + '-report.html');
            }
            else if (libProject.getContextValue() == "libertyGradleProject") {
                report = Path.join(workspaceFolder.uri.fsPath, 'build', 'reports', 'tests', 'test', 'index.html');
            }
            var reportTypeLabel = reportType;
            if (reportType == "gradle") {
                reportTypeLabel = "test";
            }
            fs.exists(report, function (exists) {
                if (exists) {
                    const panel = vscode.window.createWebviewPanel(
                        reportType, // Identifies the type of the webview. Used internally
                        libProject.getLabel() + ' ' + reportTypeLabel + ' report', // Title of the panel displayed to the user
                        vscode.ViewColumn.Two, // Open the panel in the second window
                        {} // Webview options
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

// retrieve LibertyProject correpsonding to closed terminal and delete terminal
export function deleteTerminal(terminal: vscode.Terminal): void {
    try {
        let libProject = terminals[terminal.name];
        libProject.deleteTerminal();
    } catch {
        console.error("Unable to delete terminal: " + terminal.name);
    }
}