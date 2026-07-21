/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as vscodePath from "path";
import * as vscode from "vscode";
import * as gradleUtil from "../util/gradleUtil";
import * as util from "../util/helperUtil";
import { computeContextValue } from "../util/helperUtil";
import { isMaven, isGradle } from "../definitions/constants";

const MAVEN_ICON = "maven-tag.png";
const GRADLE_ICON = "gradle-tag-1.png";
const OL_LOGO_ICON = "ol_logo.png";

export enum DevModeState {
	Starting = "starting",
	Running  = "running",
	Stopping = "stopping",
}

/**
 * CWWKF0011I = server ready (starting → started)
 * CWWKE0036I = server stopped (stopping → cleared)
 */
export const LIBERTY_MSG_STARTED = "CWWKF0011I";
export const LIBERTY_MSG_STOPPED = "CWWKE0036I";

export class LibertyProject extends vscode.TreeItem {
	public parent?: LibertyProject;
	public children: LibertyProject[] = [];
	public isAggregator: boolean = false;
	public isLibertyEnabled: boolean = false;
	public artifactId: string = "";
	public parentArtifactId?: string;
	public baseContextValue: string;

	// disposable for the project shell execution listener. disposes on terminal close.
	private _monitorDisposable?: vscode.Disposable;

	constructor(
		private _context: vscode.ExtensionContext,
		public label: string,
		public collapsibleState: vscode.TreeItemCollapsibleState,
		// tslint:disable-next-line: no-shadowed-variable
		public readonly path: string,
		public state: DevModeState | undefined,
		// valid context values are defined in src/definitions/constants.ts
		public contextValue: string,
		public terminal?: vscode.Terminal,
		public readonly command?: vscode.Command,
		public terminalType?: string,
	) {
		super(label, collapsibleState);
		this.tooltip = this.path;
		this.children = [];
		this.baseContextValue = contextValue;
		this.contextValue = computeContextValue(contextValue, undefined);
	}

	private EXPLORER_ICON = this.setExplorerIcon();

	iconPath = {
		light: vscodePath.join(this._context.extensionPath, "images", this.EXPLORER_ICON),
		dark: vscodePath.join(this._context.extensionPath, "images", this.EXPLORER_ICON)
	};

	public getLabel(): string {
		return `${this.label}`;
	}

	public setLabel(label: string): void {
		this.label = label;
	}

	public getState(): DevModeState | undefined {
		return this.state;
	}

	public setState(state: DevModeState | undefined): void {
		this.state = state;
		this.contextValue = computeContextValue(this.baseContextValue, state);
	}

	public getPath(): string {
		return `${this.path}`;
	}

	public getContextValue(): string {
		return `${this.contextValue}`;
	}

	public setContextValue(contextValue: string): void {
		this.baseContextValue = contextValue;
		this.contextValue = computeContextValue(contextValue, this.state);
	}

	public getTerminal(): vscode.Terminal | undefined {
		return this.terminal;
	}

	public setTerminal(terminal: vscode.Terminal): void {
		this.terminal = terminal;
	}

	public getTerminalType(): string | undefined {
		return this.terminalType;
	}

	public setTerminalType(terminalType: string): void {
		this.terminalType = terminalType;
	}

	public createTerminal(projectHome: string): vscode.Terminal | undefined {
		if (this.terminal === undefined) {
			// configure terminal to use java.home if liberty.terminal.useJavaHome is true
			const useJavaHome: any = util.getConfiguration("terminal.useJavaHome");
			let env: { [envKey: string]: string } = {};
			if (useJavaHome) {
				const javaHome: string | undefined = vscode.workspace.getConfiguration("java").get<string>("home");
				if (javaHome) {
					env = { JAVA_HOME: javaHome };
				}
			}
			const terminal = vscode.window.createTerminal({ cwd: projectHome, name: this.label + " (liberty dev)", env: env } as vscode.TerminalOptions);
			return terminal;
		}
		return undefined;
	}

	public deleteTerminal(): void {
		delete this.terminal;
		this.cleanupShellListener();
		this.setState(undefined);
	}

	public enableShellListener(execution: vscode.TerminalShellExecution, onStateChange: (project: LibertyProject) => void): void {
		console.log(`[startMonitoring] called for ${this.label}, state=${this.state}`);
		this.cleanupShellListener();
		const stream = execution.read();
		let disposed = false;
		const disposable = { dispose: () => { disposed = true; } };
		this._monitorDisposable = disposable;
		(async () => {
			for await (const chunk of stream) {
				if (disposed) { break; }
				if (chunk.includes(LIBERTY_MSG_STARTED) && this.state === DevModeState.Starting) {
					this.setState(DevModeState.Running);
					onStateChange(this);
					vscode.window.showInformationMessage(`Liberty server started: ${this.label}`);
				} else if (chunk.includes(LIBERTY_MSG_STOPPED)) {
					this.setState(undefined);
					onStateChange(this);
					break;
				}
			}
		})();
	}

	private cleanupShellListener(): void {
		if (this._monitorDisposable) {
			this._monitorDisposable.dispose();
			this._monitorDisposable = undefined;
		}
	}

	public setExplorerIcon() {
		if (isMaven(this.contextValue)) { return MAVEN_ICON; }
		if (isGradle(this.contextValue)) { return GRADLE_ICON; }
		return OL_LOGO_ICON;
	}
}

export async function createProject(context: vscode.ExtensionContext, buildFile: string, contextValue: string, xmlString?: string): Promise<LibertyProject> {
	const label = await getLabelFromBuildFile(buildFile, xmlString);
	const project: LibertyProject = new LibertyProject(context, label, vscode.TreeItemCollapsibleState.None, buildFile, undefined, contextValue, undefined, undefined);
	// command: "extension.open.project",
	// title: "",
	// arguments: [buildFile],
	return project;
}

export async function getLabelFromBuildFile(buildFile: string, xmlString?: string): Promise<string> {
	let label = "";
	if (xmlString !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const parseString = require("xml2js").parseString;
		parseString(xmlString, (err: any, result: any) => {
			if (result.project.artifactId[0] !== undefined) {
				label = result.project.artifactId[0];
			} else {
				const dirName = vscodePath.dirname(buildFile);
				label = vscodePath.basename(dirName);
			}
		});
	} else {
		label = await gradleUtil.getGradleProjectName(buildFile);
	}
	return label;
}
