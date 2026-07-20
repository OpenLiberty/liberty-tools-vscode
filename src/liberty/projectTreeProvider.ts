/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as vscode from "vscode";
import * as util from "../util/helperUtil";
import { localize } from "../util/i18nUtil";
import { devModeRequirement, computeContextValue } from "../util/helperUtil";
import { UNTITLED_WORKSPACE, SORT_ORDER_KEY, SortOrder } from "../definitions/constants";
import { LibertyProject } from "./libertyProject";
import { ProjectRegistry } from "./projectRegistry";
import { discoverWorkspace, sortByWorkspaceOrder } from "./projectDiscovery";

// URI scheme used to signal dev-mode state to the FileDecorationProvider
// Format: liberty-dev://<state>/<encoded-project-path>
// Authorities: "running" | "starting" | "stopping"
const LIBERTY_DEV_SCHEME = "liberty-dev";

export class LibertyDevDecorationProvider {
	private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	public notify(uri: vscode.Uri): void {
		this._onDidChangeFileDecorations.fire(uri);
	}

	provideFileDecoration(uri: vscode.Uri): { color: vscode.ThemeColor; tooltip: string } | undefined {
		if (uri.scheme !== LIBERTY_DEV_SCHEME) { return undefined; }
		switch (uri.authority) {
			case "running":
				return {
					color: new vscode.ThemeColor("debugIcon.startForeground"),
					tooltip: "Dev mode is running",
				};
			case "starting":
				return {
					color: new vscode.ThemeColor("charts.yellow"),
					tooltip: "Liberty server is starting",
				};
			case "stopping":
				return {
					color: new vscode.ThemeColor("charts.yellow"),
					tooltip: "Liberty server is stopping",
				};
			default:
				return undefined;
		}
	}
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<LibertyProject> {
	public readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	private static instance: ProjectTreeProvider;

	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;

	private _refreshing = false;

	private _registry: ProjectRegistry;

	public readonly decorationProvider = new LibertyDevDecorationProvider();

	constructor(registry: ProjectRegistry) {
		this._registry = registry;
		this._onDidChangeTreeData = new vscode.EventEmitter<LibertyProject | undefined>();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		vscode.commands.executeCommand('setContext', 'liberty:sortOrder', this.getSortOrder());
		this.manualRefresh();
	}

	public getSortOrder(): SortOrder {
		return (this._registry.getContext().workspaceState.get<SortOrder>(SORT_ORDER_KEY)) ?? "workspace";
	}

	public async setSortOrder(order: SortOrder): Promise<void> {
		await this._registry.getContext().workspaceState.update(SORT_ORDER_KEY, order);
		vscode.commands.executeCommand('setContext', 'liberty:sortOrder', order);
		this._registry.setRootProjects(this.sortRoots(this._registry.getRootProjects()));
		this._onDidChangeTreeData.fire(undefined);
	}

	public static getInstance(): ProjectTreeProvider {
		return ProjectTreeProvider.instance;
	}

	public static setInstance(provider: ProjectTreeProvider): void {
		ProjectTreeProvider.instance = provider;
	}

	public async refresh(): Promise<void> {
		if (this._refreshing) { return; }
		this._refreshing = true;
		this.setLoading(true);
		const statusMessage = vscode.window.setStatusBarMessage(localize("refreshing.liberty.dashboard"));
		const t0 = Date.now();
		try {
			await this.updateProjects(false);
			console.log(`[perf] refresh total: ${Date.now() - t0}ms`);
			this._onDidChangeTreeData.fire(undefined);
		} finally {
			statusMessage.dispose();
			this.setLoading(false);
			this._refreshing = false;
		}
	}

	public async manualRefresh(): Promise<void> {
		if (this._refreshing) { return; }
		this._refreshing = true;
		this.setLoading(true);
		const statusMessage = vscode.window.setStatusBarMessage(localize("refreshing.liberty.dashboard"));
		const t0 = Date.now();
		try {
			await this.updateProjects(true);
			console.log(`[perf] manualRefresh total: ${Date.now() - t0}ms`);
			this._onDidChangeTreeData.fire(undefined);
		} finally {
			statusMessage.dispose();
			this.setLoading(false);
			this._refreshing = false;
		}
	}

	/**
	 * Update the tree item to reflect the new dev mode state. Also update aggregator
	 */
	public notifyDevModeChanged(project: LibertyProject): void {
		const encoded = encodeURIComponent(project.path);
		switch (project.state) {
			case "starting":
				project.description = localize("liberty.view.starting");
				project.resourceUri = vscode.Uri.parse(`${LIBERTY_DEV_SCHEME}://starting/${encoded}`);
				break;
			case "started":
				project.description = localize("liberty.view.running");
				project.resourceUri = vscode.Uri.parse(`${LIBERTY_DEV_SCHEME}://running/${encoded}`);
				break;
			case "stopping":
				project.description = localize("liberty.view.stopping");
				project.resourceUri = vscode.Uri.parse(`${LIBERTY_DEV_SCHEME}://stopping/${encoded}`);
				break;
			default:
				project.description = undefined;
				project.resourceUri = undefined;
				break;
		}
		project.contextValue = computeContextValue(project.baseContextValue, project.state);
		this._onDidChangeTreeData.fire(project);
		if (project.resourceUri) {
			this.decorationProvider.notify(project.resourceUri);
		}
		if (project.parent) {
			this._updateAggregatorDescription(project.parent);
		}
	}

	private _updateAggregatorDescription(aggregator: LibertyProject): void {
		const descendants = this._registry.findLibertyDescendants(aggregator);
		const total = descendants.length;
		const running = descendants.filter(d => d.state === "started").length;
		aggregator.description = running > 0 ? `${running}/${total} Running...` : undefined;
		this._onDidChangeTreeData.fire(aggregator);
		if (aggregator.parent) {
			this._updateAggregatorDescription(aggregator.parent);
		}
	}

	public fireChangeEvent(): void {
		this._onDidChangeTreeData.fire(undefined);
	}



	private setLoading(loading: boolean): void {
		vscode.commands.executeCommand('setContext', 'liberty:loading', loading);
	}

	/**
	 * This method asks the user to save the workspace first if it is untitled and contains
	 * more than one project.
	 */
	public async checkUntitledWorkspaceAndSaveIt(): Promise<void> {
		return new Promise((resolve) => {
			try {
				vscode.window.showInformationMessage(
					localize("workspace.not.saved.projects.may.not.persist"),
					{ modal: true },
					'Save Workspace'
				).then(async (selection) => {
					if (selection === 'Save Workspace') {
						await this._registry.getContext().globalState.update('workspaceSaveInProgress', true);
						await vscode.commands.executeCommand('workbench.action.saveWorkspaceAs');
					}
					util.clearDataSavedInGlobalState(this._registry.getContext());
					resolve();
				});
			} catch (error) {
				console.debug("exception while saving the workspace" + error);
				util.clearDataSavedInGlobalState(this._registry.getContext());
				resolve();
			}
		});
	}

	public isMultiProjectUntitledWorkspace(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if ((workspaceFolders && workspaceFolders.length > 1
			&& vscode.workspace.name === UNTITLED_WORKSPACE)) {
			return true;
		}
		return false;
	}

	public getTreeItem(element: LibertyProject): vscode.TreeItem {
		element.collapsibleState = (element.isAggregator && element.children.length > 0)
			? vscode.TreeItemCollapsibleState.Expanded
			: vscode.TreeItemCollapsibleState.None;
		return element;
	}

	private sortRoots(roots: LibertyProject[]): LibertyProject[] {
		if (this.getSortOrder() === "alphabetical") {
			return [...roots].sort((a, b) => a.label.localeCompare(b.label));
		}
		return sortByWorkspaceOrder(roots);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async getChildren(element?: LibertyProject): Promise<LibertyProject[]> {
		if (vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showInformationMessage(localize("no.liberty.project.found.in.empty.workspace"));
			return [];
		}
		if (element === undefined) {
			const rootProjects = this._registry.getRootProjects();
			if (rootProjects.length > 0) {
				return rootProjects;
			}
			return [...this._registry.getProjects().values()];
		}
		return element.children.filter(child =>
			child.isLibertyEnabled || this.hasLibertyDescendants(child)
		);
	}

	/**
	 * Unified project picker. Handles command palette, aggregator delegation, and direct selection.
	 */
	public async pickProject(project: LibertyProject | undefined, command: string): Promise<LibertyProject | undefined> {
		const placeholder = localize("select.module.for.command");

		if (project === undefined) {
			const { filterProjects } = await import("../util/helperUtil");
			const projects = filterProjects(Array.from(this._registry.getProjects().values()), command);
			if (projects.length === 0) {
				const message = localize("no.liberty.projects.found");
				console.error(message);
				vscode.window.showInformationMessage(message);
				return undefined;
			}
			if (projects.length === 1) {
				return projects[0];
			}
			const items = projects.map(p => ({
				label: p.label,
				description: p.parent ? p.parent.label : undefined,
				detail: p.path,
				project: p,
			}));
			const selected = await vscode.window.showQuickPick(items, { placeHolder: placeholder });
			return selected?.project;
		}

		if (project.isAggregator && project.children.length > 0) {
			const libertyChildren = this._registry.findLibertyDescendants(project);
			if (libertyChildren.length === 0) {
				vscode.window.showWarningMessage(
					localize("no.liberty.modules.found", project.label)
				);
				return undefined;
			}
			const req = devModeRequirement(command);
			const eligible = req === undefined
				? libertyChildren
				: libertyChildren.filter(c => req === true ? c.state !== undefined : c.state === undefined);
			if (eligible.length === 0) {
				const msg = req === true
					? localize("no.modules.currently.running", project.label)
					: localize("all.modules.currently.running", project.label);
				vscode.window.showInformationMessage(msg);
				return undefined;
			}
			if (eligible.length === 1) {
				return eligible[0];
			}
			const items = eligible.map(c => ({
				label: c.label,
				description: c.parent ? c.parent.label : undefined,
				detail: c.path,
				project: c,
			}));
			const selected = await vscode.window.showQuickPick(items, { placeHolder: placeholder });
			return selected?.project;
		}

		if (project.isLibertyEnabled) {
			return project;
		}

		vscode.window.showWarningMessage(
			localize("project.not.liberty.enabled", project.label)
		);
		return undefined;
	}

	private hasLibertyDescendants(project: LibertyProject): boolean {
		if (project.isLibertyEnabled) { return true; }
		return project.children.some(child => this.hasLibertyDescendants(child));
	}

	private async updateProjects(forceRebuild: boolean): Promise<void> {
		const t0 = Date.now();
		const context = this._registry.getContext();
		const wsFolders = vscode.workspace.workspaceFolders ?? [];
		const existingProjects = forceRebuild ? new Map() : this._registry.getProjects();

		const { projects, rootProjects, rejectedBuildFiles } = await discoverWorkspace(
			context,
			wsFolders,
			existingProjects,
			(partial, foldersComplete, totalFolders) => {
				// Progressive tree update after each folder
				this._registry.setProjects(new Map(partial));
				this._registry.setRootProjects(this.sortRoots(Array.from(partial.values()).filter(p => !p.parent)));
				this._onDidChangeTreeData.fire(undefined);
			}
		);

		this._registry.setProjects(projects);
		this._registry.setRootProjects(this.sortRoots(rootProjects));
		this._registry.setRejectedBuildFiles(rejectedBuildFiles);
		console.log(`[perf] updateProjects total: ${Date.now() - t0}ms  (${projects.size} projects, ${rootProjects.length} roots)`);
	}
}
