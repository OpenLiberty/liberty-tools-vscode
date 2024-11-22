/**
 * Copyright (c) 2020, 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import { localize } from "../util/i18nUtil";
export const LIBERTY_MAVEN_PROJECT = "libertyMavenProject";
export const LIBERTY_GRADLE_PROJECT = "libertyGradleProject";
export const TEST_REPORT_STRING = "Test Summary";

export const LIBERTY_DASHBOARD_WORKSPACE_STORAGE_KEY = "liberty.dashboard.data";

// Liberty dev mode in containers
export const LIBERTY_MAVEN_PROJECT_CONTAINER = "libertyMavenProjectContainer";
export const LIBERTY_GRADLE_PROJECT_CONTAINER = "libertyGradleProjectContainer";

export const LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION = "3.3.0";
export const LIBERTY_GRADLE_PLUGIN_CONTAINER_VERSION = "3.1.0";
export const LIBERTY_SERVER_ENV_PORT_REGEX = /^WLP_DEBUG_ADDRESS=([\d]+)$/;
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
export const EXCLUDED_DIR_PATTERN = "**/{bin,classes,target}/**";
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
