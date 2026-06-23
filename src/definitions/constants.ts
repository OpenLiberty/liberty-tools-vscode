/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import { localize } from "../util/i18nUtil";

// ---------------------------------------------------------------------------
// New contextValue scheme: libertyProject:{tool}[:{container|aggregator}]
// Use the helpers below (isMaven, isGradle, isContainer, isAggregator) instead
// of direct string comparisons throughout the codebase.
// ---------------------------------------------------------------------------
export const LIBERTY_PROJECT_MAVEN             = "libertyProject:maven";
export const LIBERTY_PROJECT_GRADLE            = "libertyProject:gradle";
export const LIBERTY_PROJECT_MAVEN_CONTAINER   = "libertyProject:maven:container";
export const LIBERTY_PROJECT_GRADLE_CONTAINER  = "libertyProject:gradle:container";
export const LIBERTY_PROJECT_MAVEN_AGGREGATOR  = "libertyProject:maven:aggregator";
export const LIBERTY_PROJECT_GRADLE_AGGREGATOR = "libertyProject:gradle:aggregator";

/** Returns true for any libertyProject contextValue (maven or gradle, any variant). */
export function isLibertyProject(contextValue: string): boolean {
    return /^libertyProject/.test(contextValue);
}
/** Returns true for maven projects (leaf, container, or aggregator). */
export function isMaven(contextValue: string): boolean {
    return /^libertyProject:maven/.test(contextValue);
}
/** Returns true for gradle projects (leaf, container, or aggregator). */
export function isGradle(contextValue: string): boolean {
    return /^libertyProject:gradle/.test(contextValue);
}
/** Returns true for container-capable projects (maven or gradle). */
export function isContainer(contextValue: string): boolean {
    return /^libertyProject.*:container/.test(contextValue);
}
/** Returns true for aggregator (parent POM / parent Gradle) projects. */
export function isAggregator(contextValue: string): boolean {
    return /^libertyProject.*:aggregator/.test(contextValue);
}

// ---------------------------------------------------------------------------
// Deprecated — kept temporarily for persisted storage migration only.
// These are the old contextValue strings that may exist in workspaceState for
// users upgrading. createLibertyProject maps these to new values on load.
// Remove after one release cycle.
// ---------------------------------------------------------------------------
/** @deprecated Use LIBERTY_PROJECT_MAVEN */
export const LIBERTY_MAVEN_PROJECT = "libertyMavenProject";
/** @deprecated Use LIBERTY_PROJECT_GRADLE */
export const LIBERTY_GRADLE_PROJECT = "libertyGradleProject";
/** @deprecated Use LIBERTY_PROJECT_MAVEN_CONTAINER */
export const LIBERTY_MAVEN_PROJECT_CONTAINER = "libertyMavenProjectContainer";
/** @deprecated Use LIBERTY_PROJECT_GRADLE_CONTAINER */
export const LIBERTY_GRADLE_PROJECT_CONTAINER = "libertyGradleProjectContainer";

export const TEST_REPORT_STRING = "Test Summary";
export const LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY = "liberty.dashboard.data";
export const LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION = "3.3.0";
export const LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION = "3.1.0";
export const LIBERTY_SERVER_ENV_PORT_REGEX = /^WLP_DEBUG_ADDRESS=([\d]+)$/;

// ---------------------------------------------------------------------------
// Deprecated — COMMAND_AND_PROJECT_TYPE_MAP replaced by regex helpers above.
// filterProjects in helperUtil.ts now uses isMaven/isGradle/isContainer.
// Remove after migration is complete.
// ---------------------------------------------------------------------------
/** @deprecated Use isMaven/isGradle/isContainer helpers in filterProjects */
export const COMMAND_AND_PROJECT_TYPE_MAP: { [command: string]: string[] } = {
    "liberty.dev.start": [LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "liberty.dev.stop":[LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "liberty.dev.custom":[LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "liberty.dev.start.container":[ LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "liberty.dev.run.tests":[LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "failsafe":[LIBERTY_MAVEN_PROJECT , LIBERTY_MAVEN_PROJECT_CONTAINER],
    "surefire":[LIBERTY_MAVEN_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER],
    "gradle":[ LIBERTY_GRADLE_PROJECT, LIBERTY_GRADLE_PROJECT_CONTAINER],
    "liberty.dev.debug": [LIBERTY_MAVEN_PROJECT, LIBERTY_GRADLE_PROJECT, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_GRADLE_PROJECT_CONTAINER],
};

export const EXCLUDED_DIR_PATTERN = "**/{bin,classes,target,build}/**";
export const COMMAND_TITLES = new Map();
export const UNTITLED_WORKSPACE="Untitled (Workspace)";
COMMAND_TITLES.set(localize("hotkey.commands.title.refresh"), "liberty.explorer.refresh");

COMMAND_TITLES.set(localize("hotkey.commands.title.start"), "liberty.dev.start");
COMMAND_TITLES.set(localize("hotkey.commands.title.start.custom"), "liberty.dev.custom");
COMMAND_TITLES.set(localize("hotkey.commands.title.start.in.container"), "liberty.dev.start.container");

COMMAND_TITLES.set(localize("hotkey.commands.title.debug"), "liberty.dev.debug");

COMMAND_TITLES.set(localize("hotkey.commands.title.stop"), "liberty.dev.stop");

COMMAND_TITLES.set(localize("hotkey.commands.title.run.tests"), "liberty.dev.run.tests");
COMMAND_TITLES.set(localize("hotkey.commands.title.view.integration.test.report"), "liberty.dev.open.failsafe.report");
COMMAND_TITLES.set(localize("hotkey.commands.title.view.unit.test.report"), "liberty.dev.open.surefire.report");
COMMAND_TITLES.set(localize("hotkey.commands.title.view.test.report"), "liberty.dev.open.gradle.test.report");

COMMAND_TITLES.set(localize("hotkey.commands.title.add.project"), "liberty.dev.add.project");
COMMAND_TITLES.set(localize("hotkey.commands.title.remove.project"), "liberty.dev.remove.project");
COMMAND_TITLES.set(localize("hotkey.commands.title.open.build.file"), "liberty.dev.open.build.file");
