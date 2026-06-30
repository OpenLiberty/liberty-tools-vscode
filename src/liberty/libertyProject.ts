/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as fse from "fs-extra";
import * as vscodePath from "path";
import * as vscode from "vscode";
import * as gradleUtil from "../util/gradleUtil";
import * as mavenUtil from "../util/mavenUtil";
import * as util from "../util/helperUtil";
import { localize } from "../util/i18nUtil";
import { devModeRequirement } from "../util/helperUtil";

/**
 * Internal pipeline cache: one entry per discovered build file, carrying
 * raw parsed content so each file is read/parsed exactly once.
 */
interface ParsedBuildEntry {
	path: string;
	type: "maven" | "gradle";
	xmlString?: string;       // maven only
	parsedBuild?: any;        // gradle only — null when regexBuildFile is set
	settingsPath?: string;    // gradle only
	parsedSettings?: any;     // gradle only
	/** Set when regex pre-screen was sufficient and g2js.parseFile was skipped */
	regexBuildFile?: import("../util/buildFile").GradleBuildFile;
}
import {
	EXCLUDED_DIR_PATTERN,
	UNTITLED_WORKSPACE,
	LIBERTY_PROJECT_MAVEN, LIBERTY_PROJECT_GRADLE,
	LIBERTY_PROJECT_MAVEN_CONTAINER, LIBERTY_PROJECT_GRADLE_CONTAINER,
	LIBERTY_PROJECT_MAVEN_AGGREGATOR, LIBERTY_PROJECT_GRADLE_AGGREGATOR,
	isMaven, isGradle,
	// Deprecated — used only for persisted storage migration shim
	LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT,
	LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER,
} from "../definitions/constants";
import { BuildFileImpl, GradleBuildFile } from "../util/buildFile";
import { DashboardData } from "./dashboard";
import { BaseLibertyProject } from "./baseLibertyProject";

const MAVEN_ICON = "maven-tag.png";
const GRADLE_ICON = "gradle-tag-1.png";
const OL_LOGO_ICON = "ol_logo.png";

// URI scheme used to signal dev-mode state to the FileDecorationProvider.
// Format: liberty-dev://running/<encoded-project-path>
const LIBERTY_DEV_SCHEME = "liberty-dev";

export class LibertyDevDecorationProvider {
	private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	public notify(uri: vscode.Uri): void {
		this._onDidChangeFileDecorations.fire(uri);
	}

	provideFileDecoration(uri: vscode.Uri): { color: vscode.ThemeColor; tooltip: string } | undefined {
		if (uri.scheme === LIBERTY_DEV_SCHEME && uri.authority === "running") {
			return {
				// this is the VSCode color for debug foreground green
				color: new vscode.ThemeColor("debugIcon.startForeground"),
				tooltip: "Dev mode running",
			};
		}
		return undefined;
	}
}

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {
	public readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	private static instance: ProjectProvider;

	// tslint:disable-next-line: variable-name
	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;

	private _refreshing = false;

	private _treeView: vscode.TreeView<LibertyProject> | undefined;

	// Map of buildFilePath -> LibertyProject
	private projects: Map<string, LibertyProject> = new Map();

	// Root projects for hierarchical tree view
	private rootProjects: LibertyProject[] = [];

	private _context: vscode.ExtensionContext;

	public readonly decorationProvider = new LibertyDevDecorationProvider();

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
		this._onDidChangeTreeData = new vscode.EventEmitter<LibertyProject | undefined>();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.refresh();
	}

	public getContext(): vscode.ExtensionContext {
		return this._context;
	}

	public static getInstance(): ProjectProvider {
		return ProjectProvider.instance;
	}

	public static setInstance(projectProvider: ProjectProvider): void {
		ProjectProvider.instance = projectProvider;
	}

	private async createLibertyProject(path: string, type: string | undefined): Promise<LibertyProject | undefined> {
		let project: LibertyProject | undefined;

		// Migration shim: map old persisted contextValue strings to new scheme.
		// Users upgrading from previous versions may have old strings in workspaceState.
		// Remove this shim after one release cycle.
		const migrateContextValue = (cv: string): string => {
			const map: Record<string, string> = {
				[LIBERTY_MAVEN_PROJECT]: LIBERTY_PROJECT_MAVEN,
				[LIBERTY_GRADLE_PROJECT]: LIBERTY_PROJECT_GRADLE,
				[LIBERTY_MAVEN_PROJECT_CONTAINER]: LIBERTY_PROJECT_MAVEN_CONTAINER,
				[LIBERTY_GRADLE_PROJECT_CONTAINER]: LIBERTY_PROJECT_GRADLE_CONTAINER,
			};
			return map[cv] ?? cv;
		};

		if (type !== undefined) {
			const migratedType = migrateContextValue(type);
			if (fse.existsSync(path) && isMaven(migratedType)) {
				const xmlString = await fse.readFile(path, "utf8");
				project = await createProject(this._context, path, migratedType, xmlString);
			} else if (fse.existsSync(path) && isGradle(migratedType)) {
				project = await createProject(this._context, path, migratedType);
			}
		} else {
			const pomFile = vscodePath.resolve(path, "pom.xml");

			if (fse.existsSync(pomFile)) {
				const xmlString = await fse.readFile(pomFile, "utf8");
				project = await createProject(this._context, pomFile, LIBERTY_PROJECT_MAVEN, xmlString);
			} else {
				const gradleFile = vscodePath.resolve(path, "build.gradle");
				if (fse.existsSync(gradleFile)) {
					project = await createProject(this._context, gradleFile, LIBERTY_PROJECT_GRADLE);
				}
			}
		}
		return project;
	}

	/*
	 * Scan the specified folder, get a list of paths that contain a pom.xml or build.gradle file. Exclude the folders that already
	 * exist in the ProjectProvider class "projects" map.
	 * */
	public async getListOfMavenAndGradleFolders(path: string): Promise<string[]> {
		let uris: string[] = [];
		const pomPattern = new vscode.RelativePattern(path, "**/pom.xml");
		const gradlePattern = new vscode.RelativePattern(path, "**/build.gradle");
		let paths = (await vscode.workspace.findFiles(pomPattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		uris = uris.concat(paths);
		paths = (await vscode.workspace.findFiles(gradlePattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		uris = uris.concat(paths);
		const result: string[] = [];
		uris.forEach((uri) => {
			if (this.projects.has(uri) === false) {
				result.push(vscodePath.dirname(uri));
			}
		});
		return result;
	}

	/**
	 * Adds the user selected project path to the project map.
	 * The path should not already exists in the map.
	 * Then, the path should contain a pom file or gradle build file.
	 * If the path already exists, then the project will not be added/updated.
	 * @param project 
	 * @param existingProjects 
	 * @returns 
	 */
	public async addUserSelectedPath(path: string, existingProjects: Map<string, LibertyProject>): Promise<number> {
		let baseProject = undefined;
		const pomFile = vscodePath.resolve(path, "pom.xml");
		const gradleFile = vscodePath.resolve(path, "build.gradle");
		let returnCode = 0;
		if (this.projects.has(pomFile) || this.projects.has(gradleFile)) {
			// project already exists
			returnCode = 1;
		} else {
			const project = await this.createLibertyProject(path, undefined);
			if (project !== undefined) {
				// pom or gradle build file exists.
				existingProjects.set(project.getPath(), project);
				baseProject = new BaseLibertyProject(project.getLabel(), project.getPath(), project.getContextValue());
				// save it
				const dashboardData: DashboardData = util.getStorageData(this._context);
				dashboardData.addProjectToManualProjects(baseProject);
				await util.saveStorageData(this._context, dashboardData);
			}
			else {
				// Not a maven or gradle project.
				returnCode = 2;
			}
		}
		return returnCode;
	}

	public isPathExistsInPersistedProjects(path: string): string | undefined {
		const dashboard: DashboardData = util.getStorageData(this._context);
		const pomFile = vscodePath.resolve(path, "pom.xml");
		const gradleFile = vscodePath.resolve(path, "build.gradle");
		if (fse.existsSync(pomFile) && dashboard.isPathExists(pomFile)) {
			return pomFile;
		} else if (fse.existsSync(gradleFile) && dashboard.isPathExists(gradleFile)) {
			return gradleFile;
		}
		return undefined;
	}

	public removeInPersistedProjects(path: string): void {
		const dashboard: DashboardData = util.getStorageData(this._context);
		if (dashboard.isPathExists(path)) {
			// remove it from storage.
			dashboard.removeProject(path);
			util.saveStorageData(this._context, dashboard);
			// remove from current projests
			this.projects.delete(path);
		}
	}

	public getUserAddedProjects(): BaseLibertyProject[] {
		return util.getStorageData(this._context).projects;
	}

	private async addPersistedProjects(): Promise<void> {
		const dashboardData = util.getStorageData(this._context);
		const projects = dashboardData.projects;
		const projectsToBeRemoved: BaseLibertyProject[] = [];
		for (const p of projects) {
			// check if folder exists and has valid pom.xml or gradle build file.
			// User may shut down VSCode, delete projects/folders offline, then bring up
			// vscode, so these projects become obsolete
			const project = await this.createLibertyProject(p.path, p.contextValue);
			if (project !== undefined) {
				this.projects.set(p.path, project);
				console.debug("Project " + p.path + " added to Liberty Tools");
			} else {
				// add to remove list
				projectsToBeRemoved.push(p);
			}
		}

		if (projectsToBeRemoved.length > 0) {
			projectsToBeRemoved.forEach(function (element) {
				dashboardData.removeProject(element.path);
			});
			// save it.
			await util.saveStorageData(this._context, dashboardData);
		}
	}
	public getProjects(): Map<string, LibertyProject> {
		return this.projects;
	}
	public async refresh(): Promise<void> {
		if (this._refreshing) { return; }
		this._refreshing = true;
		this.setLoading(true);
		const statusMessage = vscode.window.setStatusBarMessage(localize("refreshing.liberty.dashboard"));
		const t0 = Date.now();
		try {
			await this.updateProjects();
			console.log(`[perf] refresh total: ${Date.now() - t0}ms`);
			this._onDidChangeTreeData.fire(undefined);
		} finally {
			statusMessage.dispose();
			this.setLoading(false);
			this.setMessage("");
			this._refreshing = false;
		}
	}

	/**
	 * This method asks the user to save the workspace first if it is untitled and the workspace contains more than
	 * one project. If the workspace is not saved, there are chances that the project's state may not be saved and 
	 * manually added projects may not be visible in the Liberty dashboard in a new VS Code session.
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
						/**
						 * setting workspaceSaveInProgress to true and storing it in globalstate for identifyting that the
						 * workspace is saved and needs to save the manually added projects to the dashboard
						 */
						await this._context.globalState.update('workspaceSaveInProgress', true);
						//opens the saveWorkspace as dialog box
						await vscode.commands.executeCommand('workbench.action.saveWorkspaceAs');
					}
					/**
					 * If the user cancels saving the workspace and exits without saving, the data stays in the global state, 
					 * which is shared across all VS Code instances. To prevent this data from being mistakenly used in other 
					 * sessions and added to the dashboard, it should be cleared if the user cancels the save.
					 */
					util.clearDataSavedInGlobalState(this._context);
					resolve();
				});
			} catch (error) {
				console.debug("exception while saving the workspace" + error);
				util.clearDataSavedInGlobalState(this._context);
				resolve();
			}
		});
	}

	/*
	This method identifies a workspace that is untitled and contains more than one project 
	*/
	public isMultiProjectUntitledWorkspace(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if ((workspaceFolders && workspaceFolders.length > 1
			&& vscode.workspace.name === UNTITLED_WORKSPACE)) {
			return true;
		}
		return false;
	}

	public fireChangeEvent(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	public setTreeView(treeView: vscode.TreeView<LibertyProject>): void {
		this._treeView = treeView;
	}

	public setMessage(message: string): void {
		if (this._treeView) {
			this._treeView.message = message;
		}
	}

	private setLoading(loading: boolean): void {
		vscode.commands.executeCommand('setContext', 'liberty:loading', loading);
	}

	public getTreeItem(element: LibertyProject): vscode.TreeItem {
		element.collapsibleState = (element.isAggregator && element.children.length > 0)
			? vscode.TreeItemCollapsibleState.Expanded
			: vscode.TreeItemCollapsibleState.None;
		return element;
	}

	/**
	 * Update the tree item to reflect the new dev mode state by:
	 * Add a text description and update URI with a running component to make green
	 * Then trigger a refresh for the tree view.
	 */
	public notifyDevModeChanged(project: LibertyProject): void {
		if (project.isDevMode) {
			project.description = "Running...";
			project.resourceUri = vscode.Uri.parse(
				`${LIBERTY_DEV_SCHEME}://running/${encodeURIComponent(project.path)}`
			);
		} else {
			project.description = undefined;
			project.resourceUri = undefined;
		}
		this._onDidChangeTreeData.fire(project);
		if (project.resourceUri) {
			this.decorationProvider.notify(project.resourceUri);
		}
	}

	/**
	 * Check if a project has any Liberty-enabled descendants
	 * @param project The project to check
	 * @returns true if project or any descendant is Liberty-enabled
	 */
	private hasLibertyDescendants(project: LibertyProject): boolean {
		if (project.isLibertyEnabled) {
			return true;
		}
		return project.children.some(child => this.hasLibertyDescendants(child));
	}

	/**
	 * Find all Liberty-enabled descendants of a project
	 * @param project The project to search
	 * @returns Array of Liberty-enabled descendant projects
	 */
	public findLibertyDescendants(project: LibertyProject): LibertyProject[] {
		const descendants: LibertyProject[] = [];

		// Only search children - don't include the project itself
		// This ensures aggregators aren't included in their own descendant list
		for (const child of project.children) {
			// Add the child if it's Liberty-enabled
			if (child.isLibertyEnabled) {
				descendants.push(child);
			}
			// Recursively search the child's descendants
			descendants.push(...this.findLibertyDescendants(child));
		}

		return descendants;
	}

	/**
	 * Unified project picker. Replaces both `showProjects` (command palette) and
	 * `resolveCommandTarget` (tree-view aggregator delegation).
	 *
	 * - No project (command palette): filter all leaf projects for `command`, auto-select if 1, quick pick if many.
	 * - project = leaf/submodule: return directly, no picker.
	 * - project = aggregator: filter Liberty-enabled children, auto-select if 1, quick pick if many.
	 *
	 * @param project  Optional project passed from context menu / tree view click.
	 * @param command  Command key used to filter projects when no project is provided (e.g. "liberty.dev.start").
	 * @returns The resolved leaf project to operate on, or undefined if cancelled / nothing found.
	 */
	public async pickProject(project: LibertyProject | undefined, command: string): Promise<LibertyProject | undefined> {
		const placeholder = localize("select.module.for.command");

		if (project === undefined) {
			// Command palette path — filter all leaf projects
			const { filterProjects } = await import("../util/helperUtil");
			const projects = filterProjects(Array.from(this.projects.values()), command);
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
			// Aggregator path — delegate to Liberty-enabled children and filter by dev mode state
			const libertyChildren = this.findLibertyDescendants(project);
			if (libertyChildren.length === 0) {
				vscode.window.showWarningMessage(
					localize("no.liberty.modules.found", project.label)
				);
				return undefined;
			}
			const req = devModeRequirement(command);
			const eligible = req === undefined
				? libertyChildren
				: libertyChildren.filter(c => c.isDevMode === req);
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

		// Leaf / submodule — use directly
		if (project.isLibertyEnabled) {
			return project;
		}

		vscode.window.showWarningMessage(
			localize("project.not.liberty.enabled", project.label)
		);
		return undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async getChildren(element?: LibertyProject): Promise<LibertyProject[]> {
		if (vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showInformationMessage(localize("no.liberty.project.found.in.empty.workspace"));
			return [];
		}
		// if element is null, vscode is asking for the root node
		if (element === undefined) {
			// Return root projects for hierarchical view
			// If no hierarchy is built, fall back to flat list
			if (this.rootProjects.length > 0) {
				return this.rootProjects;
			}
			return [... this.projects.values()];
		}
		// Return children that are Liberty-enabled OR have Liberty descendants
		return element.children.filter(child =>
			child.isLibertyEnabled || this.hasLibertyDescendants(child)
		);
	}


	public projectRootPathExists(path: string, keys: Iterable<string>): boolean {
		for (const existingPath of keys) {
			if (vscodePath.dirname(existingPath) === path) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Crawl stage. Reads and parses every build file exactly once, validates Liberty
	 * relevance, and produces shell LibertyProject objects in projectsMap.
	 * Children are identified by resolved absolute path — no string matching.
	 *
	 * Phase 1 — parallel read/parse of all files into ParsedBuildEntry[]
	 * Phase 2 — classify parents: resolve mavenChildPomPaths + gradleChildBuildPaths
	 * Phase 3 — parallel validate + create shell LibertyProject objects into projectsMap
	 *
	 * Returns { projectsMap, allEntries } for consumption by stampProjects.
	 */
	private async discoverProjects(
		pomPaths: string[],
		gradlePaths: string[],
		projectsMap: Map<string, LibertyProject>
	): Promise<{ projectsMap: Map<string, LibertyProject>; allEntries: ParsedBuildEntry[] }> {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const g2js = require("gradle-to-js/lib/parser");
		const t0 = Date.now();

		// ── Phase 1: read/parse all files in parallel ──────────────────────────
		const allEntries: ParsedBuildEntry[] = await Promise.all([
			...pomPaths.map(async (p): Promise<ParsedBuildEntry> => ({
				path: p,
				type: "maven",
				xmlString: await fse.readFile(p, "utf8").catch(err => {
					console.error(`Error reading ${p}:`, err);
					return "";
				}),
			})),
			...gradlePaths.map(async (p): Promise<ParsedBuildEntry> => {
				const settingsPath = gradleUtil.getGradleSettings(p);

				// Fast path: read raw text and try regex detection first.
				// g2js.parseFile() is a full char-by-char parser — skip it when:
				//   (a) regex already confirms modern plugin syntax, AND
				//   (b) file has no legacy buildscript { } block
				// g2js is still needed for: legacy buildscript.dependencies syntax,
				// settings.gradle include extraction, and test-report path queries.
				const rawContent = await fse.readFile(p, "utf8").catch((err: any) => {
					console.error(`Error reading ${p}:`, err);
					return "";
				});

				const regexResult = gradleUtil.detectLibertyPluginFromText(rawContent);
				const needsG2js = !regexResult && gradleUtil.mightUseLegacyBuildscriptSyntax(rawContent);
				// Always parse settings.gradle when present — needed for include (aggregator detection)
				// and rootProject.name (label). Skip it only if there are no subprojects to find.
				const hasIncludes = settingsPath ? (() => {
					try {
						const st = fse.readFileSync(settingsPath, "utf8");
						return /\binclude\b/.test(st);
					} catch { return false; }
				})() : false;

				const [parsedBuild, parsedSettings] = await Promise.all([
					needsG2js
						? g2js.parseFile(p).catch((err: any) => {
							console.error(localize("unable.to.parse.build.gradle", p, err));
							return null;
						})
						: Promise.resolve(null),
					(settingsPath && (hasIncludes || !regexResult))
						? g2js.parseFile(settingsPath).catch((err: any) => {
							console.error(localize("unable.to.parse.settings.gradle", settingsPath, err));
							return null;
						})
						: Promise.resolve(null),
				]);
				return {
					path: p, type: "gradle",
					parsedBuild,
					settingsPath: settingsPath || undefined,
					parsedSettings,
					// regexBuildFile is set when g2js was skipped (modern plugin syntax confirmed)
					regexBuildFile: (!needsG2js && regexResult) ? regexResult : undefined,
				};
			}),
		]);
		console.log(`[perf] discoverProjects phase1 (read+parse): ${Date.now() - t0}ms`);

		const mavenEntries = allEntries.filter(e => e.type === "maven");
		const gradleEntries = allEntries.filter(e => e.type === "gradle");

		// ── Phase 2: classify parents ──────────────────────────────────────────
		// Maven: scan all POMs for parent declarations + build mavenChildMap
		let mavenChildMap: Map<string, string[]> = new Map();
		const mavenParentPaths = new Set<string>();
		// Resolved absolute pom.xml paths of all known child modules.
		// <module> is a relative directory path (Maven spec), never an artifactId.
		// Resolving here handles arbitrary paths like "../other/module" correctly.
		const mavenChildPomPaths = new Set<string>();
		for (const entry of mavenEntries) {
			if (!entry.xmlString) { continue; }
			const validParent = mavenUtil.validParentPom(entry.xmlString);
			console.log(`[discovery] phase2 validParentPom(${entry.path}): isValid=${validParent.isValidBuildFile()} type=${validParent.getProjectType()}`);
			if (validParent.isValidBuildFile()) {
				const childModules = mavenUtil.findChildMavenModules(entry.xmlString);
				console.log(`[discovery] phase2 findChildMavenModules(${entry.path}):`, JSON.stringify(Array.from(childModules.entries())));
				mavenChildMap = new Map([
					...Array.from(mavenChildMap.entries()),
					...Array.from(childModules.entries()),
				]);
				const parentDir = vscodePath.dirname(entry.path);
				for (const modulePaths of childModules.values()) {
					for (const modulePath of modulePaths) {
						const resolvedPom = vscodePath.resolve(parentDir, modulePath, "pom.xml");
						mavenChildPomPaths.add(resolvedPom);
						console.log(`[discovery] phase2 resolved child pom: ${resolvedPom}`);
					}
				}
				mavenParentPaths.add(entry.path);
			}
		}

		// Gradle: scan all build.gradle entries for settings.gradle includes
		// Resolve include() paths to absolute build.gradle paths.
		// Gradle project paths use ':' as separator (e.g. "services:api" -> ./services/api).
		// See: https://docs.gradle.org/current/userguide/multi_project_builds.html
		const gradleChildBuildPaths = new Set<string>();
		const gradleParentPaths = new Set<string>();
		for (const entry of gradleEntries) {
			// Need parsedSettings for include detection; parsedBuild OR regexBuildFile is sufficient
			if ((!entry.parsedBuild && !entry.regexBuildFile) || !entry.parsedSettings) { continue; }
			const gradleBuildFile = gradleUtil.findChildGradleProjects(
				entry.parsedBuild ?? {}, entry.parsedSettings, entry.path
			);
			if (gradleBuildFile.getChildren().length > 0) {
				const parentDir = vscodePath.dirname(entry.path);
				for (const includePath of gradleBuildFile.getChildren()) {
					// Convert Gradle project path to filesystem path: replace ':' with '/'
					const fsPath = includePath.replace(/:/g, "/");
					const resolvedBuild = vscodePath.resolve(parentDir, fsPath, "build.gradle");
					gradleChildBuildPaths.add(resolvedBuild);
					console.log(`[discovery] phase2 resolved gradle child: ${resolvedBuild}`);
				}
				gradleParentPaths.add(entry.path);
			}
		}
		console.log(`[perf] discoverProjects phase2 (classify): ${Date.now() - t0}ms`);

		// ── Phase 3: validate + create LibertyProject objects (parallel) ────────
		const visitedPaths = new Set<string>();

		await Promise.all([
			// Maven entries
			...mavenEntries.map(async (entry) => {
				if (!entry.xmlString) { return; }
				let buildFile: BuildFileImpl;
				const isParent = mavenParentPaths.has(entry.path);
				const isChild = mavenChildPomPaths.has(entry.path);
				if (isParent) {
					buildFile = mavenUtil.validParentPom(entry.xmlString);
				} else if (isChild) {
					// Child module resolved by path — no string matching needed.
					buildFile = new BuildFileImpl(true, LIBERTY_PROJECT_MAVEN);
					buildFile.setBuildFilePath(entry.path);
				} else {
					// Not a known child — check for standalone Liberty plugin
					buildFile = mavenUtil.validPom(entry.xmlString, mavenChildMap);
				}
				if (!buildFile.isValidBuildFile()) { return; }
				buildFile.setBuildFilePath(entry.path);

				// Re-use existing project (preserves terminal state) or create new
				if (this.projects.has(entry.path)) {
					const existing = this.projects.get(entry.path)!;
					if (existing.contextValue !== buildFile.getProjectType()) {
						existing.setContextValue(buildFile.getProjectType());
					}
					const newLabel = await getLabelFromBuildFile(entry.path, entry.xmlString);
					if (newLabel && existing.getLabel() !== newLabel) { existing.setLabel(newLabel); }
					projectsMap.set(entry.path, existing);
				} else {
					const project = await createProject(this._context, entry.path, buildFile.getProjectType(), entry.xmlString);
					projectsMap.set(entry.path, project);
				}
				visitedPaths.add(entry.path);
			}),

			// Gradle entries
			...gradleEntries.map(async (entry) => {
				// Either a full g2js parse or a regex pre-screen result must be present
				if (!entry.parsedBuild && !entry.regexBuildFile) { return; }
				let buildFile: BuildFileImpl;

				if (gradleParentPaths.has(entry.path)) {
					// Parent aggregator — parsedBuild available (aggregators need settings include detection)
					const gf = gradleUtil.findChildGradleProjects(entry.parsedBuild ?? {}, entry.parsedSettings, entry.path);
					buildFile = new GradleBuildFile(true, gf.getProjectType());
				} else if (gradleChildBuildPaths.has(entry.path)) {
					// Child module identified by resolved path — validate; use regexBuildFile if g2js was skipped
					const gf = entry.regexBuildFile
						? entry.regexBuildFile
						: gradleUtil.validGradleBuild(entry.parsedBuild!, entry.path);
					const shouldInclude = await gradleUtil.validateGradleChildModule(gf, entry.parsedBuild ?? {}, entry.path, visitedPaths);
					if (!shouldInclude) { return; }
					buildFile = gf;
				} else {
					// Standalone — must have Liberty plugin
					buildFile = entry.regexBuildFile
						? entry.regexBuildFile
						: gradleUtil.validGradleBuild(entry.parsedBuild!, entry.path);
					if (!buildFile.hasLibertyPlugin()) { return; }
				}
				buildFile.setBuildFilePath(entry.path);

				// Resolve label from cached settings — avoids re-parsing settings.gradle
				const gradleLabel: string =
					(entry.parsedSettings && entry.parsedSettings["rootProject.name"])
						? entry.parsedSettings["rootProject.name"]
						: vscodePath.basename(vscodePath.dirname(entry.path));

				if (this.projects.has(entry.path)) {
					const existing = this.projects.get(entry.path)!;
					if (existing.contextValue !== buildFile.getProjectType()) {
						existing.setContextValue(buildFile.getProjectType());
					}
					if (existing.getLabel() !== gradleLabel) { existing.setLabel(gradleLabel); }
					projectsMap.set(entry.path, existing);
				} else {
					const project = new LibertyProject(this._context, gradleLabel, vscode.TreeItemCollapsibleState.None, entry.path, "start", buildFile.getProjectType(), undefined, /* {
						command: "extension.open.project",
						title: "",
						arguments: [entry.path],
					} */ undefined);
					projectsMap.set(entry.path, project);
				}
				visitedPaths.add(entry.path);
			}),
		]);
		console.log(`[perf] discoverProjects phase3 (create projects): ${Date.now() - t0}ms  (${projectsMap.size} valid)`);
		return { projectsMap, allEntries };
	}

	/**
	 * Enrichment stage. Runs once over the fully-merged shell objects from discoverProjects.
	 * Writes identity and classification fields (artifactId, isAggregator, isLibertyEnabled)
	 * onto each shell. Requires the full cross-folder picture.
	 *
	 * Consumes allEntries (ParsedBuildEntry[]) — raw parsed content is discarded after this stage.
	 * Returns { projectsMap, mavenMetadataMap, gradleMetadataMap } for linkProjects.
	 */
	private async stampProjects(
		projectsMap: Map<string, LibertyProject>,
		allEntries: ParsedBuildEntry[]
	): Promise<{
		projectsMap: Map<string, LibertyProject>;
		mavenMetadataMap: Map<string, mavenUtil.MavenProjectMetadata>;
		gradleMetadataMap: Map<string, gradleUtil.GradleProjectMetadata>;
	}> {
		const t0 = Date.now();
		const mavenMetadataMap = new Map<string, mavenUtil.MavenProjectMetadata>();
		const gradleMetadataMap = new Map<string, gradleUtil.GradleProjectMetadata>();

		for (const entry of allEntries) {
			const project = projectsMap.get(entry.path);
			if (!project) {
				console.log(`[stamp] no projectsMap entry for ${entry.path} — skipping`);
				continue;
			}
			try {
				if (entry.type === "maven" && entry.xmlString) {
					const metadata = await mavenUtil.extractMavenMetadata(entry.path, entry.xmlString);
					console.log(`[stamp] maven ${entry.path}: artifactId=${metadata.artifactId}, parentArtifactId=${metadata.parentArtifactId}, isAggregator=${metadata.isAggregator}, isLibertyEnabled=${metadata.isLibertyEnabled}`);
					project.artifactId = metadata.artifactId;
					project.parentArtifactId = metadata.parentArtifactId;
					project.isAggregator = metadata.isAggregator;
					project.isLibertyEnabled = metadata.isLibertyEnabled;
					mavenMetadataMap.set(entry.path, metadata);
				} else if (entry.type === "gradle" && (entry.parsedBuild || entry.regexBuildFile)) {
					const metadata = await gradleUtil.extractGradleMetadata(entry.path, entry.parsedBuild ?? null, entry.parsedSettings);
					console.log(`[stamp] gradle ${entry.path}: projectName=${metadata.projectName}, parentProjectName=${metadata.parentProjectName}, isAggregator=${metadata.isAggregator}, isLibertyEnabled=${metadata.isLibertyEnabled}`);
					project.artifactId = metadata.projectName;
					project.parentArtifactId = metadata.parentProjectName;
					project.isAggregator = metadata.isAggregator;
					project.isLibertyEnabled = metadata.isLibertyEnabled;
					gradleMetadataMap.set(entry.path, metadata);
				}
			} catch (error) {
				console.error(`Error stamping metadata for ${entry.path}:`, error);
				project.isLibertyEnabled = true;
			}
		}
		console.log(`[perf] stampProjects: ${Date.now() - t0}ms  (${mavenMetadataMap.size} maven, ${gradleMetadataMap.size} gradle)`);
		return { projectsMap, mavenMetadataMap, gradleMetadataMap };
	}

	/**
	 * Association stage. Receives stamped LibertyProject objects and wires
	 * parent/child relationships via parentArtifactId and filesystem module paths.
	 * Computes rootProjects. Does no file I/O, receives no raw parsed content.
	 */
	private async linkProjects(
		projectsMap: Map<string, LibertyProject>,
		mavenMetadataMap: Map<string, mavenUtil.MavenProjectMetadata>,
		gradleMetadataMap: Map<string, gradleUtil.GradleProjectMetadata>
	): Promise<void> {
		const t0 = Date.now();
		const mavenProjectsByArtifactId = new Map<string, LibertyProject>();
		const gradleProjectsByName = new Map<string, LibertyProject>();

		// Build lookup maps from stamped metadata
		for (const [path, metadata] of mavenMetadataMap.entries()) {
			const project = projectsMap.get(path);
			if (project) { mavenProjectsByArtifactId.set(metadata.artifactId, project); }
		}
		for (const [path, metadata] of gradleMetadataMap.entries()) {
			const project = projectsMap.get(path);
			if (project) { gradleProjectsByName.set(metadata.projectName, project); }
		}

		// Link parent-child via parentArtifactId (standard Maven <parent> / Gradle settings include).
		// Inherit isLibertyEnabled — child gets it if parent has it.
		for (const project of projectsMap.values()) {
			if (!project.parentArtifactId) { continue; }
			const parent = project.path.endsWith("pom.xml")
				? mavenProjectsByArtifactId.get(project.parentArtifactId)
				: gradleProjectsByName.get(project.parentArtifactId);
			console.log(`[link] ${project.artifactId} parentArtifactId=${project.parentArtifactId} -> parent found=${!!parent}`);
			if (parent && !parent.children.includes(project)) {
				project.parent = parent;
				parent.children.push(project);
				if (!project.isLibertyEnabled && parent.isLibertyEnabled) {
					project.isLibertyEnabled = true;
					console.debug(`${project.artifactId} inherits Liberty plugin from parent ${parent.artifactId}`);
				}
			}
		}

		// Link via filesystem paths for Maven projects missing <parent> element.
		// Inherit isLibertyEnabled — child gets it if parent has it.
		for (const [parentPath, parentMetadata] of mavenMetadataMap.entries()) {
			if (!parentMetadata.isAggregator || parentMetadata.modules.length === 0) { continue; }
			const parentProject = projectsMap.get(parentPath);
			if (!parentProject) { continue; }
			const parentDir = vscodePath.dirname(parentPath);
			for (const moduleName of parentMetadata.modules) {
				const modulePomPath = vscodePath.resolve(parentDir, moduleName, "pom.xml");
				const childProject = projectsMap.get(modulePomPath);
				if (childProject && !childProject.parent) {
					childProject.parent = parentProject;
					if (!parentProject.children.includes(childProject)) {
						parentProject.children.push(childProject);
					}
					if (!childProject.isLibertyEnabled && parentProject.isLibertyEnabled) {
						childProject.isLibertyEnabled = true;
					}
					console.debug(`Linked module ${moduleName} to parent ${parentMetadata.artifactId} via filesystem path`);
				}
			}
		}

		// Stamp aggregator contextValue
		for (const project of projectsMap.values()) {
			if (project.isAggregator) {
				project.setContextValue(
					isMaven(project.contextValue)
						? LIBERTY_PROJECT_MAVEN_AGGREGATOR
						: LIBERTY_PROJECT_GRADLE_AGGREGATOR
				);
			}
		}

		this.rootProjects = Array.from(projectsMap.values())
			.filter(p => !p.parent)
			.filter(p => p.isLibertyEnabled || this.hasLibertyDescendants(p));
		console.log(`[perf] linkProjects: ${Date.now() - t0}ms  (${this.rootProjects.length} roots)`);
	}

	/**
	 * Fallback discovery for workspace folders not covered by the main build-file scan.
	 * Finds projects by locating server.xml and walking up to infer the build file location.
	 */
	private async addServerXMLProjects(projectsMap: Map<string, LibertyProject>): Promise<void> {
		let serverXMLPaths: string[] = [];
		const wsFolders = vscode.workspace.workspaceFolders;
		if (wsFolders) {
			for (const folder of wsFolders) {
				if (!this.projectRootPathExists(folder.uri.fsPath, projectsMap.keys())) {
					const pattern = new vscode.RelativePattern(folder.uri.fsPath, "**/src/main/liberty/config/server.xml");
					const paths = (await vscode.workspace.findFiles(pattern, EXCLUDED_DIR_PATTERN)).map(u => u.fsPath);
					serverXMLPaths = serverXMLPaths.concat(paths);
				}
			}
		}

		// server.xml is at ./src/main/liberty/config/server.xml — 4 levels up is project root
		for (const serverXML of serverXMLPaths) {
			const folder = vscodePath.parse(vscodePath.resolve(serverXML, "../../../../")).dir;
			const pomFile = vscodePath.resolve(folder, "pom.xml");

			if (fse.existsSync(pomFile) && !projectsMap.has(pomFile)) {
				if (this.projects.has(pomFile)) {
					projectsMap.set(pomFile, this.projects.get(pomFile)!);
				} else {
					const xmlString = await fse.readFile(pomFile, "utf8");
					// Only add if LMP is actively declared in <build><plugins>.
					// server.xml presence alone is not sufficient — the pom must have LMP active.
					const buildFile = mavenUtil.validPom(xmlString, new Map());
					if (buildFile.isValidBuildFile()) {
						projectsMap.set(pomFile, await createProject(this._context, pomFile, buildFile.getProjectType(), xmlString));
					}
				}
			} else {
				const gradleFile = vscodePath.resolve(folder, "build.gradle");
				if (fse.existsSync(gradleFile) && !projectsMap.has(gradleFile)) {
					if (this.projects.has(gradleFile)) {
						projectsMap.set(gradleFile, this.projects.get(gradleFile)!);
					} else {
						const rawContent = await fse.readFile(gradleFile, "utf8").catch(() => "");
						// Only add if LMP is actively declared — server.xml presence alone is not sufficient.
						const buildFile = gradleUtil.detectLibertyPluginFromText(rawContent);
						if (buildFile) {
							projectsMap.set(gradleFile, await createProject(this._context, gradleFile, buildFile.getProjectType()));
						}
					}
				}
			}
		}
	}

	private async updateProjects(): Promise<void> {
		const t0 = Date.now();
		const wsFolders = vscode.workspace.workspaceFolders ?? [];
		const totalFolders = wsFolders.length;

		// Clean up persisted projects whose files no longer exist
		const persistedProjects = util.getStorageData(this._context).projects;
		const persistedToRemove: typeof persistedProjects[0][] = [];
		for (const p of persistedProjects) {
			if (!fse.existsSync(p.path)) {
				persistedToRemove.push(p);
			}
		}
		if (persistedToRemove.length > 0) {
			const dashboardData = util.getStorageData(this._context);
			persistedToRemove.forEach(p => dashboardData.removeProject(p.path));
			await util.saveStorageData(this._context, dashboardData);
		}
		const validPersisted = persistedProjects.filter(p => !persistedToRemove.includes(p));

		// Per-folder discovery — run in parallel, fire tree after each folder completes
		const newProjectsMap: Map<string, LibertyProject> = new Map();
		const allEntries: ParsedBuildEntry[] = [];
		let foldersComplete = 0;

		await Promise.all(wsFolders.map(async (folder) => {
			const folderPath = folder.uri.fsPath;

			const [pomUris, gradleUris] = await Promise.all([
				vscode.workspace.findFiles(
					new vscode.RelativePattern(folder, "**/pom.xml"), EXCLUDED_DIR_PATTERN
				),
				vscode.workspace.findFiles(
					new vscode.RelativePattern(folder, "**/build.gradle"), EXCLUDED_DIR_PATTERN
				),
			]);
			const pomPaths = pomUris.map(u => u.fsPath);
			const gradlePaths = gradleUris.map(u => u.fsPath);

			// Merge persisted projects scoped to this folder
			for (const p of validPersisted) {
				if (!p.path.startsWith(folderPath)) { continue; }
				if (p.path.endsWith("pom.xml") && !pomPaths.includes(p.path)) {
					pomPaths.push(p.path);
				} else if (p.path.endsWith("build.gradle") && !gradlePaths.includes(p.path)) {
					gradlePaths.push(p.path);
				}
			}

			console.log(`[perf] folder ${folderPath} findFiles: ${Date.now() - t0}ms  (${pomPaths.length} pom, ${gradlePaths.length} gradle)`);

			const folderMap: Map<string, LibertyProject> = new Map();
			const { allEntries: folderEntries } = await this.discoverProjects(pomPaths, gradlePaths, folderMap);

			// Merge into shared map (JS single-thread guarantees no interleaving at Map.set)
			for (const [k, v] of folderMap) { newProjectsMap.set(k, v); }
			allEntries.push(...folderEntries);
			foldersComplete++;

			// Provisional roots — shells visible immediately, hierarchy wired after all folders complete
			this.projects = new Map(newProjectsMap);
			this.rootProjects = Array.from(newProjectsMap.values()).filter(p => !p.parent);

			if (foldersComplete < totalFolders) {
				this.setMessage(localize("scanning.workspace.folders", foldersComplete, totalFolders));
			}
			this._onDidChangeTreeData.fire(undefined);

			console.log(`[perf] folder ${folderPath} complete (${foldersComplete}/${totalFolders}): ${Date.now() - t0}ms`);
		}));

		// Fallback: server.xml-based project discovery
		await this.addServerXMLProjects(newProjectsMap);

		// Stamp: enrich shells with identity and classification — requires full cross-folder picture
		const { mavenMetadataMap, gradleMetadataMap } = await this.stampProjects(newProjectsMap, allEntries);

		// Link: wire parent/child relationships and compute roots — no I/O, no raw parsed content
		await this.linkProjects(newProjectsMap, mavenMetadataMap, gradleMetadataMap);
		console.log(`[perf] updateProjects total: ${Date.now() - t0}ms  (${newProjectsMap.size} projects, ${this.rootProjects.length} roots)`);

		this.projects = newProjectsMap;
	}
}

export class LibertyProject extends vscode.TreeItem {
	// New fields for multi-module hierarchy support
	public parent?: LibertyProject;
	public children: LibertyProject[] = [];
	public isAggregator: boolean = false;
	public isLibertyEnabled: boolean = false;
	public isDevMode: boolean = false;
	public artifactId: string = "";
	public parentArtifactId?: string;

	constructor(
		private _context: vscode.ExtensionContext,
		public label: string,
		public collapsibleState: vscode.TreeItemCollapsibleState,
		// tslint:disable-next-line: no-shadowed-variable
		public readonly path: string,
		public state: string,
		// valid context values are defined in src/definitions/constants.ts
		public contextValue: string,
		public terminal?: vscode.Terminal,
		public readonly command?: vscode.Command, // ? indicates optional param
		public terminalType?: string,
	) {
		super(label, collapsibleState);
		this.tooltip = this.path;
		this.children = [];
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

	public getState(): string {
		return `${this.state}`;
	}

	public setState(state: string): void {
		this.state = state;
	}

	public getPath(): string {
		return `${this.path}`;
	}

	public getContextValue(): string {
		return `${this.contextValue}`;
	}
	public setContextValue(contextValue: string): void {
		this.contextValue = contextValue;
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
			const terminal = vscode.window.createTerminal({ cwd: projectHome, name: this.label + " (liberty dev)", env: env, message: "" } as any);
			return terminal;
		}
		return undefined;
	}

	public deleteTerminal(): void {
		delete this.terminal;
	}

	public setExplorerIcon() {
		// Use helpers instead of exact string matching so all variants
		// (leaf, container, aggregator) resolve to the correct icon.
		if (isMaven(this.contextValue)) { return MAVEN_ICON; }
		if (isGradle(this.contextValue)) { return GRADLE_ICON; }
		return OL_LOGO_ICON;
	}
}

export async function createProject(context: vscode.ExtensionContext, buildFile: string, contextValue: string, xmlString?: string): Promise<LibertyProject> {
	let label = await getLabelFromBuildFile(buildFile, xmlString);
	const project: LibertyProject = new LibertyProject(context, label, vscode.TreeItemCollapsibleState.None, buildFile, "start", contextValue, undefined, /* {
		command: "extension.open.project",
		title: "",
		arguments: [buildFile],
	} */ undefined);
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