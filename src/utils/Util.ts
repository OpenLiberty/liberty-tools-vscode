import * as fs from "fs";
import * as vscode from "vscode";

export async function getAllPaths(workspaceFolder: vscode.WorkspaceFolder, pattern: string): Promise<string[]> {
	const fileUris: vscode.Uri[] = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, pattern), "**/{bin,classes,target}/**");
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
