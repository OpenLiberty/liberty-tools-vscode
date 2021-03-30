import * as vscode from "vscode";
import * as devCommands from "./liberty/devCommands";

import { LibertyProject, ProjectProvider } from "./liberty/libertyProject";
import { LanguageClient, LanguageClientOptions, Executable } from 'vscode-languageclient';

const LANGUAGE_CLIENT_ID = 'LANGUAGE_ID_LIBERTY';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	startupLanguageServer(context);
	
	const projectProvider = new ProjectProvider(context);

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
		vscode.commands.registerCommand("liberty.dev.start.container", (libProject?: LibertyProject) => devCommands.startContainerDevMode(libProject)),
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

function startupLanguageServer(context: vscode.ExtensionContext) {
	//Start up Liberty Language Server
	var path = require('path');
	var languageServerPath = context.asAbsolutePath(path.join('jars','liberty.ls-1.0-SNAPSHOT-jar-with-dependencies.jar'));

	// Language server options 
	let serverOptions: Executable = {
		command: 'java',
		args: [ '-jar', languageServerPath],
		options: {stdio:'pipe'}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		documentSelector: [{ language: 'plaintext' }],
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher('**/*.properties'),
				vscode.workspace.createFileSystemWatcher('**/*.env')
			],
		}
	};

	let languageClient = new LanguageClient(LANGUAGE_CLIENT_ID, 'Language Support for Liberty', serverOptions, clientOptions);
	let disposable = languageClient.start();
	context.subscriptions.push(disposable);
}
