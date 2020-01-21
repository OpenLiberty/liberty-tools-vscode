import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as gradleUtil from "./GradleUtil";
import * as mavenUtil from "./MavenUtil";
import * as util from "./Util";

export class ProjectProvider implements vscode.TreeDataProvider<LibertyProject> {
	public readonly onDidChangeTreeData: vscode.Event<LibertyProject | undefined>;

	// tslint:disable-next-line: variable-name
	private _onDidChangeTreeData: vscode.EventEmitter<LibertyProject | undefined>;

	constructor(private workspaceFolders: vscode.WorkspaceFolder[], private pomPaths: string[], private gradlePaths: string[]) {
		this._onDidChangeTreeData = new vscode.EventEmitter<LibertyProject | undefined>();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.refresh();
	}

	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	public getTreeItem(element: LibertyProject): vscode.TreeItem {
		return element;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public getChildren(element?: LibertyProject): Thenable<LibertyProject[]> {
		if (this.workspaceFolders === undefined) {
			vscode.window.showInformationMessage("No Liberty project found in empty workspace");
			return Promise.resolve([]);
		}
		return Promise.resolve(this.getProjectFromBuildFile(this.pomPaths, this.gradlePaths));
	}

	private async getProjectFromBuildFile(pomPaths: string[], gradlePaths: string[]): Promise<LibertyProject[]> {
		const projects: LibertyProject[] = [];
		const validPoms: string[] = [];
		let mavenChildMap: Map<string, string[]> = new Map();
		let gradleChildren: string[] = [];

		// check for parentPoms
		for (const parentPom of pomPaths) {
			const xmlString: string = await fse.readFile(parentPom, "utf8");
			const validParent = mavenUtil.validParentPom(xmlString);
			if (validParent) {
				// mavenChildMap: [parentName, array of child names]
				mavenChildMap = new Map([...Array.from(mavenChildMap.entries()), ...Array.from(mavenUtil.findChildMavenModules(xmlString).entries())]);
				const project = createProject(parentPom, "libertyMavenProject", xmlString);
				projects.push(await project);
				validPoms.push(parentPom);
			}

		}

		// check poms
		for (const pomPath of pomPaths) {
			if (!validPoms.includes(pomPath)) {
				const xmlString: string = await fse.readFile(pomPath, "utf8");
				const validPom = mavenUtil.validPom(xmlString, mavenChildMap);
				if (validPom) {
					const project = createProject(pomPath, "libertyMavenProject", xmlString);
					projects.push(await project);
				}
			}

		}

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
							const project = createProject(gradlePath, "libertyGradleProject");
							projects.push(await project);
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
					const project = createProject(gradlePath, "libertyGradleProject");
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
			const terminal = vscode.window.createTerminal({ name: this.label + " (liberty:dev)", env });
			return terminal;
		}
		return undefined;
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
		label = await gradleUtil.getGradleProjetName(buildFile);
	}
	const project: LibertyProject = new LibertyProject(label, vscode.TreeItemCollapsibleState.None, buildFile, "start", contextValue, undefined, {
		command: "extension.open.project",
		title: "",
		arguments: [buildFile],
	});
	return project;
}
