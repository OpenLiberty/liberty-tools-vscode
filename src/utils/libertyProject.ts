import * as vscode from 'vscode';
import * as fse from "fs-extra";

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {

	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;
	readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	constructor(private workspaceRoot: string, private pomPaths: string[]) {
		this._onDidChangeTreeData = new vscode.EventEmitter<LibertyProject | undefined>();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.refresh();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: LibertyProject): vscode.TreeItem {
		return element;
	}

	getChildren(element?: LibertyProject): Thenable<LibertyProject[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage("No maven project found in empty workspace");
			return Promise.resolve([]);
		}
		return Promise.resolve(this.getProjectFromPom(this.pomPaths));
	}

	private async getProjectFromPom(pomPaths: string[]): Promise<LibertyProject[]> {
		var projects: LibertyProject[] = [];
		var validPoms: String[] = [];
		var modules: String[] = [];

		// check for parentPoms
		for (var pomPath of pomPaths) {
			const xmlString: string = await fse.readFile(pomPath, "utf8");
			var validParent = checkParentPom(xmlString);
			if (validParent) {
				modules = modules.concat(findModules(xmlString));
				var project = createProject(xmlString, pomPath);
				projects.push(project);
				validPoms.push(pomPath);
			}
		}

		for (var pomPath of pomPaths) {
			if (!validPoms.includes(pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				var validPom = checkPom(xmlString, modules);
				if (validPom) {
					var project = createProject(xmlString, pomPath);
					projects.push(project);
				}
			}

		}

		return projects;
	}
}


export class LibertyProject extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly pomPath: string,
		public state: string,
		public terminal?: vscode.Terminal,
		public readonly command?: vscode.Command, // ? indicates optional param
	) {
		super(label, collapsibleState);
	}

	public get iconPath(): string {
		let path = require('path');
		var iconPath = path.join(__dirname, '..', '..', 'images', 'ol_logo.png');
		return iconPath;
	}

	public getLabel(): string {
		return `${this.label}`;
	}

	public getState(): string {
		return `${this.state}`;
	}

	public setState(state: string): void {
		this.state = state;
	}

	public getPomPath(): string {
		return `${this.pomPath}`;
	}

	public getTerminal(): vscode.Terminal | undefined {
		return this.terminal;
	}

	public setTerminal(terminal: vscode.Terminal): void {
		this.terminal = terminal;
	}

	public createTerminal(): vscode.Terminal | undefined {
		if (this.terminal === undefined) {
			var terminal = vscode.window.createTerminal(this.label + " (liberty:dev)");
			return terminal;
		}
		return undefined;
	}
	contextValue = 'liberty-dev-project';
}

export function createProject(xmlString: String, pomPath: string) {
	var label = "";
	var parseString = require('xml2js').parseString;
	parseString(xmlString, function (err: any, result: any) {
		label = result.project.artifactId[0];
	});
	var project: LibertyProject = new LibertyProject(label, vscode.TreeItemCollapsibleState.None, pomPath, 'start', undefined, {
		command: 'extension.open.project',
		title: '',
		arguments: [pomPath]
	});
	return project;
}
export function findModules(xmlString: String) {
	var parseString = require('xml2js').parseString;
	var children: String[] = [];
	parseString(xmlString, function (err: any, result: any) {
		var modules = result.project.modules;
		if (modules !== undefined) {
			for (var i = 0; i < modules.length; i++) {
				var module = modules[i].module;
				if (module !== undefined) {
					for (var k = 0; k < module.length; k++) {
						children.push(module[k]);
					}
				}
			}
		}

		if (err) {
			console.error("Error parsing the pom " + err);
		}
	});
	return children;
}
export function checkParentPom(xmlString: String) {
	var parseString = require('xml2js').parseString;
	var parentPom = false;
	parseString(xmlString, function (err: any, result: any) {
		// check for open liberty or wlp boost runtime	
		if (result.project.dependencies !== undefined) {
			for (var ii = 0; ii < result.project.dependencies.length; ii++) {
				for (var jj = 0; jj < result.project.dependencies[ii].dependency.length; jj++) {
					var dependency = result.project.dependencies[ii].dependency[jj];
					if (dependency.groupId[0] === "boost.runtimes" && (dependency.artifactId[0] === "openliberty" || dependency.artifactId[0] === "wlp")) {
						console.debug("Found openliberty or wlp boost runtime in the pom");
						parentPom = true;
						return;
					}
				}
			}
		}

		// check for liberty maven plugin in plugin management
		for (var i = 0; i < result.project.build.length; i++) {
			var pluginManagement = result.project.build[i].pluginManagement;
			if (pluginManagement !== undefined) {
				var plugins = pluginManagement[i].plugins;
				if (plugins !== undefined) {
					for (var j = 0; j < plugins.length; j++) {
						var plugin = plugins[j].plugin;
						if (plugin !== undefined) {
							for (var k = 0; k < plugin.length; k++) {
								if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] == "io.openliberty.tools") {
									console.debug("Found liberty-maven-plugin in the pom plugin management");
									parentPom = true;
								}
							}
						}
					}
				}
			}
		}
		if (err) {
			console.error("Error parsing the pom " + err);
		}
	});
	return parentPom;
}

export function checkPom(xmlString: String, modules: String[]) {
	var parseString = require('xml2js').parseString;
	var validPom = false;
	parseString(xmlString, function (err: any, result: any) {
		if (result.project.artifactId[0] !== undefined && modules.includes(result.project.artifactId[0])) {
			validPom = true;
			return;
		}
		// check for open liberty or wlp boost runtime	
		if (result.project.dependencies !== undefined) {
			for (var ii = 0; ii < result.project.dependencies.length; ii++) {
				for (var jj = 0; jj < result.project.dependencies[ii].dependency.length; jj++) {
					var dependency = result.project.dependencies[ii].dependency[jj];
					if (dependency.groupId[0] === "boost.runtimes" && (dependency.artifactId[0] === "openliberty" || dependency.artifactId[0] === "wlp")) {
						console.debug("Found openliberty or wlp boost runtime in the pom");
						validPom = true;
						return;
					}
				}
			}
		}

		// check for liberty maven plugin
		for (var i = 0; i < result.project.build.length; i++) {
			var plugins = result.project.build[i].plugins;
			if (plugins !== undefined) {
				for (var j = 0; j < plugins.length; j++) {
					var plugin = result.project.build[i].plugins[j].plugin;
					if (plugin !== undefined) {
						for (var k = 0; k < plugin.length; k++) {
							console.debug(plugin[k]);
							if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] == "io.openliberty.tools") {
								console.debug("Found liberty-maven-plugin in the pom");
								validPom = true; // no version specified, latest version downloaded from maven central
								return;
							}
						}
					}
				}
			}
		}

		if (err) {
			console.error("Error parsing the pom " + err);
			return;
		}
	});
	return validPom;
}