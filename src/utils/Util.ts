import * as vscode from 'vscode';
import * as fs from 'fs';

export async function getAllPaths(workspaceFolder: vscode.WorkspaceFolder, pattern: string) : Promise<string[]> {
	const pomFileUris: vscode.Uri[] = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, pattern));
	return pomFileUris.map(_uri => _uri.fsPath);
}

export function getReport(report: string) {
	var file = fs.readFileSync(report, 'utf8');
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
