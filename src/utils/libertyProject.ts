import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as gradleUtil from "./GradleUtil";
import * as mavenUtil from "./MavenUtil";
import * as util from "./Util";
import { LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT } from "./constants";

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {
	public readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	// tslint:disable-next-line: variable-name
	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;

	// Map of buildFilePath -> LibertyProject
	private projects: Map<string, LibertyProject> = new Map();

	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter<LibertyProject | undefined>();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.refresh();
	}

	public async refresh(): Promise<void> {
		// update the map of projects
		await this.updateProjects();
		// trigger a re-render of the tree view
		this._onDidChangeTreeData.fire();
	}

	public getTreeItem(element: LibertyProject): vscode.TreeItem {
		return element;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async getChildren(element?: LibertyProject): Promise<LibertyProject[]> {
		if (vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showInformationMessage("No Liberty project found in empty workspace");
			return [];
		}
		// if element is null, vscode is asking for the root node
		if (element === undefined) {
			// projects is a map of buildFilePath -> LibertyProjects
			// Need to return an array of just the LibertyProject
			return [... this.projects.values()];
		}
		// else it is asking for a child node
		return [];
	}

	// Given a list of pom.xml files, find ones that are valid to use with liberty dev-mode
	private async findValidPOMs(pomPaths: string[]): Promise<string[]> {
		const validPoms: string[] = [];
		let mavenChildMap: Map<string, string[]> = new Map();

		// check for parentPoms
		for (const parentPom of pomPaths) {
			const xmlString: string = await fse.readFile(parentPom, "utf8");
			const validParent = mavenUtil.validParentPom(xmlString);
			if (validParent) {
				// mavenChildMap: [parentName, array of child names]
				mavenChildMap = new Map([...Array.from(mavenChildMap.entries()), ...Array.from(mavenUtil.findChildMavenModules(xmlString).entries())]);
				validPoms.push(parentPom);
			}
		}

		// check poms
		for (const pomPath of pomPaths) {
			if (!validPoms.includes(pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				const validPom = mavenUtil.validPom(xmlString, mavenChildMap);
				if (validPom) {
					validPoms.push(pomPath);
				}
			}
		}

		return validPoms;
	}

	// Given a list of build.gradle files, find ones that are valid to use with liberty dev-mode
	private async findValidGradleBuildFiles(gradlePaths: string[]): Promise<string[]> {
		const validGradleBuildFiles: string[] = [];
		let gradleChildren: string[] = [];

		// check for multi module build.gradles
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const g2js = require("gradle-to-js/lib/parser");
		for (const gradlePath of gradlePaths) {
			await g2js.parseFile(gradlePath).then(async (buildFile: any) => {
				const gradleSettings = gradleUtil.getGradleSettings(gradlePath);
				if (gradleSettings !== "") {
					await g2js.parseFile(gradleSettings).then(async (settingsFile: any) => {
						const children = gradleUtil.findChildGradleProjects(buildFile, settingsFile);
						if (children.length !== 0) {
							gradleChildren = gradleChildren.concat(children);
							validGradleBuildFiles.push(gradlePath);
						}
					}).catch((err: any) => console.error("Unable to parse settings.gradle: " + gradleSettings + "; " + err));
				}
			}).catch((err: any) => console.error("Unable to parse build.gradle: " + gradlePath + "; " + err));
		}

		// check build.gradles
		for (const gradlePath of gradlePaths) {
			await g2js.parseFile(gradlePath).then(async (buildFile: any) => {
				const dirName = path.dirname(gradlePath);
				const label = path.basename(dirName);
				// check build.gradle matches any of the subprojects in the gradleChildMap or for liberty-gradle-plugin
				if (gradleChildren.includes(label) || gradleUtil.validGradleBuild(buildFile)) {
					validGradleBuildFiles.push(gradlePath);
				}
			}).catch((err: any) => console.error("Unable to parse build.gradle: " + gradlePath + "; " + err));
		}

		return validGradleBuildFiles;
	}

	private async updateProjects(): Promise<void> {
		// find all build files in the open workspace and find all the ones that are valid for dev-mode
		const EXCLUDED_DIR_PATTERN = "**/{bin,classes,target}/**";
		const pomPaths = (await vscode.workspace.findFiles("**/pom.xml", EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		const gradlePaths = (await vscode.workspace.findFiles("**/build.gradle", EXCLUDED_DIR_PATTERN)).map(uri => uri.fsPath);
		const validPomPaths = await this.findValidPOMs(pomPaths);
		const validGradlePaths = await this.findValidGradleBuildFiles(gradlePaths);

		// map of buildFilePath -> LibertyProject
		const newProjectsMap: Map<string, LibertyProject> = new Map();

		for (const pomPath of validPomPaths) {
			// if a LibertyProject for this pom has already been created
			// we want to re-use it since it stores state such as the terminal being used for dev-mode
			if (this.projects.has(pomPath)) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				newProjectsMap.set(pomPath, this.projects.get(pomPath)!);
			}
			// else we create a new LibertyProject for that POM
			else {
				const xmlString = await fse.readFile(pomPath, "utf8");
				const project = await createProject(pomPath, LIBERTY_MAVEN_PROJECT, xmlString);
				newProjectsMap.set(pomPath, project);
			}
		}

		for (const gradlePath of validGradlePaths) {
			// if a LibertyProject for this build.gradle has already been created
			// we want to re-use it
			if (this.projects.has(gradlePath)) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				newProjectsMap.set(gradlePath, this.projects.get(gradlePath)!);
			}
			// else we create a new LibertyProject for that build file
			else {
				const project = await createProject(gradlePath, LIBERTY_GRADLE_PROJECT);
				newProjectsMap.set(gradlePath, project);
			}
		}

		this.projects = newProjectsMap;
	}
}

export class LibertyProject extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		// tslint:disable-next-line: no-shadowed-variable
		public readonly path: string,
		public state: string,
		public contextValue: string,
		public terminal?: vscode.Terminal,
		public readonly command?: vscode.Command, // ? indicates optional param
	) {
		super(label, collapsibleState);
	}

	public get iconPath(): string {
		const iconPath = path.join(__dirname, "..", "..", "images", "ol_logo.png");
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
			let env: { [envKey: string]: string } = {};
			if (useJavaHome) {
				const javaHome: string | undefined = vscode.workspace.getConfiguration("java").get<string>("home");
				if (javaHome) {
					env = { JAVA_HOME: javaHome };
				}
			}
			const terminal = vscode.window.createTerminal({ name: this.label + " (liberty dev)", env });
			return terminal;
		}
		return undefined;
	}

	public deleteTerminal(): void {
		delete this.terminal;
	}
}

export async function createProject(buildFile: string, contextValue: string, xmlString?: string): Promise<LibertyProject> {
	let label = "";
	if (xmlString !== undefined) {
		const parseString = require("xml2js").parseString;
		parseString(xmlString, (err: any, result: any) => {
			if (result.project.artifactId[0] !== undefined) {
				label = result.project.artifactId[0];
			} else {
				const dirName = path.dirname(buildFile);
				label = path.basename(dirName);
			}
		});
	} else {
		label = await gradleUtil.getGradleProjectName(buildFile);
	}
	const project: LibertyProject = new LibertyProject(label, vscode.TreeItemCollapsibleState.None, buildFile, "start", contextValue, undefined, {
		command: "extension.open.project",
		title: "",
		arguments: [buildFile],
	});
	return project;
}
