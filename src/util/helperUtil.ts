/**
 * Copyright (c) 2020, 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { DashboardData } from "./../liberty/dashboard";
import * as fs from "fs";
import * as vscode from "vscode";
import { LibertyProject } from "./../liberty/libertyProject";
import { COMMAND_AND_PROJECT_TYPE_MAP, LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY } from "../definitions/constants";


export async function getAllPaths(projectRootPath: string, pattern: string): Promise<string[]> {
	const fileUris: vscode.Uri[] = await vscode.workspace.findFiles(new vscode.RelativePattern(projectRootPath, pattern), "**/{bin,classes,target}/**");
	return fileUris.map((uri) => uri.fsPath);
}

export function getReport(report: string): string {
	const file = fs.readFileSync(report, "utf8");
	return file;
}

export function getConfiguration<T>(section: string, resourceOrFilepath?: vscode.Uri | string): T | undefined {
	let resource: vscode.Uri | undefined;
	if (typeof resourceOrFilepath === "string") {
		resource = vscode.Uri.file(resourceOrFilepath);
	} else if (resourceOrFilepath instanceof vscode.Uri) {
		resource = resourceOrFilepath;
	}
	return vscode.workspace.getConfiguration("liberty", resource).get<T>(section);
}

/**
 * Filters the projects by command.
 * @param projects The list of projects
 * @param commamnd The command to check
 * @returns a list of projects that the given command can be excuted on.
 */
export function filterProjects(projects: LibertyProject[], command: string): LibertyProject[] {
	const resultProjects: LibertyProject[] = [];
	for ( const project of projects) {
		const applicableTypes = COMMAND_AND_PROJECT_TYPE_MAP[command];
		if (applicableTypes.includes(project.getContextValue())) {
			resultProjects.push(project);
		}
	}
	return resultProjects;
}


/**
 * Gets the stored dashboard data.
 * @param context 
 * @returns 
 */
export function getStorageData(context: vscode.ExtensionContext): DashboardData {
	let data = context.workspaceState.get<DashboardData>(LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY, new DashboardData([], []));
	data = new DashboardData(data.projects, data.lastUsedStartParams);
	return data;
}
/**
 * Stores the dashboard data to workspace storage
 * @param context
 * @param dasboardData 
 */
export async function saveStorageData(context: vscode.ExtensionContext, dasboardData: DashboardData): Promise<void>{
	await context.workspaceState.update(LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY, dasboardData);
}
/**
 * clears the states saved in global state
 * @param context 
 */
export function clearDataSavedInGlobalState(context: vscode.ExtensionContext) {
	context.globalState.update('workspaceSaveInProgress', false);
	context.globalState.update('selectedProject', undefined);
}

