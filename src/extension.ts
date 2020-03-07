import * as vscode from "vscode";
import * as devCommands from "./utils/devCommands";

import { LibertyProject, ProjectProvider } from "./utils/libertyProject";

export const projectProvider = new ProjectProvider();
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	console.log('"vscode-liberty-dev" extension is now active!');

	if (vscode.workspace.workspaceFolders !== undefined) {
		registerFileWatcher(projectProvider);
		vscode.window.registerTreeDataProvider("liberty-dev", projectProvider);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.explorer.refresh", (async () => {
			projectProvider.refresh();
		}))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.open.project", (pomPath) => devCommands.openProject(pomPath)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.start", (libProject?: LibertyProject) => devCommands.startDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.stop", (libProject?: LibertyProject) => devCommands.stopDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.custom", (libProject?: LibertyProject) => devCommands.customDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.run.tests", (libProject?: LibertyProject) => devCommands.runTests(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.failsafe.report", (libProject?: LibertyProject) => devCommands.openReport("failsafe", libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.surefire.report", (libProject?: LibertyProject) => devCommands.openReport("surefire", libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.gradle.test.report", (libProject?: LibertyProject) => devCommands.openReport("gradle", libProject)),
	);
	context.subscriptions.push(
		vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
			devCommands.deleteTerminal(closedTerminal);
		})
	);
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {
}

/**
 * File Watcher to prompt the dev explorer to refresh on file changes
 * @param projectProvider Liberty Dev projects
 */
export function registerFileWatcher(projectProvider: ProjectProvider): void {
	const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("{**/pom.xml,**/build.gradle,**/settings.gradle}");
	watcher.onDidCreate(async () => {
		projectProvider.refresh();
	});
	watcher.onDidChange(async () => {
		projectProvider.refresh();
	});
	watcher.onDidDelete(async () => {
		projectProvider.refresh();
	});
}
