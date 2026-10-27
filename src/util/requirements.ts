/**
 * Copyright 2019 Red Hat, Inc. and others.
 * Copyright IBM Corp. 2022, 2026
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


'use strict';
import { Uri } from 'vscode';
import { JavaExtensionAPI } from '../extension';
import { localize } from './i18nUtil';
import { JavaSelector } from './javaSelector';

const REQUIRED_JAVA_VERSION = 21;

export interface RequirementsData {
    tooling_jre: string;
    tooling_jre_version: number;
    java_home: string;
    java_version: number;
}

/**
 * Resolves the requirements needed to run the Liberty language servers.
 * Uses JavaSelector to find the best available Java 21+ installation
 * across all sources (Red Hat extension, VS Code settings, system path).
 * Only errors after all sources are exhausted.
 */
export async function resolveRequirements(_api: JavaExtensionAPI): Promise<RequirementsData> {
    return new Promise(async (resolve, reject) => {
        try {
            // Gets java selector and asks it for best java 21+ to use to later run 
            // java -jarliberty-ls.jar
            const selector = JavaSelector.getInstance();
            const java = await selector.findFirstValid(REQUIRED_JAVA_VERSION);
            resolve({
                tooling_jre: java.path,
                tooling_jre_version: java.majorVersion,
                java_home: java.path,
                java_version: java.majorVersion,
            });
        } catch {
            openJDKDownload(reject, localize("check.java.runtime.version.outdated", REQUIRED_JAVA_VERSION));
        }
    });
}

/**
 * Resolves Java requirements specifically for the Liberty Config Language Server (LCLS).
 * Uses the same JavaSelector pool, xml.java.home is already checked as part of
 * vscodeSettingsStrategy, so no separate resolution is needed.
 */
export async function resolveLclsRequirements(_api: JavaExtensionAPI): Promise<number> {
    return new Promise(async (resolve, reject) => {
        try {
            const selector = JavaSelector.getInstance();
            const java = await selector.findFirstValid(REQUIRED_JAVA_VERSION);
            resolve(java.majorVersion);
        } catch {
            defineXmlJavaHome(reject, localize("define.xml.java.home.message", REQUIRED_JAVA_VERSION));
        }
    });
}

/**
 * Parses the major Java version number from the output of `java -version`.
 * Kept for any callers that still shell out to java -version directly.
 */
export function parseMajorVersion(content: string): number {
    let regexp = /version "(.*)"/g;
    let match = regexp.exec(content);
    if (!match) {
        return 0;
    }
    let version = match[1];
    // Ignore '1.' prefix for legacy Java versions (e.g. 1.8 → 8)
    if (version.startsWith('1.')) {
        version = version.substring(2);
    }
    regexp = /\d+/g;
    match = regexp.exec(version);
    let javaVersion = 0;
    if (match) {
        javaVersion = parseInt(match[0]);
    }
    return javaVersion;
}

function defineXmlJavaHome(reject: any, cause: string) {
    reject({
        message: cause,
        label: localize("check.java.runtime.dismiss.label"),
        replaceClose: false
    });
}

function openJDKDownload(reject: any, cause: string) {
    let jdkUrl = 'https://developer.ibm.com/languages/java/semeru-runtimes/downloads/';
    if (process.platform === 'darwin') {
        jdkUrl = 'http://www.oracle.com/technetwork/java/javase/downloads/index.html';
    }
    reject({
        message: cause,
        label: localize("open.jdk.download.label"),
        openUrl: Uri.parse(jdkUrl),
        replaceClose: false
    });
}
