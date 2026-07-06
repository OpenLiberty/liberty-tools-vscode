/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2025
 */
import * as vscode from "vscode";
import * as devCommands from "./liberty/devCommands";
import * as lsp4jakartaLS from "./definitions/lsp4jakartaLSRequestNames";

import { LibertyProject } from "./liberty/libertyProject";
import { ProjectRegistry } from "./liberty/projectRegistry";
import { ProjectTreeProvider } from "./liberty/projectTreeProvider";
import { LanguageClientOptions } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import { workspace, commands, ExtensionContext, extensions, window, StatusBarAlignment, TextEditor } from "vscode";
import { localize } from "./util/i18nUtil";
import { RequirementsData, resolveRequirements, resolveLclsRequirements } from "./util/requirements";
import { prepareExecutable } from "./util/javaServerStarter";
import * as helperUtil from "./util/helperUtil";
import {
    CMD_EXPLORER_REFRESH, CMD_SHOW_COMMANDS, CMD_OPEN_BUILD_FILE,
    CMD_START, CMD_DEBUG, CMD_STOP, CMD_CUSTOM, CMD_START_CONTAINER,
    CMD_RUN_TESTS, CMD_OPEN_FAILSAFE_REPORT, CMD_OPEN_SUREFIRE_REPORT,
    CMD_OPEN_GRADLE_TEST_REPORT, CMD_ADD_PROJECT, CMD_REMOVE_PROJECT,
} from "./definitions/constants";
import path = require('path');
import * as fs from "fs";

const JAVA_EXTENSION_ID = "redhat.java";

const LIBERTY_CLIENT_ID = "LANGUAGE_ID_LIBERTY";
const JAKARTA_CLIENT_ID = "LANGUAGE_ID_JAKARTA";
export const LIBERTY_LS_JAR = "liberty-langserver-2.4.1-jar-with-dependencies.jar";
export const JAKARTA_LS_JAR = "org.eclipse.lsp4jakarta.ls-0.2.6-SNAPSHOT-jar-with-dependencies.jar";

let libertyClient: LanguageClient;
let jakartaClient: LanguageClient;

export type JavaExtensionAPI = any;

const SUPPORTED_LANGUAGE_IDS = ["java-properties", "properties", "plaintext"];
export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // Track 1: Register tree view, file watcher, and all dev commands immediately.
    // These have no dependency on the Java API or either language server — they only
    // need the VS Code workspace API and the filesystem, both available at activate() time.
    //
    // NOTE: handleWorkspaceSaveInProgress() is called here (inside registerCommands) rather
    // than after the Liberty LS starts. It only touches ProjectProvider and DashboardData —
    // no LS dependency — so this is safe. If that ever changes, move it back into the
    // Liberty LS .then() callback below.
    registerCommands(context);

    // Track 2: Language servers — boot in background but still awaited by activate() so
    // VS Code's extension host tracks the LS lifecycle correctly. The tree view above is
    // already registered and visible while this runs.
    //
    // IMPORTANT: activate() must return a promise that resolves only after languageClient.start()
    // completes. If we fire-and-forget here (drop the await / return), VS Code loses track of
    // the LS process lifecycle and surfaces "server connection failed" errors.
    const item = window.createStatusBarItem(StatusBarAlignment.Right, Number.MIN_VALUE);
    item.text = localize("liberty.ls");
    item.tooltip = localize("liberty.ls.starting");
    toggleItem(window.activeTextEditor, item);

    let api: JavaExtensionAPI;
    try {
        api = await getJavaExtensionAPI();
    } catch (error: any) {
        // language features (LCLS, Jakarta) unavailable.
        console.warn("Java extension unavailable, language servers will not start:", error.message);
        return;
    }

    // Waits for the java language server to launch in standard mode
    resolveLclsRequirements(api).then().catch((error => {
        window.showErrorMessage(error.message, error.label).then((selection) => {
            if (error.label && error.label === selection && error.openUrl) {
                commands.executeCommand('vscode.open', error.openUrl);
            }
        });
    }));

    let requirements: RequirementsData;
    try {
        requirements = await resolveRequirements(api);
    } catch (error: any) {
        window.showErrorMessage(error.message, error.label).then((selection) => {
            if (error.label && error.label === selection && error.openUrl) {
                commands.executeCommand('vscode.open', error.openUrl);
            }
        });
        return;
    }

    await Promise.all([
        startLangServer(context, requirements, true).then(() => {
            console.log("Liberty client ready");
            item.text = localize("liberty.ls.thumbs.up");
            item.tooltip = localize("liberty.ls.started");
            toggleItem(window.activeTextEditor, item);
        }, (error: any) => {
            console.log("Liberty client was not ready. Did not initialize");
            console.log(error);
            item.text = localize("liberty.ls.thumbs.down");
            item.tooltip = localize("liberty.ls.failedstart");
        }),

        startLangServer(context, requirements, false).then(() => {
            console.log("LSP4Jakarta is ready, binding requests...");
            bindRequest(lsp4jakartaLS.FILEINFO_REQUEST);
            bindRequest(lsp4jakartaLS.JAVA_COMPLETION_REQUEST);
            bindRequest(lsp4jakartaLS.JAVA_CODEACTION_REQUEST);
            bindRequest(lsp4jakartaLS.JAVA_CODEACTION_RESOLVE_REQUEST);
            bindRequest(lsp4jakartaLS.JAVA_DIAGNOSTICS_REQUEST);
            bindRequest(lsp4jakartaLS.JAVA_PROJECT_LABELS_REQUEST);
            item.text = localize("jakarta.ls.thumbs.up");
            item.tooltip = localize("jakarta.ls.started");
            toggleItem(window.activeTextEditor, item);
        }),
    ]);
}

function bindRequest(request: string) {
    jakartaClient.onRequest(request, async (params: any) => {
        // handled by jdt.DelegateCommandHandler
        return <any>await commands.executeCommand("java.execute.workspaceCommand", request, params);
    });
}

function registerCommands(context: ExtensionContext) {
    let projectProvider = getProjectProvider(context);

    if (vscode.workspace.workspaceFolders !== undefined) {
        registerFileWatcher(projectProvider);
        const treeView = vscode.window.createTreeView("liberty-dev", {
            treeDataProvider: projectProvider,
            showCollapseAll: false,
        });
        context.subscriptions.push(treeView);
        context.subscriptions.push(
            (vscode.window as any).registerFileDecorationProvider(projectProvider.decorationProvider)
        );
    }

    handleWorkspaceSaveInProgress(context);

    // Command table — [id, handler] pairs registered in one pass.
    const commandTable: [string, (...args: any[]) => any][] = [
        [CMD_EXPLORER_REFRESH, () => projectProvider.refresh()],
        ["extension.open.project", (pomPath: any) => devCommands.openProject(pomPath)],
        [CMD_OPEN_BUILD_FILE, (p?: LibertyProject) => devCommands.openBuildFile(p)],
        [CMD_SHOW_COMMANDS, () => devCommands.listAllCommands()],
        [CMD_START, (p?: LibertyProject) => devCommands.startDevMode(p)],
        [CMD_DEBUG, (p?: LibertyProject) => devCommands.attachDebugger(p)],
        [CMD_STOP, (p?: LibertyProject) => devCommands.stopDevMode(p)],
        [CMD_CUSTOM, (p?: LibertyProject) => devCommands.customDevModeWithHistory(p)],
        [CMD_START_CONTAINER, (p?: LibertyProject) => devCommands.startContainerDevMode(p)],
        [CMD_RUN_TESTS, (p?: LibertyProject) => devCommands.runTests(p)],
        [CMD_OPEN_FAILSAFE_REPORT, (p?: LibertyProject) => devCommands.openReport("failsafe", p)],
        [CMD_OPEN_SUREFIRE_REPORT, (p?: LibertyProject) => devCommands.openReport("surefire", p)],
        [CMD_OPEN_GRADLE_TEST_REPORT, (p?: LibertyProject) => devCommands.openReport("gradle", p)],
        [CMD_ADD_PROJECT, (uri: vscode.Uri) => devCommands.addProject(uri)],
        [CMD_REMOVE_PROJECT, () => devCommands.removeProject()],
    ];
    context.subscriptions.push(
        ...commandTable.map(([id, handler]) => vscode.commands.registerCommand(id, handler)),
        vscode.window.onDidCloseTerminal((t: vscode.Terminal) => devCommands.deleteTerminal(t)),
        vscode.workspace.onDidChangeWorkspaceFolders(() => projectProvider.refresh()),
    );
}

// vscode-languageclient requires implementation of the deactivate() method to return the stop promise from each language client
// this method is based on the deactivate() method from RedHat's Language support for Java for Visual Studio Code project (https://github.com/redhat-developer/vscode-java)
export function deactivate(): Promise<void[]> {
    let promiseReturn: Promise<void>[] = [];
    promiseReturn.push(libertyClient ? libertyClient.stop() : Promise.resolve());
    promiseReturn.push(jakartaClient ? jakartaClient.stop() : Promise.resolve());
    return Promise.all<void>(promiseReturn);
}

/**
 * File Watcher to prompt the dev explorer to refresh on file changes
 * @param projectProvider Liberty Dev projects
 */
export function registerFileWatcher(projectProvider: ProjectTreeProvider): void {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("{**/pom.xml,**/build.gradle,**/settings.gradle,**/src/main/liberty/config/server.xml}");
    // Async handler for the file system events (create, change, delete)
    const handleUri = async (uri: vscode.Uri) => {
        if (uri.fsPath.endsWith("server.xml")) {
            await projectProvider.refresh();
            return;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return; // No workspace folders to process
        }

        // Loop through all workspace folders
        for (let folder of workspaceFolders) {
            let projectRoot = folder.uri.fsPath;
            const relativePath = path.relative(projectRoot, uri.fsPath);

            // Ensure that the file belongs to this project (starts with the projectRoot path)
            if (!uri.fsPath.startsWith(projectRoot)) {
                continue; // Skip if the file is outside the current project folder
            }

            // Check if the path includes 'target' or 'build' directly under the project root
            if (/(target\/|build\/)/.test(relativePath)) {
                /**
                 * Determines the parent directory of the project root. 
                 * If a valid parent exists, use its path for searching. Otherwise, use the project root path itself.
                 */
                let projectRootParent = path.dirname(projectRoot);
                if (!(fs.existsSync(projectRootParent) && fs.statSync(projectRootParent).isDirectory())) {
                    projectRootParent = projectRoot;// If the parent directory of the project root doesn't exist, set projectRootParent to projectRoot.
                    console.debug("project root parent is not found");
                }
                const siblingFileExists = await helperUtil.checkSiblingFilesInTargetOrBuildParent(uri.fsPath, projectRootParent);
                if (!siblingFileExists) {
                    console.debug(`No sibling build file found, refreshing project... for  ` + uri.fsPath);
                    // Refresh the project if no sibling file is found
                    await projectProvider.refresh();
                    return;
                } else {
                    console.debug(`Skipping refresh: Sibling build file found for ` + uri.fsPath);
                    return; // Do not refresh
                }
            } else {
                // If the file being processed is **outside** the `target` or `build` directory, always refresh
                console.debug('Refreshing project...');
                await projectProvider.refresh();
                return;
            }
        }
    };


    watcher.onDidCreate(handleUri);
    watcher.onDidChange(handleUri);
    watcher.onDidDelete(handleUri);
}

function startLangServer(context: ExtensionContext, requirements: RequirementsData, isLiberty: boolean) {
    const lsJar = isLiberty ? LIBERTY_LS_JAR : JAKARTA_LS_JAR;
    const lsName = isLiberty ? "Liberty Language Server" : "Language Server for Jakarta EE";
    const clientId = isLiberty ? LIBERTY_CLIENT_ID : JAKARTA_CLIENT_ID;
    const localName = isLiberty ? localize("liberty.ls.output.dropdown") : localize("jakarta.ls.output.dropdown");

    // Options to control the language client
    const clientOptions: LanguageClientOptions = prepareClientOptions(isLiberty);
    const serverOptions = prepareExecutable(lsJar, requirements)

    console.log("Creating new language client for " + lsName);
    let languageClient = new LanguageClient(clientId, localName, serverOptions, clientOptions);
    isLiberty ? libertyClient = languageClient : jakartaClient = languageClient;
    return languageClient.start();
}

function prepareClientOptions(Liberty_LS: boolean) {
    if (Liberty_LS) {
        return {
            // Filter to `*.properties` and `*.env` files, let LCLS handle filtering for default/custom configs
            documentSelector: [{
                scheme: "file",
                pattern: "**/{*.properties,*.env}"
            }],
            synchronize: {
                configurationSection: SUPPORTED_LANGUAGE_IDS,
                fileEvents: [
                    workspace.createFileSystemWatcher("**/*.properties"),
                    workspace.createFileSystemWatcher("**/*.env"),
                    workspace.createFileSystemWatcher("**/liberty-plugin-config.xml")
                ],
            }
        };
    } else {
        return {
            documentSelector: [{ scheme: "file", language: "java" }],
            synchronize: {
                configurationSection: ["java", "[java]"],
                fileEvents: [
                    workspace.createFileSystemWatcher("**/*.java")
                ],
            }
        };
    }
}

function toggleItem(editor: TextEditor | undefined, item: vscode.StatusBarItem) {
    if (editor && editor.document && SUPPORTED_LANGUAGE_IDS.includes(editor.document.languageId)) {
        item.show();
    } else {
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

function handleWorkspaceSaveInProgress(context: vscode.ExtensionContext) {
    const projectProvider = getProjectProvider(context);
    const registry = ProjectRegistry.getInstance();
    if (registry.getContext().globalState.get('workspaceSaveInProgress') &&
        registry.getContext().globalState.get('selectedProject') !== undefined) {
        devCommands.addProjectsToTheDashBoard(projectProvider, registry.getContext().globalState.get('selectedProject') as string);
        helperUtil.clearDataSavedInGlobalState(registry.getContext());
    }
}

function getProjectProvider(context: vscode.ExtensionContext): ProjectTreeProvider {
    let projectProvider = ProjectTreeProvider.getInstance();
    if (!projectProvider) {
        const registry = new ProjectRegistry(context);
        ProjectRegistry.setInstance(registry);
        projectProvider = new ProjectTreeProvider(registry);
        ProjectTreeProvider.setInstance(projectProvider);
    }
    return projectProvider;
}