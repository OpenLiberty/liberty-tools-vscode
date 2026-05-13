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
import { TEST_REPORT_STRING, LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION, LIBERTY_GRADLE_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT } from "../definitions/constants";
import { GradleBuildFile } from "./buildFile";

/**
 * Check a build.gradle file for the liberty-gradle-plugin
 * Return GradleBuildFile object
 * 
 * @param buildFile JS object representation of the build.gradle
 */
export function validGradleBuild(buildFile: any): GradleBuildFile {
    const buildDependencies = JSONPath({ path: "$..buildscript.dependencies", json: buildFile });
    for ( const buildDependency of buildDependencies ) {
        for ( const dependency of buildDependency ) {
            if ( "io.openliberty.tools" === dependency.group && "liberty-gradle-plugin" === dependency.name) {
                if (containerVersion(dependency.version)) {
                    return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT_CONTAINER));
                }
                return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT));
            }
        }
    }
    
    const plugins = JSONPath({ path: "$..plugins", json: buildFile });
    for ( const plugin of plugins) {
        for (const onePlugin of plugin) {
            if ( "io.openliberty.tools.gradle.Liberty" === onePlugin.id ) {
                if (containerVersion(onePlugin.version)) {
                    return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT_CONTAINER));
                }
                return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT));
            }
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
 * Given a settings.gradle file, determine if there are valid child gradle projects
 * The parent build.gradle must have subprojects in the `include` section and
 * apply the liberty-gradle-plugin to the subprojects, OR simply be an aggregator with modules
 * Return GradleBuildFile object
 *
 * @param settingsFile settings.gradle file
 */
export function findChildGradleProjects(buildFile: any, settingsFile: any): GradleBuildFile {
    let projectType: string = LIBERTY_GRADLE_PROJECT;
    let gradleChildren: string[] = [];
    
    if (settingsFile !== undefined) {
        // look for a valid "include" section in the settingsFile
        if (settingsFile.include !== undefined) {
            if (typeof settingsFile.include === "string") {
                // strip quotations and spaces from "include" string
                const subprojects = settingsFile.include.replace(/['" ]+/g, "");
                gradleChildren = subprojects.split(",");
            } else {
                for (let i = 0; i < settingsFile.include.length; i++) {
                    gradleChildren.push(settingsFile.include[i]);
                }
            }
        }
    }

    // If there are children in settings.gradle, this is a valid aggregator
    if (gradleChildren.length !== 0) {
        // Check if the parent build.gradle has Liberty plugin
        const parent: GradleBuildFile = validGradleBuild(buildFile);
        if (parent.isValidBuildFile()) {
            projectType = parent.getProjectType();
        }
        // Always mark as valid if there are children - aggregators are valid even without Liberty plugin
        const result = new GradleBuildFile(true, projectType);
        result.setChildren(gradleChildren);
        return result;
    }
    
    return new GradleBuildFile(false, "");
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
    
    // Extract project name
    const projectName = await getGradleProjectName(buildGradlePath);
    
    // Extract subprojects
    const subprojects = extractSubprojectsFromSettings(settingsFile);
    
    // Determine parent project name
    let parentProjectName: string | undefined;
    const buildDir = path.dirname(buildGradlePath);
    const currentDirName = path.basename(buildDir);
    const parentDir = path.dirname(buildDir);
    const parentSettings = path.join(parentDir, "settings.gradle");
    
    // Check if parent directory has settings.gradle
    if (fse.existsSync(parentSettings)) {
        try {
            const parentSettingsFile = await g2js.parseFile(parentSettings);
            const parentSubprojects = extractSubprojectsFromSettings(parentSettingsFile);
            
            // If current directory is in parent's includes, this is a child module
            if (parentSubprojects.includes(currentDirName)) {
                parentProjectName = parentSettingsFile["rootProject.name"] || path.basename(parentDir);
            }
        } catch (err) {
            console.error(localize("unable.to.parse.settings.gradle", parentSettings, err));
        }
    }
    
    // Check for Liberty plugin
    const gradleBuildFile = validGradleBuild(buildFile);
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