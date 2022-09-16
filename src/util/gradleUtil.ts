/**
 * Copyright (c) 2020, 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { localize } from "../util/i18nUtil";
import { getAllPaths, getReport } from "./helperUtil";
import { TEST_REPORT_STRING, LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION, LIBERTY_GRADLE_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT } from "../definitions/constants";
import { BuildFile, GradleBuildFile } from "./buildFile";

/**
 * Check a build.gradle file for the liberty-gradle-plugin
 * Return GradleBuildFile object
 * 
 * @param buildFile JS object representation of the build.gradle
 */
export function validGradleBuild(buildFile: any): GradleBuildFile {
    if (buildFile !== undefined && buildFile.apply !== undefined && buildFile.buildscript !== undefined && buildFile.buildscript.dependencies !== undefined) {
        // check that "apply plugin: 'liberty'" is specified in the build.gradle
        let libertyPlugin = false;
        for (let i = 0; i < buildFile.apply.length; i++) {
            if (buildFile.apply[i] === "plugin: 'liberty'") {
                libertyPlugin = true;
                break;
            }
        }
        if (libertyPlugin) {
            for (let i = 0; i < buildFile.buildscript.dependencies.length; i++) {
                const dependency = buildFile.buildscript.dependencies[i];
                // check that group matches io.openliberty.tools and name matches liberty-gradle-plugin
                if (dependency.group === "io.openliberty.tools" && dependency.name === "liberty-gradle-plugin") {
                    if (containerVersion(dependency.version)) {
                        return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT_CONTAINER));
                    }
                    return (new GradleBuildFile(true, LIBERTY_GRADLE_PROJECT));
                }
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
 * apply the liberty-gradle-plugin to the subprojects
 * Return GradleBuildFile object
 * 
 * @param settingsFile settings.gradle file
 */
export function findChildGradleProjects(buildFile: any, settingsFile: any): GradleBuildFile {
    let projectType: string = LIBERTY_GRADLE_PROJECT;
    let gradleChildren: string[] = [];
    let gradleBuildFile: GradleBuildFile = new GradleBuildFile(false, "");
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

    // check if the liberty-gradle-plugin is applied to any/all of the subprojects
    if (gradleChildren.length !== 0) {
        const parent: GradleBuildFile = validParent(buildFile);
        if (parent.isValidBuildFile()) {
            projectType = parent.getProjectType();
            gradleBuildFile.setProjectType(projectType);
            gradleBuildFile.setChildren(gradleChildren);
        }
    }
    return gradleBuildFile;
}

/**
 * Given a build.gradle, resolve test report locations
 * @param gradlePath build.gradle file
 * @param workspaceFolder workspace of current project
 */
export async function getGradleTestReport(gradlePath: any, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
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
        testReport = path.join(workspaceFolder.uri.fsPath, "build", "reports", "tests", "test", "index.html");
    } else {
        if (!fse.existsSync(testReport)) {
            testReport = findCustomTestReport(workspaceFolder, testReport);
        }
    }
    return testReport;
}

function validParent(buildFile: any): GradleBuildFile {
    // every subproject listed in the include section of the parent is supported by the liberty-gradle-plugin
    const gradleBuildSub: GradleBuildFile = validGradleBuild(buildFile.subprojects);
    const gradleBuildAll: GradleBuildFile = validGradleBuild(buildFile.allprojects);
    if (gradleBuildSub.isValidBuildFile()) {
        return gradleBuildSub;
    } else if (gradleBuildAll.isValidBuildFile()) {
        return gradleBuildAll;
    }
    return (new GradleBuildFile(false, ""));
}

/**
 * Return true if the liberty-gradle-plugin version is compatible
 * for dev mode with containers 
 * 
 * @param version plugin version as string
 */
function containerVersion(pluginVersion: string): boolean {
    const semver = require('semver')
    if (pluginVersion !== undefined) {
        let version = semver.coerce(pluginVersion);
        if (version != null) {
            return semver.gte(version, LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION);
        }
    }
    return false;
}

async function findCustomTestReport(workspaceFolder: vscode.WorkspaceFolder, testReport: string): Promise<string> {
    const testReports: string[] = [];
    const paths = await getAllPaths(workspaceFolder, "**/index.html");
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