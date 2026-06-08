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
import { EXCLUDED_DIR_PATTERN, LIBERTY_GRADLE_PROJECT, LIBERTY_GRADLE_PROJECT_CONTAINER, LIBERTY_MAVEN_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, UNTITLED_WORKSPACE } from "../definitions/constants";
import { BuildFileImpl, GradleBuildFile } from "../util/buildFile";
import { DashboardData } from "./dashboard";
import { BaseLibertyProject } from "./baseLibertyProject";

const MAVEN_ICON = "maven-tag.png";
const GRADLE_ICON = "gradle-tag-1.png";
const OL_LOGO_ICON = "ol_logo.png";

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {
	public readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	private static instance: ProjectProvider;

	// tslint:disable-next-line: variable-name
	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;

	// Map of buildFilePath -> LibertyProject
	private projects: Map<string, LibertyProject> = new Map();
	
	// Root projects for hierarchical tree view
	private rootProjects: LibertyProject[] = [];

	private _context: vscode.ExtensionContext;

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
		if ( type !== undefined) {
			if ( fse.existsSync (path) && LIBERTY_MAVEN_PROJECT === type) {
				const xmlString = await fse.readFile(path, "utf8");
				project = await createProject(this._context, path, type, xmlString);
			} else if (fse.existsSync (path) && LIBERTY_GRADLE_PROJECT === type) {
				project = await createProject(this._context, path, LIBERTY_GRADLE_PROJECT);
			}
		} else {
			const pomFile = vscodePath.resolve(path, "pom.xml");
			
			if (fse.existsSync(pomFile)) {
				const xmlString = await fse.readFile(pomFile, "utf8");
				project = await createProject(this._context, pomFile, LIBERTY_MAVEN_PROJECT, xmlString);
			} else {
				const gradleFile = vscodePath.resolve(path, "build.gradle");
				if ( fse.existsSync (gradleFile)) {		
					project = await createProject(this._context, gradleFile, LIBERTY_GRADLE_PROJECT);	
				}
			}
		}
		return project;
	}

	/*
	 * Scan the specified folder, get a list of paths that contain a pom.xml or build.gradle file. Exclude the folders that already
	 * exist in the ProjectProvider class "projects" map.
	 * */
	public async getListOfMavenAndGradleFolders(path: string): Promise<string[]>{
		let uris: string[] = [];
		const pomPattern = new vscode.RelativePattern(path, "**/pom.xml");
		const gradlePattern = new vscode.RelativePattern(path, "**/build.gradle");
		let paths = (await vscode.workspace.findFiles(pomPattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		uris = uris.concat(paths);
		paths = (await vscode.workspace.findFiles(gradlePattern, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		uris = uris.concat(paths);
		const result: string[] = [];
		uris.forEach((uri)=> {
			if ( this.projects.has(uri) === false ) {
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
	public async addUserSelectedPath(path: string, existingProjects: Map<string, LibertyProject>): Promise<number>{
		let baseProject = undefined;
		const pomFile = vscodePath.resolve(path, "pom.xml");
		const gradleFile = vscodePath.resolve(path, "build.gradle");
		let returnCode = 0;
		if ( this.projects.has(pomFile) || this.projects.has(gradleFile)) {
			// project already exists
			returnCode = 1;
		} else {
			const project = await this.createLibertyProject(path, undefined);
			if ( project !== undefined ) {
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
		if ( fse.existsSync(pomFile) && dashboard.isPathExists(pomFile) ) {
			return pomFile;
		} else if ( fse.existsSync(gradleFile) && dashboard.isPathExists(gradleFile) ) {
			return gradleFile;
		}
		return undefined;
	}

	public removeInPersistedProjects(path: string): void {
		const dashboard: DashboardData = util.getStorageData(this._context);
		if( dashboard.isPathExists(path) ) {
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

	private async addPersistedProjects(): Promise<void>{
		const dashboardData = util.getStorageData(this._context);
		const projects = dashboardData.projects;
		const projectsToBeRemoved: BaseLibertyProject[] = [];
		for ( const p of projects) {
			// check if folder exists and has valid pom.xml or gradle build file.
			// User may shut down VSCode, delete projects/folders offline, then bring up
			// vscode, so these projects become obsolete
			const project = await this.createLibertyProject(p.path, p.contextValue);
			if ( project !== undefined) {
				this.projects.set(p.path, project);
				console.debug("Project " + p.path + " added to Liberty Tools");
			} else {
				// add to remove list
				projectsToBeRemoved.push(p);
			}
		}
		
		if ( projectsToBeRemoved.length > 0 ) {
			projectsToBeRemoved.forEach(function(element) {
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
		// update the map of projects
		const statusMessage = vscode.window.setStatusBarMessage(localize("refreshing.liberty.dashboard"));
		await this.updateProjects();
		await this.addPersistedProjects();
		// trigger a re-render of the tree view
		this._onDidChangeTreeData.fire(undefined);
		statusMessage.dispose();
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

	public getTreeItem(element: LibertyProject): vscode.TreeItem {
		// Set collapsible state based on whether project has children
		const collapsibleState = (element.isAggregator && element.children.length > 0)
			? vscode.TreeItemCollapsibleState.Collapsed
			: vscode.TreeItemCollapsibleState.None;
		
		// Update the element's collapsible state by creating a new TreeItem
		const treeItem = new vscode.TreeItem(element.label, collapsibleState);
		treeItem.tooltip = element.tooltip;
		treeItem.iconPath = element.iconPath;
		treeItem.contextValue = element.contextValue;
		treeItem.command = element.command;
		
		return treeItem;
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
		* Execute a command on a project, with delegation to children if it's an aggregator
	 * @param project The project to execute the command on
	 * @param commandName The command name for display purposes
	 * @returns The target project to execute on, or undefined if cancelled
	 */
	public async resolveCommandTarget(project: LibertyProject, commandName: string): Promise<LibertyProject | undefined> {
		// Check if project is an aggregator FIRST (before checking if Liberty-enabled)
		// An aggregator with children should delegate to children, not execute directly
		if (project.isAggregator && project.children.length > 0) {
			const libertyChildren = this.findLibertyDescendants(project);
			
			if (libertyChildren.length === 0) {
				vscode.window.showWarningMessage(
					localize("no.liberty.modules.found", `No Liberty-enabled modules found in ${project.label}`)
				);
				return undefined;
			}
			
			if (libertyChildren.length === 1) {
				// Only one Liberty child, execute automatically
				return libertyChildren[0];
			}
			
			// Multiple children - show notification with buttons
			const buttonLabels = libertyChildren.map(c => c.label);
			const selected = await vscode.window.showInformationMessage(
				localize("select.module.for.command", commandName),
				...buttonLabels
			);
			
			if (!selected) {
				return undefined;
			}
			
			// Find the project that matches the selected button
			return libertyChildren.find(c => c.label === selected);
		}
		
		// If we get here, check if it's a Liberty-enabled leaf project (not an aggregator)
		if (project.isLibertyEnabled) {
			return project;
		}
		
		// Not Liberty-enabled and not an aggregator
		vscode.window.showWarningMessage(
			localize("project.not.liberty.enabled", `${project.label} is not Liberty-enabled`)
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


	// Given a list of pom.xml files, find ones that are valid to use with liberty dev-mode
	private async findValidPOMs(pomPaths: string[]): Promise<BuildFileImpl[]> {
		// [pom, liberty project type]
		const validPoms: BuildFileImpl[] = [];
		let mavenChildMap: Map<string, string[]> = new Map();

		// check for parentPoms
		for (const parentPom of pomPaths) {
			const xmlString: string = await fse.readFile(parentPom, "utf8");
			const validParent: BuildFileImpl = mavenUtil.validParentPom(xmlString);
			if (validParent.isValidBuildFile()) {
				// mavenChildMap: [parentName, array of child names]
				mavenChildMap = new Map([...Array.from(mavenChildMap.entries()), ...Array.from(mavenUtil.findChildMavenModules(xmlString).entries())]);
				validParent.setBuildFilePath(parentPom);
				validPoms.push(validParent);
			}
		}

		// check poms
		for (const pomPath of pomPaths) {
			if (!validPoms.some(mavenPom => mavenPom["buildFilePath"] === pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				const validPom: BuildFileImpl = mavenUtil.validPom(xmlString, mavenChildMap);
				if (validPom.isValidBuildFile()) {
					validPom.setBuildFilePath(pomPath);
					validPoms.push(validPom);
				}
			}
		}
		return validPoms;
	}

	// Given a list of build.gradle files, find ones that are valid to use with liberty dev-mode
	private async findValidGradleBuildFiles(gradlePaths: string[]): Promise<BuildFileImpl[]> {
		// [gradle path, liberty project type]
		const validGradleBuildFiles: BuildFileImpl[] = [];
		let gradleChildren: string[] = [];
		const visitedPaths: Set<string> = new Set();

		// check for multi module build.gradles
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const g2js = require("gradle-to-js/lib/parser");
		for (const gradlePath of gradlePaths) {
			await g2js.parseFile(gradlePath).then(async (buildFile: any) => {
				const gradleSettings = gradleUtil.getGradleSettings(gradlePath);
				if (gradleSettings !== "") {
					await g2js.parseFile(gradleSettings).then(async (settingsFile: any) => {
						const gradleBuildFile: GradleBuildFile = gradleUtil.findChildGradleProjects(buildFile, settingsFile, gradlePath);
						if (gradleBuildFile.getChildren().length !== 0) {
							gradleChildren.push(...gradleBuildFile.getChildren());
							const gradleParent: GradleBuildFile = new GradleBuildFile(true, gradleBuildFile.getProjectType());
							gradleParent.setBuildFilePath(gradlePath);
							validGradleBuildFiles.push(gradleParent);
							visitedPaths.add(gradlePath);
						}
					}).catch((err: any) => console.error(localize("unable.to.parse.settings.gradle", gradleSettings, err)));
				}
			}).catch((err: any) => console.error(localize("unable.to.parse.build.gradle", gradlePath, err)));
		}

		// check build.gradles
		for (const gradlePath of gradlePaths) {
			// Skip if already processed as a parent
			if (visitedPaths.has(gradlePath)) {
				continue;
			}
			
			await g2js.parseFile(gradlePath).then(async (buildFile: any) => {
				const dirName = vscodePath.dirname(gradlePath);
				const label = vscodePath.basename(dirName);

				const gradleBuild: BuildFileImpl = gradleUtil.validGradleBuild(buildFile, gradlePath);
				
				// check build.gradle matches any of the subprojects in the gradleChildMap or for liberty-gradle-plugin
				if (gradleChildren.includes(label)) {
					// This is a child module - validate it for inclusion using utility function
					const shouldInclude = await gradleUtil.validateGradleChildModule(gradleBuild, buildFile, gradlePath, visitedPaths);
					if (shouldInclude) {
						gradleBuild.setBuildFilePath(gradlePath);
						validGradleBuildFiles.push(gradleBuild);
						visitedPaths.add(gradlePath);
					}
				} else {
					// Not a child module - only include if it has Liberty plugin
					if (gradleBuild.hasLibertyPlugin()) {
						gradleBuild.setBuildFilePath(gradlePath);
						validGradleBuildFiles.push(gradleBuild);
						visitedPaths.add(gradlePath);
					}
				}
			}).catch((err: any) => console.error(localize("unable.to.parse.build.gradle", gradlePath, err)));
		}
		return validGradleBuildFiles;
	}

	public projectRootPathExists(path: string, keys: Iterable<string>): boolean {
		for (const existingPath of keys) {
			if ( vscodePath.dirname(existingPath) === path) {
				return true;
			}
        }
		return false;
	}

	/**
	 * Checks if given build file exists in existing project map (<code>this.projects</code>).
	 * If it exists, then the corresponding liberty project will be added to the given 
	 * <code>projectsMap</code>.
	 * 
	 * @param buildFilePath The build file to check (full path to pom.xml or build.gradle)
	 * @param projectType Project type
	 * @param projectsMap Existing projects.
	 * @returns 
	 */
	private async addExistingProjectToNewProjectsMap (buildFilePath: string, projectType: string, projectsMap: Map<string, LibertyProject> ): Promise<boolean> {
		let added = false;
		if (this.projects.has(buildFilePath)) {
			const project = this.projects.get(buildFilePath);
			if (project !== undefined) {
				if (project.contextValue !== projectType) {
					project.setContextValue(projectType);
				}
				let newLabel = undefined;
				// checking the projectType for a gradle project first, then checking for a maven project
				if ( projectType == LIBERTY_GRADLE_PROJECT || projectType == LIBERTY_GRADLE_PROJECT_CONTAINER ) {
					newLabel = await getLabelFromBuildFile(buildFilePath);
				} else if ( projectType == LIBERTY_MAVEN_PROJECT || projectType == LIBERTY_MAVEN_PROJECT_CONTAINER ) {
					const xmlString = await fse.readFile(buildFilePath, "utf8");
					newLabel = await getLabelFromBuildFile(buildFilePath, xmlString);
				}
				if ( newLabel !== undefined && project.getLabel() !==  newLabel ) {
					project.setLabel(newLabel);
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				projectsMap.set(buildFilePath, this.projects.get(buildFilePath)!);
				added = true;
			}
		}
		return added;
	}	
	/**
	 * Build hierarchical relationships between projects based on metadata
	 * @param projectsMap Map of all projects
	 */
	private async buildHierarchy(projectsMap: Map<string, LibertyProject>): Promise<void> {
		const mavenProjectsByArtifactId = new Map<string, LibertyProject>();
		const gradleProjectsByName = new Map<string, LibertyProject>();
		const mavenMetadataMap = new Map<string, mavenUtil.MavenProjectMetadata>();
		
		// First pass: populate metadata for all projects
		for (const [buildFilePath, project] of projectsMap.entries()) {
			try {
				if (buildFilePath.endsWith("pom.xml")) {
					const xmlString = await fse.readFile(buildFilePath, "utf8");
					const metadata = await mavenUtil.extractMavenMetadata(buildFilePath, xmlString);
					project.artifactId = metadata.artifactId;
					project.parentArtifactId = metadata.parentArtifactId;
					project.isAggregator = metadata.isAggregator;
					project.isLibertyEnabled = metadata.isLibertyEnabled;
					mavenProjectsByArtifactId.set(metadata.artifactId, project);
					mavenMetadataMap.set(buildFilePath, metadata);
				} else if (buildFilePath.endsWith("build.gradle")) {
					const metadata = await gradleUtil.extractGradleMetadata(buildFilePath);
					project.artifactId = metadata.projectName;
					project.parentArtifactId = metadata.parentProjectName;
					project.isAggregator = metadata.isAggregator;
					project.isLibertyEnabled = metadata.isLibertyEnabled;
					gradleProjectsByName.set(metadata.projectName, project);
				}
			} catch (error) {
				console.error(`Error extracting metadata for ${buildFilePath}:`, error);
				project.isLibertyEnabled = true;
			}
		}
		
		// Second pass: build parent-child relationships
		// Strategy 1: Use parentArtifactId if available (standard Maven with <parent> element)
		for (const project of projectsMap.values()) {
			if (project.parentArtifactId) {
				// Look up parent in the appropriate map based on build tool
				const parent = project.path.endsWith("pom.xml")
					? mavenProjectsByArtifactId.get(project.parentArtifactId)
					: gradleProjectsByName.get(project.parentArtifactId);
				
				if (parent) {
					project.parent = parent;
					if (!parent.children.includes(project)) {
						parent.children.push(project);
					}
				}
			}
		}
		
		// Strategy 2: For Maven projects without parent links, use filesystem paths + module declarations
		// This handles multimodule projects where child POMs don't have <parent> elements
		for (const [parentPath, parentMetadata] of mavenMetadataMap.entries()) {
			if (parentMetadata.isAggregator && parentMetadata.modules.length > 0) {
				const parentProject = projectsMap.get(parentPath);
				if (!parentProject) continue;
				
				const parentDir = vscodePath.dirname(parentPath);
				
				// For each module declared in parent's <modules> section
				for (const moduleName of parentMetadata.modules) {
					// Resolve the module path relative to parent
					const modulePomPath = vscodePath.resolve(parentDir, moduleName, "pom.xml");
					
					// Check if this module exists in our discovered projects
					const childProject = projectsMap.get(modulePomPath);
					if (childProject && !childProject.parent) {
						// Link child to parent
						childProject.parent = parentProject;
						if (!parentProject.children.includes(childProject)) {
							parentProject.children.push(childProject);
						}
						console.debug(`Linked module ${moduleName} to parent ${parentMetadata.artifactId} via filesystem path`);
					}
				}
			}
		}
		
		// Third pass: identify root projects (no parent or parent not in workspace)
		this.rootProjects = Array.from(projectsMap.values())
			.filter(p => !p.parent)
			.filter(p => p.isLibertyEnabled || this.hasLibertyDescendants(p));
	}
	
	
	private async updateProjects(): Promise<void> {
		// find all build files in the open workspace and find all the ones that are valid for dev-mode
		
		const pomPaths = (await vscode.workspace.findFiles("**/pom.xml", EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		const gradlePaths = (await vscode.workspace.findFiles("**/build.gradle", EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		const validPoms: BuildFileImpl[] = await this.findValidPOMs(pomPaths);
		const validGradleBuilds: BuildFileImpl[] = await this.findValidGradleBuildFiles(gradlePaths);
		let serverXMLPaths: string[] = [];
		
		// map of buildFilePath -> LibertyProject
		const newProjectsMap: Map<string, LibertyProject> = new Map();
		for (const pom of validPoms) {
			// if a LibertyProject for this pom has already been created
			// we want to re-use it since it stores state such as the terminal being used for dev-mode
			if ( !await this.addExistingProjectToNewProjectsMap(pom.getBuildFilePath(), pom.getProjectType(),
					newProjectsMap) ) {
				const xmlString = await fse.readFile(pom.getBuildFilePath(), "utf8");
				const project = await createProject(this._context, pom.getBuildFilePath(), pom.getProjectType(), xmlString);
				newProjectsMap.set(pom.getBuildFilePath(), project);
			}
		}
		
		for (const gradleBuild of validGradleBuilds) {
			console.log(`[DEBUG] Processing Gradle build: ${gradleBuild.getBuildFilePath()}, type: ${gradleBuild.getProjectType()}`);
			// if a LibertyProject for this build.gradle has already been created
			// we want to re-use it
			if ( !await this.addExistingProjectToNewProjectsMap(gradleBuild.getBuildFilePath(), gradleBuild.getProjectType(),
					newProjectsMap) ) {
				const project = await createProject(this._context, gradleBuild.getBuildFilePath(), gradleBuild.getProjectType());
				newProjectsMap.set(gradleBuild.getBuildFilePath(), project);
				console.log(`[DEBUG] Added Gradle project to map: ${gradleBuild.getBuildFilePath()}`);
			}
		}

		const wsFolders = vscode.workspace.workspaceFolders;
		if ( wsFolders ) {
			for ( const folder of wsFolders ) {
				const path = folder.uri.fsPath;
				if ( this.projectRootPathExists(path, newProjectsMap.keys() ) === false ) {
					const includeRelativePath = new vscode.RelativePattern(path, "**/src/main/liberty/config/server.xml");
					const paths = (await vscode.workspace.findFiles(includeRelativePath, EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
					serverXMLPaths = serverXMLPaths.concat(paths);
				}
			}
		}

		/* 
		 * Find the projects by server.xml.
		 * This method assumes if pom.xml is under project root, then the server.xml is in
		 * ./src/main/liberty/config/server.xml
		 */
		for (const serverXML of serverXMLPaths) {
			const folder = vscodePath.parse(vscodePath.resolve(serverXML, "../../../../")).dir;
			const pomFile = vscodePath.resolve(folder, "pom.xml");

			if (fse.existsSync(pomFile) && !newProjectsMap.has(pomFile)) {
				if (!await this.addExistingProjectToNewProjectsMap(pomFile, LIBERTY_MAVEN_PROJECT, newProjectsMap)) {
					const xmlString = await fse.readFile(pomFile, "utf8");
					const project = await createProject(this._context, pomFile, LIBERTY_MAVEN_PROJECT, xmlString);
					newProjectsMap.set(pomFile, project);
				}
			} else {
				const gradleFile = vscodePath.resolve(folder, "build.gradle");
				if (fse.existsSync(gradleFile) && !newProjectsMap.has(gradleFile)) {
					if (!await this.addExistingProjectToNewProjectsMap(gradleFile, LIBERTY_GRADLE_PROJECT, newProjectsMap)) {
						const project = await createProject(this._context, gradleFile, LIBERTY_GRADLE_PROJECT);
						newProjectsMap.set(gradleFile, project);
					}
				}
			}
		}
		console.log(`[DEBUG] Total projects in map: ${newProjectsMap.size}`);
		for (const [path, proj] of newProjectsMap.entries()) {
			console.log(`[DEBUG] Project: ${proj.label} at ${path}`);
		}
		
		this.projects = newProjectsMap;
		
		// Build hierarchical relationships between projects
		await this.buildHierarchy(newProjectsMap);
		
		console.log(`[DEBUG] Root projects after hierarchy: ${this.rootProjects.length}`);
		for (const root of this.rootProjects) {
			console.log(`[DEBUG] Root: ${root.label}, isAggregator: ${root.isAggregator}, isLibertyEnabled: ${root.isLibertyEnabled}, children: ${root.children.length}`);
		}
	}
}

export class LibertyProject extends vscode.TreeItem {
	// New fields for multi-module hierarchy support
	public parent?: LibertyProject;
	public children: LibertyProject[] = [];
	public isAggregator: boolean = false;
	public isLibertyEnabled: boolean = false;
	public artifactId: string = "";
	public parentArtifactId?: string;

	constructor(
		private _context: vscode.ExtensionContext,
		public label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
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
			const terminal = vscode.window.createTerminal({cwd: projectHome, name: this.label + " (liberty dev)", env:env });
			return terminal;
		}
		return undefined;
	}

	public deleteTerminal(): void {
		delete this.terminal;
	}

	public setExplorerIcon() {
		const iconRecord: Record<string, string> = {};
		iconRecord[LIBERTY_MAVEN_PROJECT] = MAVEN_ICON;
		iconRecord[LIBERTY_MAVEN_PROJECT_CONTAINER] = MAVEN_ICON;
		iconRecord[LIBERTY_GRADLE_PROJECT] = GRADLE_ICON;
		iconRecord[LIBERTY_GRADLE_PROJECT_CONTAINER] = GRADLE_ICON;
		
		return (this.contextValue in iconRecord) ? iconRecord[this.contextValue] : OL_LOGO_ICON;
	}
}

export async function createProject(context: vscode.ExtensionContext, buildFile: string, contextValue: string, xmlString?: string): Promise<LibertyProject> {
	let label = await getLabelFromBuildFile(buildFile, xmlString);
	const project: LibertyProject = new LibertyProject(context, label, vscode.TreeItemCollapsibleState.None, buildFile, "start", contextValue, undefined, {
		command: "extension.open.project",
		title: "",
		arguments: [buildFile],
	});
	return project;
}

export async function getLabelFromBuildFile( buildFile: string, xmlString?: string): Promise<string> {
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