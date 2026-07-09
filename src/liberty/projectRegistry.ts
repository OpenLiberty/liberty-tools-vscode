/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as fse from "fs-extra";
import * as vscodePath from "path";
import * as vscode from "vscode";
import * as util from "../util/helperUtil";
import { EXCLUDED_DIR_PATTERN } from "../definitions/constants";
import { DashboardData } from "./dashboard";
import { BaseLibertyProject } from "./baseLibertyProject";
import { LibertyProject, createProject } from "./libertyProject";
import { createLibertyProjectFromPath } from "./projectDiscovery";

/**
 * Singleton registry: single source of truth for discovered LibertyProject objects.
 * Provides data to ProjectTreeProvider
 */
export class ProjectRegistry {
	private static instance: ProjectRegistry;

	private _context: vscode.ExtensionContext;

	// Map of <buildFilePath -> LibertyProject>
	private _projects: Map<string, LibertyProject> = new Map();

	private _rootProjects: LibertyProject[] = [];

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
	}

	public static getInstance(): ProjectRegistry {
		return ProjectRegistry.instance;
	}

	public static setInstance(registry: ProjectRegistry): void {
		ProjectRegistry.instance = registry;
	}

	public getContext(): vscode.ExtensionContext {
		return this._context;
	}

	public getProjects(): Map<string, LibertyProject> {
		return this._projects;
	}

	public setProjects(projects: Map<string, LibertyProject>): void {
		this._projects = projects;
	}

	public getRootProjects(): LibertyProject[] {
		return this._rootProjects;
	}

	public setRootProjects(rootProjects: LibertyProject[]): void {
		this._rootProjects = rootProjects;
	}

	public getUserAddedProjects(): BaseLibertyProject[] {
		return util.getStorageData(this._context).projects;
	}

	/**
	 * Scan the given path for pom.xml/build.gradle files not already in the registry.
	 */
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
			if (this._projects.has(uri) === false) {
				result.push(vscodePath.dirname(uri));
			}
		});
		return result;
	}

	/**
	 * Adds a user-selected project path to the registry and persists it.
	 * Returns: 0 = success, 1 = already exists, 2 = not a Maven/Gradle project.
	 */
	public async addUserSelectedPath(path: string, existingProjects: Map<string, LibertyProject>): Promise<number> {
		const pomFile = vscodePath.resolve(path, "pom.xml");
		const gradleFile = vscodePath.resolve(path, "build.gradle");
		if (this._projects.has(pomFile) || this._projects.has(gradleFile)) {
			return 1;
		}
		const project = await createLibertyProjectFromPath(this._context, path, undefined, existingProjects);
		if (project !== undefined) {
			existingProjects.set(project.getPath(), project);
			const baseProject = new BaseLibertyProject(project.getLabel(), project.getPath(), project.getContextValue());
			const dashboardData: DashboardData = util.getStorageData(this._context);
			dashboardData.addProjectToManualProjects(baseProject);
			await util.saveStorageData(this._context, dashboardData);
			return 0;
		}
		return 2;
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
			dashboard.removeProject(path);
			util.saveStorageData(this._context, dashboard);
			this._projects.delete(path);
		}
	}

	/**
	 * Find all Liberty-enabled descendants of a project
	 */
	public findLibertyDescendants(project: LibertyProject): LibertyProject[] {
		const descendants: LibertyProject[] = [];
		for (const child of project.children) {
			if (child.isLibertyEnabled) {
				descendants.push(child);
			}
			descendants.push(...this.findLibertyDescendants(child));
		}
		return descendants;
	}

	/**
	 * Load persisted (manually-added) projects into the registry.
	 */
	public async loadPersistedProjects(): Promise<void> {
		const dashboardData = util.getStorageData(this._context);
		const projects = dashboardData.projects;
		const projectsToBeRemoved: BaseLibertyProject[] = [];
		for (const p of projects) {
			const project = await createLibertyProjectFromPath(this._context, p.path, p.contextValue, this._projects);
			if (project !== undefined) {
				this._projects.set(p.path, project);
				console.debug("Project " + p.path + " added to Liberty Tools");
			} else {
				projectsToBeRemoved.push(p);
			}
		}
		if (projectsToBeRemoved.length > 0) {
			projectsToBeRemoved.forEach(function (element) {
				dashboardData.removeProject(element.path);
			});
			await util.saveStorageData(this._context, dashboardData);
		}
	}
}
