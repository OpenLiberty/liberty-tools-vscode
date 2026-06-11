/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import * as fse from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import { JSONPath } from "jsonpath-plus";
import { localize } from "../util/i18nUtil";
import { getAllPaths, getReport } from "./helperUtil";
import { TEST_REPORT_STRING, LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION, LIBERTY_PROJECT_GRADLE_CONTAINER, LIBERTY_PROJECT_GRADLE } from "../definitions/constants";
import { GradleBuildFile } from "./buildFile";

// Regex patterns for Liberty plugin detection in modern Gradle syntax
const LIBERTY_PLUGIN_ID_REGEX = /id\s*\(\s*["']io\.openliberty\.tools\.gradle\.Liberty["']\s*\)|id\s+['"]io\.openliberty\.tools\.gradle\.Liberty['"]/;
const LIBERTY_PLUGIN_VERSION_REGEX = /id\s*\(\s*["']io\.openliberty\.tools\.gradle\.Liberty["']\s*\)\s+version\s+["']([^"']+)["']|id\s+['"]io\.openliberty\.tools\.gradle\.Liberty['"]\s+version\s+["']([^"']+)["']/;

// Regex to detect legacy buildscript classpath plugin syntax (requires g2js to parse fully)
const LEGACY_BUILDSCRIPT_REGEX = /buildscript\s*\{/;

/**
 * Detect Liberty plugin from raw build.gradle text content.
 * Returns a GradleBuildFile if the modern plugin syntax is detected, null otherwise.
 * Does NOT detect legacy buildscript.dependencies syntax — use the g2js path for that.
 *
 * @param content Raw text of a build.gradle file
 * @returns GradleBuildFile if Liberty plugin detected via modern syntax, null otherwise
 */
export function detectLibertyPluginFromText(content: string): GradleBuildFile | null {
    if (LIBERTY_PLUGIN_ID_REGEX.test(content)) {
        const versionMatch = content.match(LIBERTY_PLUGIN_VERSION_REGEX);
        const version = versionMatch ? (versionMatch[1] || versionMatch[2]) : null;
        if (version && containerVersion(version)) {
            return new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE_CONTAINER);
        }
        return new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE);
    }
    return null;
}

/**
 * Return true if the raw build.gradle text MAY use legacy buildscript.dependencies
 * syntax for the Liberty plugin. When true, g2js.parseFile() is still needed.
 * @param content Raw text of a build.gradle file
 */
export function mightUseLegacyBuildscriptSyntax(content: string): boolean {
    return LEGACY_BUILDSCRIPT_REGEX.test(content);
}

/**
 * Detect Liberty plugin using regex for Gradle plugin syntax.
 *
 * @param buildFilePath Path to build.gradle file
 * @returns GradleBuildFile if Liberty plugin detected, null otherwise
 */
function detectLibertyPluginViaRegex(buildFilePath: string): GradleBuildFile | null {
    if (!buildFilePath || !fse.existsSync(buildFilePath)) {
        return null;
    }

    try {
        const content = fse.readFileSync(buildFilePath, 'utf8');

        if (LIBERTY_PLUGIN_ID_REGEX.test(content)) {
            const versionMatch = content.match(LIBERTY_PLUGIN_VERSION_REGEX);
            const version = versionMatch ? (versionMatch[1] || versionMatch[2]) : null;

            if (version && containerVersion(version)) {
                return new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE_CONTAINER);
            }
            return new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE);
        }
    } catch (error) {
        console.error(`Error reading build.gradle for Liberty plugin detection: ${buildFilePath}`, error);
    }

    return null;
}

/**
 * Check a build.gradle file for the liberty-gradle-plugin
 * Return GradleBuildFile object
 *
 * @param buildFile JS object representation of the build.gradle
 * @param buildFilePath Optional path to build.gradle for regex fallback
 */
export function validGradleBuild(buildFile: any, buildFilePath?: string): GradleBuildFile {
    // First, try to detect via gradle-to-js parsed content
    const buildDependencies = JSONPath({ path: "$..buildscript.dependencies", json: buildFile });
    for ( const buildDependency of buildDependencies ) {
        for ( const dependency of buildDependency ) {
            if ( "io.openliberty.tools" === dependency.group && "liberty-gradle-plugin" === dependency.name) {
                if (containerVersion(dependency.version)) {
                    return (new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE_CONTAINER));
                }
                return (new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE));
            }
        }
    }

    const plugins = JSONPath({ path: "$..plugins", json: buildFile });
    for ( const plugin of plugins) {
        for (const onePlugin of plugin) {
            if ( "io.openliberty.tools.gradle.Liberty" === onePlugin.id ) {
                if (containerVersion(onePlugin.version)) {
                    return (new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE_CONTAINER));
                }
                return (new GradleBuildFile(true, LIBERTY_PROJECT_GRADLE));
            }
        }
     }

    // Fallback: Use regex for modern plugin syntax that gradle-to-js can't parse
    if (buildFilePath) {
        const regexResult = detectLibertyPluginViaRegex(buildFilePath);
        if (regexResult) {
            return regexResult;
        }
    }

    return (new GradleBuildFile(false, ""));
}

/**
 * Get the name of a gradle project
 * If a settings.gradle exists with a name specified, return name
 * Else return the parent directory name of the build.gradle
 * @param path build.gradle location
 */
export async function getGradleProjectName(gradlePath: string): Promise<string> {
    const dirName = path.dirname(gradlePath);
    const gradleSettings = getGradleSettings(gradlePath);
    let label = path.basename(dirName);
    if (fse.existsSync(gradleSettings)) {
        // File exists in path
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const g2js = require("gradle-to-js/lib/parser");
        label = await g2js.parseFile(gradleSettings).then((representation: any) => {
            if (representation["rootProject.name"] !== undefined) {
                return representation["rootProject.name"];
            }
        }).catch((err: any) => console.error(localize("unable.to.parse.settings.gradle", gradleSettings , err)));
    }
    return label;
}

/**
 * Get the name of a gradle project from already-parsed settings content.
 * Avoids re-parsing settings.gradle when the parsed representation is available.
 * @param gradlePath build.gradle location (used to derive fallback directory name)
 * @param parsedSettings Already-parsed settings.gradle JS object, or null/undefined
 */
export function getGradleProjectNameFromParsed(gradlePath: string, parsedSettings: any): string {
    const dirName = path.dirname(gradlePath);
    const label = path.basename(dirName);
    if (parsedSettings && parsedSettings["rootProject.name"] !== undefined) {
        return parsedSettings["rootProject.name"];
    }
    return label;
}

/**
 * Get settings.gradle associated with a build.gradle
 * Look in same directory as build.gradle or a child-folder
 * with the directory name "master"
 * @param gradlePath
 */
export function getGradleSettings(gradlePath: string): string {
    const dirName = path.dirname(gradlePath);
    let gradleSettings = path.normalize(path.join(dirName, "settings.gradle"));
    if (fse.existsSync(gradleSettings)) {
        // settings.gradle exists in same directory as build.gradle
        return gradleSettings;
    } else {
        gradleSettings = path.normalize(path.join(dirName, "master", "settings.gradle"));
        if (fse.existsSync(gradleSettings)) {
            // settings.gradle exists in /master directory
            return gradleSettings;
        }
    }

    // return empty string if settings.gradle could not be found
    return "";
}

/**
 * Extract child project names from settings.gradle file
 * @param settingsFile Parsed settings.gradle content
 * @returns Array of child project names
 */
function extractChildrenFromSettings(settingsFile: any): string[] {
    if (!settingsFile || !settingsFile.include) {
        return [];
    }

    if (typeof settingsFile.include === "string") {
        const subprojects = settingsFile.include.replace(/['" ]+/g, "");
        return subprojects.split(",").filter((s: string) => s.length > 0);
    }

    if (Array.isArray(settingsFile.include)) {
        return settingsFile.include;
    }

    return [];
}

/**
 * Given a settings.gradle file, determine if there are valid child gradle projects
 * The parent build.gradle must have subprojects in the `include` section and
 * apply the liberty-gradle-plugin to the subprojects, OR simply be an aggregator with modules
 * Return GradleBuildFile object
 *
 * @param settingsFile settings.gradle file
 */
export function findChildGradleProjects(buildFile: any, settingsFile: any, buildFilePath?: string): GradleBuildFile {
    const gradleChildren = extractChildrenFromSettings(settingsFile);

    if (gradleChildren.length === 0) {
        return new GradleBuildFile(false, "");
    }

    // Check if the parent build.gradle has Liberty plugin
    const parent: GradleBuildFile = validGradleBuild(buildFile, buildFilePath);
    const projectType = parent.hasLibertyPlugin() ? parent.getProjectType() : LIBERTY_PROJECT_GRADLE;

    // Mark as valid because it's an aggregator (even if no Liberty plugin)
    const result = new GradleBuildFile(true, projectType);
    result.setChildren(gradleChildren);
    return result;
}

/**
 * Check if a Gradle child module is a valid aggregator
 * @param buildFile Parsed build.gradle content
 * @param gradlePath Path to build.gradle
 * @param visitedPaths Set of already visited paths to prevent circular references
 * @returns true if the module is an aggregator with children, false otherwise
 */
export async function isGradleAggregator(buildFile: any, gradlePath: string, visitedPaths: Set<string>): Promise<boolean> {
    // Prevent circular references
    if (visitedPaths.has(gradlePath)) {
        console.warn(`Circular reference detected for Gradle project: ${gradlePath}`);
        return false;
    }

    const gradleSettings = getGradleSettings(gradlePath);
    if (gradleSettings === "") {
        return false;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const g2js = require("gradle-to-js/lib/parser");
        const settingsFile = await g2js.parseFile(gradleSettings);
        const childGradleBuildFile: GradleBuildFile = findChildGradleProjects(buildFile, settingsFile, gradlePath);
        return childGradleBuildFile.getChildren().length > 0;
    } catch (err) {
        console.error(localize("unable.to.parse.settings.gradle", gradleSettings, err));
        return false;
    }
}

/**
 * Validate a Gradle child module for inclusion in the project tree
 * @param gradleBuild The BuildFileImpl for the module
 * @param buildFile Parsed build.gradle content
 * @param gradlePath Path to build.gradle
 * @param visitedPaths Set of already visited paths to prevent circular references
 * @returns true if the module should be included, false otherwise
 */
export async function validateGradleChildModule(
    gradleBuild: any,
    buildFile: any,
    gradlePath: string,
    visitedPaths: Set<string>
): Promise<boolean> {
    // If it has Liberty plugin, always include
    if (gradleBuild.hasLibertyPlugin()) {
        return true;
    }

    // Check if this child is itself an aggregator with settings.gradle
    const isAggregator = await isGradleAggregator(buildFile, gradlePath, visitedPaths);
    if (isAggregator) {
        // It's an aggregator, use default project type for interaction
        const { LIBERTY_PROJECT_GRADLE } = require("../definitions/constants");
        gradleBuild.setProjectType(LIBERTY_PROJECT_GRADLE);
        return true;
    }

    // Not an aggregator and no Liberty plugin - don't include
    return false;
}

/**
 * Given a build.gradle, resolve test report locations
 * @param gradlePath build.gradle file
 * @param projectRootPath Path of current project
 */
export async function getGradleTestReport(gradlePath: any, projectRootPath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const g2js = require("gradle-to-js/lib/parser");
    let testReport = await g2js.parseFile(gradlePath).then(async (buildFile: any) => {
        let dest: string | undefined;
        if (buildFile["test.reports.html.destination"] !== undefined) {
            dest = buildFile["test.reports.html.destination"];
        } else if (buildFile.test !== undefined) {
            dest = buildFile.test["reports.html.destination"];
        }
        return dest;
    }).catch((err: any) => console.error(localize("unable.to.parse.build.gradle", gradlePath, err)));
    if (testReport === undefined) {
        testReport = path.join(projectRootPath, "build", "reports", "tests", "test", "index.html");
    } else {
        if (!fse.existsSync(testReport)) {
            testReport = findCustomTestReport(projectRootPath, testReport);
        }
    }
    return testReport;
}


/**
 * Return true if the liberty-gradle-plugin version is compatible
 * for dev mode with containers
 *
 * @param version plugin version as string
 */
function containerVersion(pluginVersion: string): boolean {
    if (pluginVersion !== undefined) {
        const version = semver.coerce(pluginVersion);
        if (version !== null) {
            return semver.gte(version, LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION);
        }
    }
    return false;
}

async function findCustomTestReport(projectRootPath: string, testReport: string): Promise<string> {
    const testReports: string[] = [];
    const paths = await getAllPaths(projectRootPath, "**/index.html");
    for (let i = 0; i < paths.length; i++) {
        const report = getReport(paths[i]);
        if (report.includes(TEST_REPORT_STRING)) {
            testReports.push(paths[i]);
        }
    }
    // if there are multiple test reports, use most recently modified
    if (testReports.length > 0) {
        let lastModified = fse.statSync(testReports[0]).mtime;
        let lastModifiedPath = testReports[0];
        for (let i = 0; i < testReports.length; i++) {
            const reportLastModified = fse.statSync(testReports[i]).mtime;
            if (lastModified < reportLastModified) {
                lastModifiedPath = testReports[i];
                lastModified = reportLastModified;
            }
        }
        testReport = lastModifiedPath;
    }
    return testReport;
}

/**
 * Interface for Gradle project metadata used in multi-module hierarchy
 */
export interface GradleProjectMetadata {
    projectName: string;
    parentProjectName?: string;
    subprojects: string[];
    hasLibertyPlugin: boolean;
    isAggregator: boolean;
    isLibertyEnabled: boolean;
    buildFilePath: string;
    contextValue: string;
}

/**
 * Extract metadata from a Gradle build file for multi-module support
 * @param buildGradlePath Path to the build.gradle file
 * @param buildFileContent Optional parsed build file content
 * @param settingsContent Optional parsed settings.gradle content
 * @returns GradleProjectMetadata object
 */
export async function extractGradleMetadata(
    buildGradlePath: string,
    buildFileContent?: any,
    settingsContent?: any
): Promise<GradleProjectMetadata> {
    const g2js = require("gradle-to-js/lib/parser");

    // Parse build.gradle if not provided
    const buildFile = buildFileContent || await g2js.parseFile(buildGradlePath);

    // Parse settings.gradle if exists and not provided
    const settingsPath = getGradleSettings(buildGradlePath);
    let settingsFile = settingsContent;
    if (!settingsFile && settingsPath && fse.existsSync(settingsPath)) {
        try {
            settingsFile = await g2js.parseFile(settingsPath);
        } catch (err) {
            console.error(localize("unable.to.parse.settings.gradle", settingsPath, err));
        }
    }

    // Extract project name — use cached parsedSettings to avoid re-parsing settings.gradle
    const projectName = getGradleProjectNameFromParsed(buildGradlePath, settingsFile);

    // Extract subprojects
    const subprojects = extractSubprojectsFromSettings(settingsFile);

    // Determine parent project name by inspecting the parent directory's settings.gradle.
    // Re-use parsedSettings of the *parent* only if the caller already has it cached;
    // otherwise fall back to a sync regex scan of the parent settings file to avoid
    // an extra g2js.parseFile() per-project (the parent settings is not in our cache).
    let parentProjectName: string | undefined;
    const buildDir = path.dirname(buildGradlePath);
    const currentDirName = path.basename(buildDir);
    const parentDir = path.dirname(buildDir);
    const parentSettingsPath = path.join(parentDir, "settings.gradle");

    if (fse.existsSync(parentSettingsPath)) {
        try {
            // Fast path: read raw text and extract rootProject.name + include list via regex
            // to avoid an extra g2js.parseFile() per child module.
            const parentSettingsText = fse.readFileSync(parentSettingsPath, "utf8");
            const parentIncludesChild = /(?:^|[\n,])\s*['"]?:?([\w-]*)\b/.test(parentSettingsText) &&
                parentSettingsText.includes(currentDirName);
            if (parentIncludesChild) {
                const nameMatch = parentSettingsText.match(/rootProject\.name\s*=\s*['"]([^'"]+)['"]/m);
                parentProjectName = nameMatch ? nameMatch[1] : path.basename(parentDir);
            }
        } catch (err) {
            console.error(localize("unable.to.parse.settings.gradle", parentSettingsPath, err));
        }
    }

    // Check for Liberty plugin
    const gradleBuildFile = validGradleBuild(buildFile, buildGradlePath);
    const hasLibertyPlugin = gradleBuildFile.isValidBuildFile();

    // Check if this is an aggregator (has subprojects)
    const isAggregator = subprojects.length > 0;

    // Determine context value
    let contextValue = "";
    if (hasLibertyPlugin) {
        contextValue = gradleBuildFile.getProjectType();
    }

    return {
        projectName,
        parentProjectName,
        subprojects,
        hasLibertyPlugin,
        isAggregator,
        isLibertyEnabled: hasLibertyPlugin,
        buildFilePath: buildGradlePath,
        contextValue
    };
}

/**
 * Extract subproject names from settings.gradle
 * @param settingsFile Parsed settings.gradle content
 * @returns Array of subproject names
 */
function extractSubprojectsFromSettings(settingsFile: any): string[] {
    if (!settingsFile || !settingsFile.include) {
        return [];
    }

    if (typeof settingsFile.include === "string") {
        // Handle string format: "'module1', 'module2'"
        const cleaned = settingsFile.include.replace(/['" ]+/g, "");
        return cleaned.split(",").filter((s: string) => s.length > 0);
    }

    if (Array.isArray(settingsFile.include)) {
        return settingsFile.include;
    }

    return [];
}