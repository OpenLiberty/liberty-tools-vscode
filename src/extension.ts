/**
 * Copyright (c) 2020, 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import * as vscode from "vscode";
import * as devCommands from "./liberty/devCommands";
import * as lsp4jakartaLS from './definitions/lsp4jakartaLSRequestNames';
import * as path from "path";

import { LibertyProject, ProjectProvider } from "./liberty/libertyProject";
import { LanguageClient, LanguageClientOptions, Executable, ServerOptions, DocumentSelector, HoverParams } from "vscode-languageclient";
import { workspace, commands, ExtensionContext, extensions, window, StatusBarAlignment, TextEditor, languages } from "vscode";
import { registerProviders } from "./providers/lsp4jakartaProfileProviders";

const LIBERTY_CLIENT_ID = "LANGUAGE_ID_LIBERTY";
const JAKARTA_CLIENT_ID = "LANGUAGE_ID_JAKARTA";

let libertyClient: LanguageClient;
let jakartaClient: LanguageClient;

const SUPPORTED_LANGUAGE_IDS = ["properties", "plaintext"];
export async function activate(context: vscode.ExtensionContext): Promise<void> {

    let item = window.createStatusBarItem(StatusBarAlignment.Right, Number.MIN_VALUE);
    // item.name = "Liberty Language Server";
    item.text = "Liberty LS";
    item.tooltip = "Language Server for Liberty is starting...";
    toggleItem(window.activeTextEditor, item);

    // startupLibertyLanguageServer(context).then(() => {
    //     console.log("Liberty client ready, registering commands");
        
    //     item.text = "Liberty LS $(thumbsup)";
    //     item.tooltip = "Language Server for Liberty started";
    //     toggleItem(window.activeTextEditor, item);

    //     registerCommands(context);
    // }, error => {
    //     console.log("Liberty client was not ready. Did not initialize");
    //     console.log(error);
        
    //     item.text = "Liberty LS $(thumbsdown)";
    //     item.tooltip = "Language Server for Liberty failed to start";
    // });

    // const documentSelector = getDocumentSelector();
    startupJakartaLangServer(context).then(() => {
        console.log("Jakarta client ready");

        // Delegate requests from Jakarta LS to the Jakarta JDT core
        bindRequest(lsp4jakartaLS.JAVA_CLASSPATH_REQUEST); // completion
        // bindRequest(lsp4jakartaLS.JAVA_CODEACTION_REQUEST);
        // bindRequest(lsp4jakartaLS.JAVA_DIAGNOSTICS_REQUEST);
        // bindRequest(lsp4jakartaLS.JAVA_HOVER_REQUEST);

        // item.text = "Liberty LS $(thumbsup)";
        // item.tooltip = "Language Server for Liberty started";
        // toggleItem(window.activeTextEditor, item);

        // registerProviders(language)
    }, error => {
        console.log("Jakarta languauge client was not ready. Did not initialize");
        console.log(error);
        
        item.text = "Jakarta LS $(thumbsdown)";
        item.tooltip = "Language Server for Jakarta failed to start";
    });
}

function bindRequest(request: string) {
    jakartaClient.onRequest(request, async (params: any) => {
        console.log("1");
        <any>await commands.executeCommand("java.execute.workspaceCommand", request, params);

        // console.log("2");
        // <any>await commands.executeCommand("java.execute.workspaceCommand", request, params).then((result) => {
        //     console.log("Hopefully this prints something: " + result);
        // }, onrejected => {
        //     console.log("Undefined");
        // })
    });
}

function registerCommands(context: ExtensionContext) {
    let projectProvider = ProjectProvider.getInstance();
	if ( !projectProvider ) {
		projectProvider = new ProjectProvider(context);
		ProjectProvider.setInstance(projectProvider);
	}

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
        vscode.commands.registerCommand("liberty.dev.custom", (libProject?: LibertyProject) => devCommands.customDevModeWithHistory(libProject)),
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
		vscode.commands.registerCommand("liberty.dev.add.project", (uri: vscode.Uri) => devCommands.addProject(uri)),
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("liberty.dev.remove.project", (uri: vscode.Uri) => devCommands.removeProject(uri)),
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
	const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("{**/pom.xml,**/build.gradle,**/settings.gradle,**/src/main/liberty/config/server.xml}");
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

function startupLibertyLanguageServer(context: ExtensionContext) {
    //Start up Liberty Language Server
    const languageServerPath = context.asAbsolutePath(path.join("jars","liberty-langserver-1.0-SNAPSHOT-jar-with-dependencies.jar"));
    // const debugArgs = "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=localhost:1074";
    // Language server options 
    const serverOptions: ServerOptions = {
        run: <Executable> { 
            command: "java",
            args: ["-jar", languageServerPath],
            options: {stdio:"pipe"}
        },
        debug: <Executable> {
            command: "java",
            // TODO: using the debug arguments seems to still run the language server and open the debug port,
            // but, the extension doesn't seem to work properly nor does it run the .onReady.then() commands
            // args: [debugArgs, "-jar", languageServerPath],
            args: ["-jar", languageServerPath],
            options: {stdio:"pipe"}
        }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: SUPPORTED_LANGUAGE_IDS,
        synchronize: {
            configurationSection: ["properties", "plaintext"],
            fileEvents: [
                workspace.createFileSystemWatcher("**/bootstrap.properties"),
                workspace.createFileSystemWatcher("**/server.env")
            ],
        }
    };

    console.log("Creating new language client for Liberty Language Server");
    libertyClient = new LanguageClient(LIBERTY_CLIENT_ID, "Language Support for Liberty", serverOptions, clientOptions);
    
    const disposable = libertyClient.start();
    context.subscriptions.push(disposable);

    return libertyClient.onReady();
}

function startupJakartaLangServer(context: ExtensionContext) {
    const jakartaLsPath = context.asAbsolutePath(path.join("jars","org.eclipse.lsp4jakarta.ls-0.0.1-SNAPSHOT-jar-with-dependencies.jar"));
    // const debugArgs = "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1054";
    // Language server options 
    const serverOptions2: ServerOptions = {
        run: <Executable> { 
            command: "java",
            args: ["-jar", jakartaLsPath],
            options: {stdio:"pipe"}
        },
        debug: <Executable> {
            command: "java",
            // TODO: using the debug arguments seems to still run the language server and open the debug port,
            // but, the extension doesn't seem to work properly nor does it run the .onReady.then() commands
            // args: [debugArgs, "-jar", jakartaLsPath],
            args: ["-jar", jakartaLsPath],
            options: {stdio:"pipe"}
        }
    }

    // Options to control the language client
    const clientOptions2: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'java' }],
        synchronize: {
            configurationSection: ["java", "[java]"],
            fileEvents: [
                workspace.createFileSystemWatcher("**/*.java")
            ],
        }
    };
    console.log("Creating new language client for Jakarta Language Server")
    jakartaClient = new LanguageClient(JAKARTA_CLIENT_ID, "Language Support for Jakarta", serverOptions2, clientOptions2);

    context.subscriptions.push(jakartaClient.start());
    return jakartaClient.onReady();
}

function toggleItem(editor: TextEditor | undefined, item: vscode.StatusBarItem) {
    if(editor && editor.document && SUPPORTED_LANGUAGE_IDS.includes(editor.document.languageId)){
        item.show();
    } else{
        item.hide();
    }
}