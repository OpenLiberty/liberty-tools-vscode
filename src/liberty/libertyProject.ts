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
import { JavaSelector } from "../util/javaSelector";

const MAVEN_ICON = "maven-tag.png";
const GRADLE_ICON = "gradle-tag-1.png";
const OL_LOGO_ICON = "ol_logo.png";

const STATUS_ICON_BASE_LIGHT = vscodePath.join("server-status-icons", "light-theme");
const STATUS_ICON_BASE_DARK  = vscodePath.join("server-status-icons", "dark-theme");

export enum DevModeState {
	Starting = "starting",
	ServerStarted = "server-started",
	Running = "running",
	Stopping = "stopping",
}

/**
 * CWWKF0011I = Liberty server ready      (Starting → ServerStarted)
 * CWWKZ0001I = application deployed      (ServerStarted → Running)
 * CWWKE0036I = server stopped            (any → undefined)
 */
export const LIBERTY_MSG_SERVER_STARTED = "CWWKF0011I";
export const LIBERTY_MSG_APP_STARTED    = "CWWKZ0001I";
export const LIBERTY_MSG_STOPPED        = "CWWKE0036I";

/** @deprecated Use LIBERTY_MSG_SERVER_STARTED */
export const LIBERTY_MSG_STARTED = LIBERTY_MSG_SERVER_STARTED;

export class LibertyProject extends vscode.TreeItem {
	public parent?: LibertyProject;
	public children: LibertyProject[] = [];
	public isAggregator: boolean = false;
	public isLibertyEnabled: boolean = false;
	public artifactId: string = "";
	public parentArtifactId?: string;
	public installDirectory?: string;
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

	// Initialised as a leaf (status) icon. updateExplorerIcon() is called by
	// projectDiscovery after isAggregator is stamped to switch aggregators to
	// their Maven/Gradle icon.
	iconPath = this.getStatusIconPath(this.state);

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
		this.iconPath = this.getStatusIconPath(state);
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

	// Returns a bundled object with the terminal and resolved JAVA_HOME path,
	// or undefined if a terminal already exists for this project.
	public async createTerminal(projectHome: string): Promise<{ terminal: vscode.Terminal; javaHome: string } | undefined> {
		if (this.terminal === undefined) {
			let javaHome = "";

			// 1. Honour the liberty.java.home manual override first.
			const libertyJavaHome: string | undefined = util.getConfiguration("java.home");
			if (libertyJavaHome && libertyJavaHome.trim().length > 0) {
				javaHome = libertyJavaHome.trim();
			} else {
				// 2. Delegate to JavaSelector's per-project resolver.
				// Reads this project's .vscode/settings.json (scoped to this.path)
				// then falls back to system PATH. Never throws.
				javaHome = await JavaSelector.getInstance().findForProject(
					vscode.Uri.file(this.path)
				);
			}

			// Terminal created plain with no env injection so shell startup scripts
			// (e.g. ~/.zshrc) cannot overwrite JAVA_HOME. The caller prepends
			// JAVA_HOME="..." directly to the mvn/gradle command via prependJavaHome().
			const terminal = vscode.window.createTerminal({ cwd: projectHome, name: this.label + " (liberty dev)" });
			return { terminal, javaHome };
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
				const serverUp = chunk.includes(LIBERTY_MSG_SERVER_STARTED);
				const appUp    = chunk.includes(LIBERTY_MSG_APP_STARTED);
				if ((serverUp || appUp) && this.state === DevModeState.Starting) {
					// First signal — move to ServerStarted unless app is already confirmed
					this.setState(appUp ? DevModeState.Running : DevModeState.ServerStarted);
					onStateChange(this);
					if (appUp) { vscode.window.showInformationMessage(`Liberty server started: ${this.label}`); }
				} else if (appUp && this.state === DevModeState.ServerStarted) {
					// Server was up, app now confirmed
					this.setState(DevModeState.Running);
					onStateChange(this);
					vscode.window.showInformationMessage(`Liberty server started: ${this.label}`);
				} else if (chunk.includes(LIBERTY_MSG_STOPPED)) {
					this.setState(undefined);
					onStateChange(this);
					break;
				}
			}
			if (!disposed && this.state === DevModeState.Starting) {
				console.log(`[startMonitoring] stream ended while Starting for ${this.label} — build likely failed, resetting state`);
				this.setState(undefined);
				onStateChange(this);
			}
		})();
	}

	private cleanupShellListener(): void {
		if (this._monitorDisposable) {
			this._monitorDisposable.dispose();
			this._monitorDisposable = undefined;
		}
	}

	/** Returns the Maven/Gradle/OL icon filename for the project's build tool. */
	public setExplorerIcon(): string {
		if (isMaven(this.contextValue)) { return MAVEN_ICON; }
		if (isGradle(this.contextValue)) { return GRADLE_ICON; }
		return OL_LOGO_ICON;
	}

	/**
	 * Recomputes iconPath based on the current isAggregator flag, parent, and state.
	 * Must be called by projectDiscovery after both isAggregator and parent are fully resolved.
	 */
	public updateExplorerIcon(): void {
		this.iconPath = this.getStatusIconPath(this.state);
	}

	private getBuildToolIconPath(): { light: string; dark: string } {
		const abs = vscodePath.join(this._context.extensionPath, "images", this.setExplorerIcon());
		return { light: abs, dark: abs };
	}

	private getStatusIconPath(state: DevModeState | undefined): { light: string; dark: string } {
		// Aggregators always show their build-tool icon.
		if (this.isAggregator) {
			return this.getBuildToolIconPath();
		}
		// Standalone leaf (no parent, not an aggregator) shows build-tool icon when stopped.
		if (state === undefined && this.parent === undefined) {
			return this.getBuildToolIconPath();
		}
		let filename: string;
		switch (state) {
			case DevModeState.ServerStarted:
			case DevModeState.Running:
				filename = "active.svg";
				break;
			case DevModeState.Stopping:
				filename = "stopping.svg";
				break;
			case DevModeState.Starting:
				filename = "incomplete.svg";
				break;
			default:
				filename = "stopped.svg";
				break;
		}
		const base = this._context.extensionPath;
		return {
			light: vscodePath.join(base, "images", STATUS_ICON_BASE_LIGHT, filename),
			dark:  vscodePath.join(base, "images", STATUS_ICON_BASE_DARK,  filename),
		};
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