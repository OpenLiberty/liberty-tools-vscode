/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */

// ---------------------------------------------------------------------------
// Project Context Values
// contextValue scheme: libertyProject:{tool}[:{container|aggregator}]
// Use the helpers below instead of direct string comparisons.
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
// Dev Mode
// Maven goals are passed to the Maven executable (mvn/mvnw) via terminal.
// Gradle tasks are passed to the Gradle executable (gradle/gradlew) via terminal.
// Container version thresholds gate whether devc is available for a project.
// ---------------------------------------------------------------------------
export const MAVEN_GOAL_DEV  = "io.openliberty.tools:liberty-maven-plugin:dev";
export const MAVEN_GOAL_DEVC = "io.openliberty.tools:liberty-maven-plugin:devc";

export const GRADLE_TASK_DEV  = "libertyDev";
export const GRADLE_TASK_DEVC = "libertyDevc";

export const LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION  = "3.3.0";
export const LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION = "3.1.0";

// ---------------------------------------------------------------------------
// VS Code Commands
// Must match package.json contributes.commands[].command declarations.
// ---------------------------------------------------------------------------
export const CMD_EXPLORER_REFRESH        = "liberty.explorer.refresh";
export const CMD_SHOW_COMMANDS           = "liberty.dev.show.commands";
export const CMD_OPEN_BUILD_FILE         = "liberty.dev.open.build.file";
export const CMD_START                   = "liberty.dev.start";
export const CMD_DEBUG                   = "liberty.dev.debug";
export const CMD_STOP                    = "liberty.dev.stop";
export const CMD_CUSTOM                  = "liberty.dev.custom";
export const CMD_START_CONTAINER         = "liberty.dev.start.container";
export const CMD_RUN_TESTS               = "liberty.dev.run.tests";
export const CMD_OPEN_FAILSAFE_REPORT    = "liberty.dev.open.failsafe.report";
export const CMD_OPEN_SUREFIRE_REPORT    = "liberty.dev.open.surefire.report";
export const CMD_OPEN_GRADLE_TEST_REPORT = "liberty.dev.open.gradle.test.report";
export const CMD_ADD_PROJECT             = "liberty.dev.add.project";
export const CMD_REMOVE_PROJECT          = "liberty.dev.remove.project";
export const CMD_SORT_WORKSPACE          = "liberty.explorer.sort.workspace";
export const CMD_SORT_WORKSPACE_ACTIVE   = "liberty.explorer.sort.workspace.active";
export const CMD_SORT_ALPHABETICAL       = "liberty.explorer.sort.alphabetical";
export const CMD_SORT_ALPHABETICAL_ACTIVE = "liberty.explorer.sort.alphabetical.active";
export const SORT_ORDER_KEY              = "liberty.sortOrder";
export type SortOrder                    = "workspace" | "alphabetical";

// ---------------------------------------------------------------------------
// Project Discovery
// ---------------------------------------------------------------------------
export const EXCLUDED_DIR_PATTERN = "**/{bin,classes,target,build}/**";

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export const LIBERTY_SERVER_ENV_PORT_REGEX        = /^WLP_DEBUG_ADDRESS=([\d]+)$/;
export const LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY = "liberty.dashboard.data";
export const TEST_REPORT_STRING                   = "Test Summary";
export const UNTITLED_WORKSPACE                   = "Untitled (Workspace)";
