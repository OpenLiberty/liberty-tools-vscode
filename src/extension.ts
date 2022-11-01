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
import * as lsp4jakartaLS from "./definitions/lsp4jakartaLSRequestNames";
import * as path from "path";

import { LibertyProject, ProjectProvider } from "./liberty/libertyProject";
import { LanguageClient, LanguageClientOptions, Executable, ServerOptions } from "vscode-languageclient";
import { workspace, commands, ExtensionContext, extensions, window, StatusBarAlignment, TextEditor } from "vscode";
import { JAVA_EXTENSION_ID, waitForStandardMode } from "./util/javaServerMode";
import { localize } from "./util/i18nUtil";
import { resolveRequirements } from "./util/requirements";
import { prepareExecutable } from "./util/javaServerStarter";

const LIBERTY_CLIENT_ID = "LANGUAGE_ID_LIBERTY";
const JAKARTA_CLIENT_ID = "LANGUAGE_ID_JAKARTA";
const LIBERTY_LS_JAR = "liberty-langserver-1.0-SNAPSHOT-jar-with-dependencies.jar";
const JAKARTA_LS_JAR = "org.eclipse.lsp4jakarta.ls-0.0.1-SNAPSHOT-jar-with-dependencies.jar";

let libertyClient: LanguageClient;
let jakartaClient: LanguageClient;

export type JavaExtensionAPI = any;

const SUPPORTED_LANGUAGE_IDS = ["properties", "plaintext"];
export async function activate(context: vscode.ExtensionContext): Promise<void> {

    /**
     * Waits for the java language server to launch in standard mode
     * Before activating Tools for MicroProfile.
     * If java ls was started in lightweight mode, It will prompt user to switch
     */
    const api: JavaExtensionAPI = await getJavaExtensionAPI();
    await waitForStandardMode(api);

    const item = window.createStatusBarItem(StatusBarAlignment.Right, Number.MIN_VALUE);
    // item.name = "Liberty Language Server";
    item.text = localize("liberty.ls");
    item.tooltip = localize("liberty.ls.starting");
    toggleItem(window.activeTextEditor, item);

    startupLibertyLanguageServer(context, api).then(() => {
        console.log("Liberty client ready, registering commands");

        item.text = localize("liberty.ls.thumbs.up");
        item.tooltip = localize("liberty.ls.started");
        toggleItem(window.activeTextEditor, item);

        registerCommands(context);
    }, (error: any) => {
        console.log("Liberty client was not ready. Did not initialize");
        console.log(error);

        item.text = localize("liberty.ls.thumbs.down");
        item.tooltip = localize("liberty.ls.failedstart");
    });

    // const documentSelector = getDocumentSelector();
    startupJakartaLangServer(context, api).then(() => {
        console.log("LSP4Jakarta is ready, binding requests...");

        // Delegate requests from Jakarta LS to the Jakarta JDT core
        bindRequest(lsp4jakartaLS.JAVA_CLASSPATH_REQUEST);
        bindRequest(lsp4jakartaLS.JAVA_CODEACTION_REQUEST);
        bindRequest(lsp4jakartaLS.JAVA_DIAGNOSTICS_REQUEST);

        item.text = localize("jakarta.ls.thumbs.up");
        item.tooltip = localize("jakarta.ls.started");
        toggleItem(window.activeTextEditor, item);
    });
}

function bindRequest(request: string) {
    jakartaClient.onRequest(request, async (params: any) => {
        // handled by jdt.DelegateCommandHandler
        return <any>await commands.executeCommand("java.execute.workspaceCommand", request, params);
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
        vscode.commands.registerCommand("liberty.dev.debug", (libProject?: LibertyProject) => devCommands.attachDebugger(libProject)),
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

function startupLibertyLanguageServer(context: ExtensionContext, api: JavaExtensionAPI) {
    return resolveRequirements(api).then(requirements => {
        //Start up Liberty Language Server

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

        const serverOptions = prepareExecutable(LIBERTY_LS_JAR, requirements)

        console.log("Creating new language client for Liberty Language Server");
        libertyClient = new LanguageClient(LIBERTY_CLIENT_ID, "Language Support for Liberty", serverOptions, clientOptions);
        
        const disposable = libertyClient.start();
        context.subscriptions.push(disposable);

        return libertyClient.onReady();
    })
}

function startupJakartaLangServer(context: ExtensionContext, api: JavaExtensionAPI) {
    return resolveRequirements(api).then(requirements => {    
        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "java" }],
            synchronize: {
                configurationSection: ["java", "[java]"],
                fileEvents: [
                    workspace.createFileSystemWatcher("**/*.java")
                ],
            }
        };
        const serverOptions = prepareExecutable(JAKARTA_LS_JAR, requirements);

        console.log("Creating new language client for Jakarta Language Server")
        jakartaClient = new LanguageClient(JAKARTA_CLIENT_ID, "Language Support for Jakarta", serverOptions, clientOptions);
    
        context.subscriptions.push(jakartaClient.start());
        return jakartaClient.onReady();
    })
}

function toggleItem(editor: TextEditor | undefined, item: vscode.StatusBarItem) {
    if(editor && editor.document && SUPPORTED_LANGUAGE_IDS.includes(editor.document.languageId)){
        item.show();
    } else{
        item.hide();
    }
}

async function getJavaExtensionAPI(): Promise<JavaExtensionAPI> {
    const vscodeJava = extensions.getExtension(JAVA_EXTENSION_ID);
    if (!vscodeJava) {
        throw new Error("VSCode java is not installed");
    }

    const api = await vscodeJava.activate();
    if (!api) {
        throw new Error("VSCode java api not found");
    }

    return Promise.resolve(api);
}