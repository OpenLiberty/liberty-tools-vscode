import * as vscode from 'vscode';
import * as fs from 'fs';

export function getAllPomPaths(workspaceFolder: vscode.WorkspaceFolder): string[] {
	const fs = require('fs');
	const pomFileUris: string[] = [];

	fs.readdirSync(workspaceFolder.uri.fsPath).forEach((file: string) => {
		if (file === "pom.xml") {
			pomFileUris.push(workspaceFolder.uri.fsPath + '/' + file);
		}
	});
	
	return pomFileUris;

}

export function getReport(report: string) {
    var file = fs.readFileSync(report, 'utf8');
    return file;
}
