/**
 * Copyright (c) 2020, 2025 IBM Corporation.
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
import path = require('path');


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

/**
 * Traverse upwards to check for target/build directory and its corresponding sibling build file (pom.xml or build.gradle).
 * @param filePath The path where the file is generated
 * @param projectRootParent parent path for the project root
 * @returns true if sibling file found, false otherwise.
 */
export async function checkSiblingFilesInTargetOrBuildParent(filePath: string, projectRootParent: string): Promise<boolean> {

	try {
		let currentDir = path.dirname(filePath);  // Start with the directory of the provided file
		let outputDir: string | undefined;
		let siblingFileType: string | undefined;

		// Determine the file type to look for (either pom.xml or build.gradle)
		if (filePath.endsWith('pom.xml')) {
			outputDir = 'target';  // For Maven projects, look for target directory
			siblingFileType = 'pom.xml';
		} else if (filePath.endsWith('build.gradle') || filePath.endsWith('settings.gradle')) {
			outputDir = 'build';  // For Gradle projects, look for build directory
			siblingFileType = 'build.gradle';
		} else {
			console.debug("Invalid file type. Only 'pom.xml' or 'build.gradle' or 'settings.gradle' are supported.");
			return false;
		}

		while (currentDir !== projectRootParent) { //checks upto and including the project root folder 
			let siblingFilePath = path.join(currentDir, siblingFileType);
			// Ensure that targetDir and siblingFilePath are assigned before proceeding
			if (!outputDir || !siblingFilePath) {
				console.error("Error: targetDir or siblingFilePath not properly assigned.");
				return false;
			}

			const foundSibling = await checkOutputDirAndSiblingBuildFile(currentDir, filePath, outputDir, siblingFilePath);
			if (foundSibling) {
				return true; // If sibling file is found, return true
			}
			// Move up the directory
			currentDir = path.dirname(currentDir);
		}

		// If no sibling file was found and we reached the project root, return false to allow refresh
		console.debug("Reached project root parent " + currentDir + " , no sibling build file found. Allowing refresh.");
		return false;
	} catch (err) {
		console.error('Error during directory traversal:', err);
		return false;
	}
}

/**
 * Checks if the specified output directory exists and whether a sibling build file (e.g., pom.xml or build.gradle) is present within that directory.
 * @param currentDir - The directory where we search for the output directory and build file.
 * @param filePath - Used for logging purposes to identify the file being processed.
 * @param outputDir - The name of the output directory (e.g., 'build' or 'target') to search for. 
 * @param siblingFilePath - path of the sibling build file we need to search for.
 * @returns Returns true if both the output directory and the sibling build file are found, otherwise false.
 */
async function checkOutputDirAndSiblingBuildFile(currentDir: string, filePath: string, outputDir: string, siblingFilePath: string): Promise<boolean> {
	try {
		const currentOutputDir = path.join(currentDir, outputDir);
		console.debug("Searching for output directory: " + currentOutputDir);
		// Check if the target/build directory exists
		if (fs.existsSync(currentOutputDir) && fs.statSync(currentOutputDir).isDirectory()) {
			console.debug("found " + currentOutputDir + " for:  " + filePath)
			console.debug("Searching for sibling build file: " + siblingFilePath);
			// Check if the expected sibling file (pom.xml or build.gradle) exists
			if (fs.existsSync(siblingFilePath) && fs.statSync(siblingFilePath).isFile()) {
				console.debug(`Found sibling ${siblingFilePath} in directory: ${currentOutputDir} for ${filePath}`);
				return true; // Found the sibling file, return true to indicate file should be ignored
			} else {
				console.debug(" sibling not found " + siblingFilePath + " for " + filePath);
			}
		} else{
			console.debug(currentOutputDir + " is not found");
		}
		return false; // No sibling file found
	} catch (err) {
		console.error('Error during directory traversal in checkSiblingFileInDir:', err);
		return false;
	}
}

