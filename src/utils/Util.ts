import * as vscode from 'vscode';
import * as fs from 'fs';

export async function getAllPomPaths(workspaceFolder: vscode.WorkspaceFolder):Promise<string[]> {
	const pattern: string = "**/pom.xml";
	const pomFileUris: vscode.Uri[] = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, pattern));
	return pomFileUris.map(_uri => _uri.fsPath);
}

export function getReport(report: string) {
    var file = fs.readFileSync(report, 'utf8');
    return file;
}
