/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as fse from "fs-extra";
import * as vscodePath from "path";
import * as vscode from "vscode";
import * as gradleUtil from "../util/gradleUtil";
import * as mavenUtil from "../util/mavenUtil";
import { localize } from "../util/i18nUtil";
import {
	EXCLUDED_DIR_PATTERN,
	LIBERTY_PROJECT_MAVEN, LIBERTY_PROJECT_GRADLE,
	LIBERTY_PROJECT_MAVEN_CONTAINER, LIBERTY_PROJECT_GRADLE_CONTAINER,
	LIBERTY_PROJECT_MAVEN_AGGREGATOR, LIBERTY_PROJECT_GRADLE_AGGREGATOR,
	isMaven, isGradle,
} from "../definitions/constants";
import { BuildFileImpl, GradleBuildFile } from "../util/buildFile";
import { LibertyProject, createProject, getLabelFromBuildFile } from "./libertyProject";

/**
 * One entry per discovered build file carrying parsed content so each file is read once
 */
export interface ParsedBuildEntry {
	path: string;
	type: "maven" | "gradle";
	xmlString?: string;
	parsedBuild?: any;
	settingsPath?: string;
	parsedSettings?: any;
	/** Set when regex pre-screen was sufficient and g2js.parseFile was skipped */
	regexBuildFile?: import("../util/buildFile").GradleBuildFile;
}

export interface DiscoveryResult {
	projects: Map<string, LibertyProject>;
	rootProjects: LibertyProject[];
	rejectedBuildFiles: string[];
}

/**
 * Create a LibertyProject from a folder path (no known type) or a build file path + type.
 */
export async function createLibertyProjectFromPath(
	context: vscode.ExtensionContext,
	path: string,
	type: string | undefined,
	existingProjects: Map<string, LibertyProject>
): Promise<LibertyProject | undefined> {
	let project: LibertyProject | undefined;

	if (type !== undefined) {
		if (fse.existsSync(path) && isMaven(type)) {
			const xmlString = await fse.readFile(path, "utf8");
			project = await createProject(context, path, type, xmlString);
		} else if (fse.existsSync(path) && isGradle(type)) {
			project = await createProject(context, path, type);
		}
	} else {
		const pomFile = vscodePath.resolve(path, "pom.xml");
		if (fse.existsSync(pomFile)) {
			const xmlString = await fse.readFile(pomFile, "utf8");
			project = await createProject(context, pomFile, LIBERTY_PROJECT_MAVEN, xmlString);
		} else {
			const gradleFile = vscodePath.resolve(path, "build.gradle");
			if (fse.existsSync(gradleFile)) {
				project = await createProject(context, gradleFile, LIBERTY_PROJECT_GRADLE);
			}
		}
	}
	return project;
}

// ── Phase helpers ─────────────────────────────────────────────────────────────

/**
 * Crawl stage. Reads and parses every build file exactly once, validates Liberty
 * relevance, and produces LibertyProject objects in projectsMap.
 *
 * Phase 1 — parallel read/parse of all files into ParsedBuildEntry[]
 * Phase 2 — classify parents: resolve mavenChildPomPaths + gradleChildBuildPaths
 * Phase 3 — parallel validate + create shell LibertyProject objects into projectsMap
 */
async function discoverProjects(
	context: vscode.ExtensionContext,
	pomPaths: string[],
	gradlePaths: string[],
	projectsMap: Map<string, LibertyProject>,
	existingProjects: Map<string, LibertyProject>
): Promise<{ projectsMap: Map<string, LibertyProject>; allEntries: ParsedBuildEntry[] }> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const g2js = require("gradle-to-js/lib/parser");
	const t0 = Date.now();

	// ── Phase 1: read/parse all files in parallel ──────────────────────────
	const allEntries: ParsedBuildEntry[] = await Promise.all([
		...pomPaths.map(async (p): Promise<ParsedBuildEntry> => ({
			path: p,
			type: "maven",
			xmlString: await fse.readFile(p, "utf8").catch(err => {
				console.error(`Error reading ${p}:`, err);
				return "";
			}),
		})),
		...gradlePaths.map(async (p): Promise<ParsedBuildEntry> => {
			const settingsPath = gradleUtil.getGradleSettings(p);
			const rawContent = await fse.readFile(p, "utf8").catch((err: any) => {
				console.error(`Error reading ${p}:`, err);
				return "";
			});
			const regexResult = gradleUtil.detectLibertyPluginFromText(rawContent);
			const needsG2js = !regexResult && gradleUtil.mightUseLegacyBuildscriptSyntax(rawContent);
			const hasIncludes = settingsPath ? (() => {
				try {
					const st = fse.readFileSync(settingsPath, "utf8");
					return /\binclude\b/.test(st);
				} catch { return false; }
			})() : false;

			const [parsedBuild, parsedSettings] = await Promise.all([
				needsG2js
					? g2js.parseFile(p).catch((err: any) => {
						console.error(localize("unable.to.parse.build.gradle", p, err));
						return null;
					})
					: Promise.resolve(null),
				(settingsPath && (hasIncludes || !regexResult))
					? g2js.parseFile(settingsPath).catch((err: any) => {
						console.error(localize("unable.to.parse.settings.gradle", settingsPath, err));
						return null;
					})
					: Promise.resolve(null),
			]);
			return {
				path: p, type: "gradle",
				parsedBuild,
				settingsPath: settingsPath || undefined,
				parsedSettings,
				regexBuildFile: (!needsG2js && regexResult) ? regexResult : undefined,
			};
		}),
	]);
	console.log(`[perf] discoverProjects phase1 (read+parse): ${Date.now() - t0}ms`);

	const mavenEntries = allEntries.filter(e => e.type === "maven");
	const gradleEntries = allEntries.filter(e => e.type === "gradle");

	// ── Phase 2: classify parents ──────────────────────────────────────────
	const childParentArtifactIds = mavenUtil.collectChildParentArtifactIds(mavenEntries);

	let mavenChildMap: Map<string, string[]> = new Map();
	const mavenParentPaths = new Set<string>();
	const mavenChildPomPaths = new Set<string>();
	for (const entry of mavenEntries) {
		if (!entry.xmlString) { continue; }
		const validParent = mavenUtil.validParentPom(entry.xmlString, childParentArtifactIds);
		console.log(`[discovery] phase2 validParentPom(${entry.path}): isValid=${validParent.isValidBuildFile()} type=${validParent.getProjectType()}`);
		if (validParent.isValidBuildFile()) {
			const childModules = mavenUtil.findChildMavenModules(entry.xmlString);
			console.log(`[discovery] phase2 findChildMavenModules(${entry.path}):`, JSON.stringify(Array.from(childModules.entries())));
			mavenChildMap = new Map([
				...Array.from(mavenChildMap.entries()),
				...Array.from(childModules.entries()),
			]);
			const parentDir = vscodePath.dirname(entry.path);
			for (const modulePaths of childModules.values()) {
				for (const modulePath of modulePaths) {
					const resolvedPom = vscodePath.resolve(parentDir, modulePath, "pom.xml");
					mavenChildPomPaths.add(resolvedPom);
					console.log(`[discovery] phase2 resolved child pom: ${resolvedPom}`);
				}
			}
			mavenParentPaths.add(entry.path);
		}
	}

	const gradleChildBuildPaths = new Set<string>();
	const gradleParentPaths = new Set<string>();
	for (const entry of gradleEntries) {
		const hasParsedBuild = entry.parsedBuild || entry.regexBuildFile;
		const isAggregatorBySettings = entry.parsedSettings && gradleUtil.hasGradleSubprojects(entry.parsedSettings);
		if (!hasParsedBuild && !isAggregatorBySettings) { continue; }
		const gradleBuildFile = gradleUtil.findChildGradleProjects(
			entry.parsedBuild ?? {}, entry.parsedSettings, entry.path
		);
		if (gradleBuildFile.getChildren().length > 0) {
			const parentDir = vscodePath.dirname(entry.path);
			for (const includePath of gradleBuildFile.getChildren()) {
				const fsPath = includePath.replace(/:/g, "/");
				const resolvedBuild = vscodePath.resolve(parentDir, fsPath, "build.gradle");
				gradleChildBuildPaths.add(resolvedBuild);
				console.log(`[discovery] phase2 resolved gradle child: ${resolvedBuild}`);
			}
			gradleParentPaths.add(entry.path);
		}
	}
	console.log(`[perf] discoverProjects phase2 (classify): ${Date.now() - t0}ms`);

	// ── Phase 3: validate + create LibertyProject objects (parallel) ────────
	const visitedPaths = new Set<string>();

	await Promise.all([
		...mavenEntries.map(async (entry) => {
			if (!entry.xmlString) { return; }
			let buildFile: BuildFileImpl;
			const isParent = mavenParentPaths.has(entry.path);
			const isChild = mavenChildPomPaths.has(entry.path);
			if (isParent) {
				buildFile = mavenUtil.validParentPom(entry.xmlString, childParentArtifactIds);
			} else if (isChild) {
				buildFile = new BuildFileImpl(true, LIBERTY_PROJECT_MAVEN);
				buildFile.setBuildFilePath(entry.path);
			} else {
				buildFile = mavenUtil.validPom(entry.xmlString, mavenChildMap);
			}
			if (!buildFile.isValidBuildFile()) { return; }
			buildFile.setBuildFilePath(entry.path);

			if (existingProjects.has(entry.path)) {
				const existing = existingProjects.get(entry.path)!;
				if (existing.contextValue !== buildFile.getProjectType()) {
					existing.setContextValue(buildFile.getProjectType());
				}
				const newLabel = await getLabelFromBuildFile(entry.path, entry.xmlString);
				if (newLabel && existing.getLabel() !== newLabel) { existing.setLabel(newLabel); }
				projectsMap.set(entry.path, existing);
			} else {
				const project = await createProject(context, entry.path, buildFile.getProjectType(), entry.xmlString);
				projectsMap.set(entry.path, project);
			}
			visitedPaths.add(entry.path);
		}),

		...gradleEntries.map(async (entry) => {
			if (!entry.parsedBuild && !entry.regexBuildFile && !gradleParentPaths.has(entry.path)) { return; }
			let buildFile: BuildFileImpl;

			if (gradleParentPaths.has(entry.path)) {
				const gf = gradleUtil.findChildGradleProjects(entry.parsedBuild ?? {}, entry.parsedSettings, entry.path);
				buildFile = new GradleBuildFile(true, gf.getProjectType());
			} else if (gradleChildBuildPaths.has(entry.path)) {
				const gf = entry.regexBuildFile
					? entry.regexBuildFile
					: gradleUtil.validGradleBuild(entry.parsedBuild!, entry.path);
				const shouldInclude = await gradleUtil.validateGradleChildModule(gf, entry.parsedBuild ?? {}, entry.path, visitedPaths);
				if (!shouldInclude) { return; }
				buildFile = gf;
			} else {
				buildFile = entry.regexBuildFile
					? entry.regexBuildFile
					: gradleUtil.validGradleBuild(entry.parsedBuild!, entry.path);
				if (!buildFile.hasLibertyPlugin()) { return; }
			}
			buildFile.setBuildFilePath(entry.path);

			const gradleLabel: string =
				(entry.parsedSettings && entry.parsedSettings["rootProject.name"])
					? entry.parsedSettings["rootProject.name"]
					: vscodePath.basename(vscodePath.dirname(entry.path));

			if (existingProjects.has(entry.path)) {
				const existing = existingProjects.get(entry.path)!;
				if (existing.contextValue !== buildFile.getProjectType()) {
					existing.setContextValue(buildFile.getProjectType());
				}
				if (existing.getLabel() !== gradleLabel) { existing.setLabel(gradleLabel); }
				projectsMap.set(entry.path, existing);
			} else {
				const project = new LibertyProject(context, gradleLabel, vscode.TreeItemCollapsibleState.None, entry.path, undefined, buildFile.getProjectType(), undefined, undefined);
				projectsMap.set(entry.path, project);
			}
			visitedPaths.add(entry.path);
		}),
	]);
	console.log(`[perf] discoverProjects phase3 (create projects): ${Date.now() - t0}ms  (${projectsMap.size} valid)`);
	return { projectsMap, allEntries };
}

/**
 * Writes identity and classification fields onto each object.
 */
async function stampProjects(
	projectsMap: Map<string, LibertyProject>,
	allEntries: ParsedBuildEntry[]
): Promise<{
	projectsMap: Map<string, LibertyProject>;
	mavenMetadataMap: Map<string, mavenUtil.MavenProjectMetadata>;
	gradleMetadataMap: Map<string, gradleUtil.GradleProjectMetadata>;
}> {
	const t0 = Date.now();
	const mavenMetadataMap = new Map<string, mavenUtil.MavenProjectMetadata>();
	const gradleMetadataMap = new Map<string, gradleUtil.GradleProjectMetadata>();

	for (const entry of allEntries) {
		const project = projectsMap.get(entry.path);
		if (!project) {
			console.log(`[stamp] no projectsMap entry for ${entry.path} — skipping`);
			continue;
		}
		try {
			if (entry.type === "maven" && entry.xmlString) {
				const metadata = await mavenUtil.extractMavenMetadata(entry.path, entry.xmlString);
				console.log(`[stamp] maven ${entry.path}: artifactId=${metadata.artifactId}, parentArtifactId=${metadata.parentArtifactId}, isAggregator=${metadata.isAggregator}, isLibertyEnabled=${metadata.isLibertyEnabled}`);
				project.artifactId = metadata.artifactId;
				project.parentArtifactId = metadata.parentArtifactId;
				project.isAggregator = metadata.isAggregator;
				project.isLibertyEnabled = metadata.isLibertyEnabled;
				mavenMetadataMap.set(entry.path, metadata);
			} else if (entry.type === "gradle" && (entry.parsedBuild || entry.regexBuildFile || entry.parsedSettings)) {
				const metadata = await gradleUtil.extractGradleMetadata(entry.path, entry.parsedBuild ?? null, entry.parsedSettings);
				console.log(`[stamp] gradle ${entry.path}: projectName=${metadata.projectName}, parentProjectName=${metadata.parentProjectName}, isAggregator=${metadata.isAggregator}, isLibertyEnabled=${metadata.isLibertyEnabled}`);
				project.artifactId = metadata.projectName;
				project.parentArtifactId = metadata.parentProjectName;
				project.isAggregator = metadata.isAggregator;
				project.isLibertyEnabled = metadata.isLibertyEnabled;
				gradleMetadataMap.set(entry.path, metadata);
			}
		} catch (error) {
			console.error(`Error stamping metadata for ${entry.path}:`, error);
			project.isLibertyEnabled = true;
		}
	}
	console.log(`[perf] stampProjects: ${Date.now() - t0}ms  (${mavenMetadataMap.size} maven, ${gradleMetadataMap.size} gradle)`);
	return { projectsMap, mavenMetadataMap, gradleMetadataMap };
}

/**
 * Sorts root projects to match the order of workspace folders in the Explorer view.
 * Projects not under any workspace folder are sorted last.
 */
export function sortByWorkspaceOrder(roots: LibertyProject[]): LibertyProject[] {
	const wsFolders = vscode.workspace.workspaceFolders ?? [];
	const folderIndex = (project: LibertyProject): number => {
		const idx = wsFolders.findIndex(f => {
			const folderPath = f.uri.fsPath.endsWith(vscodePath.sep) ? f.uri.fsPath : f.uri.fsPath + vscodePath.sep;
			return project.path.startsWith(folderPath);
		});
		return idx === -1 ? wsFolders.length : idx;
	};
	return [...roots].sort((a, b) => {
		const diff = folderIndex(a) - folderIndex(b);
		if (diff !== 0) { return diff; }
		return a.path.localeCompare(b.path);
	});
}

/**
 * Wires parent-child relationships and computes rootProjects.
 */
async function linkProjects(
	projectsMap: Map<string, LibertyProject>,
	mavenMetadataMap: Map<string, mavenUtil.MavenProjectMetadata>,
	gradleMetadataMap: Map<string, gradleUtil.GradleProjectMetadata>
): Promise<LibertyProject[]> {
	const t0 = Date.now();

	for (const project of projectsMap.values()) {
		project.parent = undefined;
		project.children = [];
	}

	for (const [parentPath, parentMetadata] of mavenMetadataMap.entries()) {
		if (!parentMetadata.isAggregator || parentMetadata.modules.length === 0) { continue; }
		const parentProject = projectsMap.get(parentPath);
		if (!parentProject) { continue; }
		const parentDir = vscodePath.dirname(parentPath);
		for (const moduleName of parentMetadata.modules) {
			const modulePomPath = vscodePath.resolve(parentDir, moduleName, "pom.xml");
			const childProject = projectsMap.get(modulePomPath);
			if (childProject) {
				childProject.parent = parentProject;
				parentProject.children.push(childProject);
				if (!childProject.isLibertyEnabled && parentProject.isLibertyEnabled) {
					childProject.isLibertyEnabled = true;
				}
				console.debug(`Linked module ${moduleName} to parent ${parentMetadata.artifactId} via filesystem path`);
			}
		}
	}

	for (const [parentPath, parentMetadata] of gradleMetadataMap.entries()) {
		if (!parentMetadata.isAggregator || parentMetadata.subprojects.length === 0) { continue; }
		const parentProject = projectsMap.get(parentPath);
		if (!parentProject) { continue; }
		const parentDir = vscodePath.dirname(parentPath);
		for (const subproject of parentMetadata.subprojects) {
			const fsPath = subproject.replace(/:/g, "/").replace(/^\//, "");
			const childBuildPath = vscodePath.resolve(parentDir, fsPath, "build.gradle");
			const childProject = projectsMap.get(childBuildPath);
			if (childProject) {
				childProject.parent = parentProject;
				parentProject.children.push(childProject);
				if (!childProject.isLibertyEnabled && parentProject.isLibertyEnabled) {
					childProject.isLibertyEnabled = true;
				}
				console.debug(`Linked gradle subproject ${subproject} to parent ${parentMetadata.projectName} via filesystem path`);
			}
		}
	}

	// Stamp aggregator contextValue
	for (const project of projectsMap.values()) {
		if (project.isAggregator) {
			project.setContextValue(
				isMaven(project.contextValue)
					? LIBERTY_PROJECT_MAVEN_AGGREGATOR
					: LIBERTY_PROJECT_GRADLE_AGGREGATOR
			);
		}
	}

	const hasLibertyDescendants = (project: LibertyProject): boolean => {
		if (project.isLibertyEnabled) { return true; }
		return project.children.some(child => hasLibertyDescendants(child));
	};

	const rootProjects = sortByWorkspaceOrder(
		Array.from(projectsMap.values())
			.filter(p => !p.parent)
			.filter(p => p.isLibertyEnabled || hasLibertyDescendants(p))
	);
	console.log(`[perf] linkProjects: ${Date.now() - t0}ms  (${rootProjects.length} roots)`);
	return rootProjects;
}

/**
 * Fallback discovery for workspace folders not covered by the main build-file scan.
 * Finds projects by locating server.xml and walking up to infer the build file location.
 */
async function addServerXMLProjects(
	context: vscode.ExtensionContext,
	projectsMap: Map<string, LibertyProject>,
	existingProjects: Map<string, LibertyProject>
): Promise<void> {
	let serverXMLPaths: string[] = [];
	const wsFolders = vscode.workspace.workspaceFolders;
	if (wsFolders) {
		for (const folder of wsFolders) {
			if (!projectRootPathExists(folder.uri.fsPath, projectsMap.keys())) {
				const pattern = new vscode.RelativePattern(folder.uri.fsPath, "**/src/main/liberty/config/server.xml");
				const paths = (await vscode.workspace.findFiles(pattern, EXCLUDED_DIR_PATTERN)).map(u => u.fsPath);
				serverXMLPaths = serverXMLPaths.concat(paths);
			}
		}
	}

	for (const serverXML of serverXMLPaths) {
		const folder = vscodePath.parse(vscodePath.resolve(serverXML, "../../../../")).dir;
		const pomFile = vscodePath.resolve(folder, "pom.xml");

		if (fse.existsSync(pomFile) && !projectsMap.has(pomFile)) {
			if (existingProjects.has(pomFile)) {
				projectsMap.set(pomFile, existingProjects.get(pomFile)!);
			} else {
				const xmlString = await fse.readFile(pomFile, "utf8");
				const buildFile = mavenUtil.validPom(xmlString, new Map());
				if (buildFile.isValidBuildFile()) {
					projectsMap.set(pomFile, await createProject(context, pomFile, buildFile.getProjectType(), xmlString));
				}
			}
		} else {
			const gradleFile = vscodePath.resolve(folder, "build.gradle");
			if (fse.existsSync(gradleFile) && !projectsMap.has(gradleFile)) {
				if (existingProjects.has(gradleFile)) {
					projectsMap.set(gradleFile, existingProjects.get(gradleFile)!);
				} else {
					const rawContent = await fse.readFile(gradleFile, "utf8").catch(() => "");
					const buildFile = gradleUtil.detectLibertyPluginFromText(rawContent);
					if (buildFile) {
						projectsMap.set(gradleFile, await createProject(context, gradleFile, buildFile.getProjectType()));
					}
				}
			}
		}
	}
}

function projectRootPathExists(path: string, keys: Iterable<string>): boolean {
	for (const existingPath of keys) {
		if (vscodePath.dirname(existingPath) === path) {
			return true;
		}
	}
	return false;
}

/**
 * Main entry point. Scans all workspace folders, runs the discover→stamp→link pipeline, 
 * and returns the fully-wired project map and root list.
 *
 * @param context         Extension context (for project creation, storage)
 * @param wsFolders       Workspace folders to scan
 * @param existingProjects Currently live projects (preserves terminal state across refreshes)
 * @param onFolderComplete Called after each folder completes — used for progressive tree updates
 */
export async function discoverWorkspace(
	context: vscode.ExtensionContext,
	wsFolders: readonly vscode.WorkspaceFolder[],
	existingProjects: Map<string, LibertyProject>,
	onFolderComplete?: (partial: Map<string, LibertyProject>, foldersComplete: number, totalFolders: number) => void
): Promise<DiscoveryResult> {
	const t0 = Date.now();
	const totalFolders = wsFolders.length;
	const newProjectsMap: Map<string, LibertyProject> = new Map();
	const allEntries: ParsedBuildEntry[] = [];
	let foldersComplete = 0;

	await Promise.all(wsFolders.map(async (folder) => {
		const folderPath = folder.uri.fsPath;

		const [pomUris, gradleUris] = await Promise.all([
			vscode.workspace.findFiles(
				new vscode.RelativePattern(folder, "**/pom.xml"), EXCLUDED_DIR_PATTERN
			),
			vscode.workspace.findFiles(
				new vscode.RelativePattern(folder, "**/build.gradle"), EXCLUDED_DIR_PATTERN
			),
		]);
		const pomPaths = pomUris.map(u => u.fsPath);
		const gradlePaths = gradleUris.map(u => u.fsPath);

		console.log(`[perf] folder ${folderPath} findFiles: ${Date.now() - t0}ms  (${pomPaths.length} pom, ${gradlePaths.length} gradle)`);

		const folderMap: Map<string, LibertyProject> = new Map();
		const { allEntries: folderEntries } = await discoverProjects(context, pomPaths, gradlePaths, folderMap, existingProjects);

		for (const [k, v] of folderMap) { newProjectsMap.set(k, v); }
		allEntries.push(...folderEntries);
		foldersComplete++;

		if (onFolderComplete) {
			onFolderComplete(new Map(newProjectsMap), foldersComplete, totalFolders);
		}

		console.log(`[perf] folder ${folderPath} complete (${foldersComplete}/${totalFolders}): ${Date.now() - t0}ms`);
	}));

	await addServerXMLProjects(context, newProjectsMap, existingProjects);

	const { mavenMetadataMap, gradleMetadataMap } = await stampProjects(newProjectsMap, allEntries);
	const rootProjects = await linkProjects(newProjectsMap, mavenMetadataMap, gradleMetadataMap);
	const rejectedBuildFiles = allEntries.map(e => e.path).filter(p => !newProjectsMap.has(p));

	console.log(`[perf] discoverWorkspace total: ${Date.now() - t0}ms  (${newProjectsMap.size} projects, ${rootProjects.length} roots)`);
	return { projects: newProjectsMap, rootProjects, rejectedBuildFiles };
}
