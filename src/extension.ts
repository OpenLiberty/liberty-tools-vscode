import * as vscode from "vscode";
import * as devCommands from "./utils/devCommands";
import * as util from "./utils/Util";

import { LibertyProject, ProjectProvider } from "./utils/libertyProject";

export async function activate(context: vscode.ExtensionContext) {
	console.log('"vscode-liberty-dev" extension is now active!');

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders !== undefined) {
		let allPomPaths: string[] = [];
		let allGradlePaths: string[] = [];
		for (const folder of workspaceFolders) {
			const pomPaths: string[] = await util.getAllPaths(folder, "**/pom.xml");
			const gradlePaths: string[] = await util.getAllPaths(folder, "**/build.gradle");
			allPomPaths = allPomPaths.concat(pomPaths);
			allGradlePaths = allGradlePaths.concat(gradlePaths);
		}

		if (vscode.workspace.workspaceFolders !== undefined) {
			const projectProvider = new ProjectProvider(vscode.workspace.workspaceFolders, allPomPaths, allGradlePaths);
			registerFileWatcher(projectProvider);
			vscode.window.registerTreeDataProvider("liberty-dev", projectProvider);
			vscode.workspace.onDidChangeTextDocument((e) => {
				allPomPaths.forEach((pom) => {
					if (pom === e.document.uri.fsPath) {
						projectProvider.refresh();
					}
				});
				allGradlePaths.forEach((gradlePath) => {
					if (gradlePath === e.document.uri.fsPath) {
						projectProvider.refresh();
					}
				});
			});
		}
	}
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.open.project", (pomPath) => devCommands.openProject(pomPath)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.start", async (libProject?: LibertyProject | undefined) => devCommands.startDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.stop", async (libProject?: LibertyProject | undefined) => devCommands.stopDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.custom", async (libProject?: LibertyProject | undefined) => devCommands.customDevMode(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.run.tests", async (libProject?: LibertyProject | undefined) => devCommands.runTests(libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.failsafe.report", async (libProject?: LibertyProject | undefined) => devCommands.openReport("failsafe", libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.surefire.report", async (libProject?: LibertyProject | undefined) => devCommands.openReport("surefire", libProject)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.open.gradle.test.report", async (libProject?: LibertyProject | undefined) => devCommands.openReport("gradle", libProject)),
	);
}

// this method is called when your extension is deactivated
// tslint:disable-next-line: no-empty
export function deactivate() {
}

/**
 * File Watcher to prompt the dev explorer to refresh on file changes
 * @param projectProvider Liberty Dev projects
 */
export function registerFileWatcher(projectProvider: ProjectProvider): void {
	const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("{**/pom.xml,**/build.gradle,**/settings.gradle}");
	watcher.onDidCreate(async (e: vscode.Uri) => {
		projectProvider.refresh();
	});
	watcher.onDidChange(async (e: vscode.Uri) => {
		projectProvider.refresh();
	});
	watcher.onDidDelete(async (e: vscode.Uri) => {
		projectProvider.refresh();
	});
}
