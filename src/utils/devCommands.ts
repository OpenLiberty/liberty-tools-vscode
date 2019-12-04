
import * as vscode from 'vscode';
import { LibertyProject } from './libertyProject';
import * as fs from 'fs';

import { getReport } from './Util';

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
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);
            terminal.sendText('mvn io.openliberty.tools:liberty-maven-plugin:dev -f "' + libProject.getPomPath() + '"'); // start dev mode on current project
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
        }
        if (terminal !== undefined) {
            terminal.show();
            libProject.setTerminal(terminal);

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
                    placeHolder: "e.g. -DhotTests=true",
                    prompt: "Specify custom parameters for the liberty:dev command.",
                    ignoreFocusOut: true
                }
            ));
            if (customCommand !== undefined) {
                terminal.sendText('mvn io.openliberty.tools:liberty-maven-plugin:dev ' + customCommand + ' -f "' + libProject.getPomPath() + '"');
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

// open surefire or failsafe test report
export async function openReport(reportType: string, libProject?: LibertyProject | undefined): Promise<void> {
    if (libProject !== undefined) {
        console.log("Opening test reports for " + libProject.getLabel());
        var workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(libProject.getPomPath()));
        if (workspaceFolder !== undefined) {
            var path = require('path');
            var report = path.join(workspaceFolder.uri.fsPath, 'target', 'site', reportType + '-report.html');
            fs.exists(report, function (exists) {
                if (exists) {
                    const panel = vscode.window.createWebviewPanel(
                        reportType, // Identifies the type of the webview. Used internally
                        libProject.getLabel() + ' ' + reportType + ' report', // Title of the panel displayed to the user
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