import * as vscode from 'vscode';
import * as fse from "fs-extra";
import * as util from './Util';

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
		var childrenMap: Map<string, String[]> = new Map();

		// check for parentPoms
		for (var pomPath of pomPaths) {
			const xmlString: string = await fse.readFile(pomPath, "utf8");
			var validParent = checkParentPom(xmlString);
			if (validParent) {
				childrenMap = new Map([...Array.from(childrenMap.entries()), ...Array.from(findModules(xmlString).entries())]);
				var project = createProject(xmlString, pomPath);
				projects.push(project);
				validPoms.push(pomPath);
			}
		}

		for (var pomPath of pomPaths) {
			if (!validPoms.includes(pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				var validPom = checkPom(xmlString, childrenMap);
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
			// configure terminal to use java.home if liberty.terminal.useJavaHome is true
			const useJavaHome: any = util.getConfiguration("terminal.useJavaHome");
			var env: { [envKey: string]: string } = {};
			if (useJavaHome) {
				const javaHome: string | undefined = vscode.workspace.getConfiguration("java").get<string>("home");
				if (javaHome) {
					env = {JAVA_HOME: javaHome };
				}
			}
			var terminal = vscode.window.createTerminal({name: this.label + " (liberty:dev)", env: env});
			return terminal;
		}
		return undefined;
	}
	contextValue = 'libertyProject';
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

// find modules listed in a parent pom
export function findModules(xmlString: String) {
	var parseString = require('xml2js').parseString;
	var childrenMap: Map<string, String[]> = new Map();
	var children: String[] = [];
	parseString(xmlString, function (err: any, result: any) {
		var artifactId = "";
		if (result.project.artifactId[0] !== undefined) {
			artifactId = result.project.artifactId[0];
		}
		var modules = result.project.modules;
		if (modules !== undefined && artifactId !== undefined) {
			for (var i = 0; i < modules.length; i++) {
				var module = modules[i].module;
				if (module !== undefined) {
					for (var k = 0; k < module.length; k++) {
						children.push(module[k]);
					}
				}
			}
		}

		if (children.length !== 0) {
			childrenMap.set(artifactId, children);
		}

		if (err) {
			console.error("Error parsing the pom " + err);
		}
	});
	return childrenMap;
}

// look for a valid parent pom.xml
export function checkParentPom(xmlString: String) {
	var parseString = require('xml2js').parseString;
	var parentPom = false;
	parseString(xmlString, function (err: any, result: any) {

		// check for liberty maven plugin or boost maven plugin in plugin management
		if (result.project.build !== undefined) {
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
										console.debug("Found liberty-maven-plugin in the pom.xml plugin management");
										parentPom = true;
									}
									if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
										console.debug("Found boost-maven-plugin in the pom.xml");
										parentPom = true;
									}
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

export function checkBuild(build: { plugins: { plugin: any; }[]; }[] | undefined) {
	if (build !== undefined) {
		for (var i = 0; i < build.length; i++) {
			var plugins = build[i].plugins;
			if (plugins !== undefined) {
				for (var j = 0; j < plugins.length; j++) {
					var plugin = build[i].plugins[j].plugin;
					if (plugin !== undefined) {
						for (var k = 0; k < plugin.length; k++) {
							if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
								console.debug("Found liberty-maven-plugin in the pom.xml");
								return true;
							}
							if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
								console.debug("Found boost-maven-plugin in the pom.xml");
								return true;
							}
						}
					}
				}
			}
		}
	}
}

export function checkPom(xmlString: String, childrenMap: Map<string, String[]>) {
	var parseString = require('xml2js').parseString;
	var validPom = false;
	parseString(xmlString, function (err: any, result: any) {

		// check if the artifactId matches one of the modules found in a parent pom
		if (result.project.artifactId[0] !== undefined && result.project.parent !== undefined && result.project.parent[0].artifactId !== undefined) {
			if (childrenMap.has(result.project.parent[0].artifactId[0])) {
				var modules = childrenMap.get(result.project.parent[0].artifactId[0]);
				if (modules !== undefined) {
					for (let module of modules) {
						if (module === result.project.artifactId[0]) {
							validPom = true;
							return;
						}
					}
				}
			}
		}

		// check for liberty maven plugin in profiles
		if (result.project.profiles !== undefined) {
			for (var i = 0; i < result.project.profiles.length; i++) {
				var profile = result.project.profiles[i].profile;
				if (profile !== undefined) {
					for(var j = 0; j < profile.length; j++) {
						if (checkBuild(profile[j].build)) {
							validPom = true;
							return;
						}
					}
				}
			}
		}

		// check for liberty maven plugin in plugins 
		if (checkBuild(result.project.build)) {
			validPom = true;
			return;
		}

		if (err) {
			console.error("Error parsing the pom " + err);
			return;
		}
	});
	return validPom;
}