import * as vscode from 'vscode';
import * as fse from "fs-extra";
import * as util from './Util';
import * as path from 'path';
import * as mavenUtil from './MavenUtil';
import * as gradleUtil from './GradleUtil';

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {

	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;
	readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	constructor(private workspaceFolders: vscode.WorkspaceFolder[], private pomPaths: string[], private gradlePaths: string[]) {
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
		if (this.workspaceFolders == undefined) {
			vscode.window.showInformationMessage("No Liberty project found in empty workspace");
			return Promise.resolve([]);
		}
		return Promise.resolve(this.getProjectFromBuildFile(this.pomPaths, this.gradlePaths));
	}

	private async getProjectFromBuildFile(pomPaths: string[], gradlePaths: string[]): Promise<LibertyProject[]> {
		var projects: LibertyProject[] = [];
		var validPoms: String[] = [];
		var mavenChildMap: Map<string, String[]> = new Map();
		var gradleChildren: Array<string> = new Array();

		// check for parentPoms
		for (var parentPom of pomPaths) {
			const xmlString: string = await fse.readFile(parentPom, "utf8");
			var validParent = mavenUtil.validParentPom(xmlString);
			if (validParent) {
				// mavenChildMap: [parentName, array of child names]
				mavenChildMap = new Map([...Array.from(mavenChildMap.entries()), ...Array.from(mavenUtil.findChildMavenModules(xmlString).entries())]);
				var project = createProject(parentPom, 'libertyMavenProject', xmlString);
				projects.push(await project);
				validPoms.push(parentPom);
			}
		}

		// check poms
		for (var pomPath of pomPaths) {
			if (!validPoms.includes(pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				var validPom = mavenUtil.validPom(xmlString, mavenChildMap);
				if (validPom) {
					var project = createProject(pomPath, 'libertyMavenProject', xmlString);
					projects.push(await project);
				}
			}

		}

		// check for multi module build.gradles
		var g2js = require('gradle-to-js/lib/parser');
		for (var gradlePath of gradlePaths) {
			await g2js.parseFile(gradlePath).then(async function (buildFile: any) {
				var gradleSettings = gradleUtil.getGradleSettings(gradlePath);
				if (gradleSettings !== "") {
					await g2js.parseFile(gradleSettings).then(async function (settingsFile: any) {
						let children = gradleUtil.findChildGradleProjects(buildFile, settingsFile);
						if (children.length !== 0) {
							gradleChildren = gradleChildren.concat(children);
							var project = createProject(gradlePath, 'libertyGradleProject');
							projects.push(await project);
						}
					}).catch((err: any) => console.error("Unable to parse settings.gradle: " + gradleSettings + "; " + err));
				}
			}).catch((err: any) => console.error("Unable to parse build.gradle: " + gradlePath + "; " + err));
		}

		// check build.gradles
		for (var gradlePath of gradlePaths) {
			await g2js.parseFile(gradlePath).then(async function (buildFile: any) {
				var dirName = path.dirname(gradlePath);
				var label = path.basename(dirName);
				// check build.gradle matches any of the subprojects in the gradleChildMap or for liberty-gradle-plugin
				if (gradleChildren.includes(label) || gradleUtil.validGradleBuild(buildFile)) {
					var project = createProject(gradlePath, 'libertyGradleProject');
					projects.push(await project);
				}
			}).catch((err: any) => console.error("Unable to parse build.gradle: " + gradlePath + "; " + err));
		}
		return projects;
	}
}


export class LibertyProject extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly path: string,
		public state: string,
		public contextValue: string,
		public terminal?: vscode.Terminal,
		public readonly command?: vscode.Command, // ? indicates optional param
	) {
		super(label, collapsibleState);
	}

	public get iconPath(): string {
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

	public getPath(): string {
		return `${this.path}`;
	}

	public getContextValue(): string {
		return `${this.contextValue}`;
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
					env = { JAVA_HOME: javaHome };
				}
			}
			var terminal = vscode.window.createTerminal({ name: this.label + " (liberty:dev)", env: env });
			return terminal;
		}
		return undefined;
	}

	public deleteTerminal(): void {
		delete this.terminal;
	}
}

export async function createProject(buildFile: string, contextValue: string, xmlString?: String) {
	var label = "";
	if (xmlString !== undefined) {
		var parseString = require('xml2js').parseString;
		parseString(xmlString, function (err: any, result: any) {
			if (result.project.artifactId[0] !== undefined) {
				label = result.project.artifactId[0];
			} else {
				var dirName = path.dirname(buildFile);
				label = path.basename(dirName);
			}
		});
	} else {
		label = await gradleUtil.getGradleProjetName(buildFile);
	}
	var project: LibertyProject = new LibertyProject(label, vscode.TreeItemCollapsibleState.None, buildFile, 'start', contextValue, undefined, {
		command: 'extension.open.project',
		title: '',
		arguments: [buildFile]
	});
	return project;
}