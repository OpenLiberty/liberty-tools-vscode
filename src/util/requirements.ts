/**
 * Copyright 2019 Red Hat, Inc. and others.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 */

'use strict';

import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Uri, workspace } from 'vscode';

const expandHomeDir = require('expand-home-dir');
import * as findJavaHome from 'find-java-home';
import { JavaExtensionAPI } from '../extension';
import { localize } from './i18nUtil';
const isWindows = process.platform.indexOf('win') === 0;
const JAVA_FILENAME = 'java' + (isWindows?'.exe': '');

export interface RequirementsData {
    tooling_jre: string;
    tooling_jre_version: number;
    java_home: string;
    java_version: number;
}

// Referenced:
// https://github.com/redhat-developer/vscode-microprofile/blob/master/src/languageServer/requirements.ts

/**
 * Resolves the requirements needed to run the extension.
 * Returns a promise that will resolve to a RequirementsData if
 * all requirements are resolved, it will reject with ErrorData if
 * if any of the requirements fails to resolve.
 *
 */
export async function resolveRequirements(api: JavaExtensionAPI): Promise<RequirementsData> {

    // Use the embedded JRE from 'redhat.java' if it exists
    const requirementsData = api.javaRequirement;
    if (requirementsData) {
        return Promise.resolve(requirementsData);
    }

    const javaHome = await checkJavaRuntime();
    const javaVersion = await checkJavaVersion(javaHome);
    return Promise.resolve({tooling_jre: javaHome, tooling_jre_version: javaVersion, java_home: javaHome, java_version: javaVersion});
}

function checkJavaRuntime(): Promise<string> {
    return new Promise((resolve, reject) => {
        let source: string;
        let javaHome: string|undefined = readJavaHomeConfig();

        if (javaHome) {
            source = localize("check.java.runtime.vscode.java.home");
        } else {
            javaHome = process.env['JDK_HOME'];
            if (javaHome) {
                source = localize("check.java.runtime.env.jdk.home");
            } else {
                javaHome = process.env['JAVA_HOME'];
                source = localize("check.java.runtime.env.java.home");
            }
        }

        if (javaHome) {
            javaHome = expandHomeDir(javaHome);
            if (!fs.existsSync(javaHome!)) {
                openJDKDownload(reject, source + localize("open.jdk.download.part.missing.folder"));
            } else if (!fs.existsSync(path.resolve(javaHome as string, 'bin', JAVA_FILENAME))) {
                openJDKDownload(reject, source + localize("open.jdk.download.part.no.runtime"));
            }
            return resolve(javaHome!);
        }
        // No settings, let's try to detect as last resort.
        findJavaHome({ allowJre: true }, (err: any, home: any) => {
            if (err) {
                openJDKDownload(reject, localize("check.java.runtime.failed.locate"));
            }
            else {
                resolve(home);
            }
        });
    });
}

function readJavaHomeConfig(): string|undefined {
    const config = workspace.getConfiguration();
    const javaJdtLsHome = config.get<string>('java.jdt.ls.java.home');
    return javaJdtLsHome === null ? javaJdtLsHome : config.get<string>('java.home');
}

function checkJavaVersion(javaHome: string): Promise<number> {
    return new Promise((resolve, reject) => {
        cp.execFile(javaHome + '/bin/java', ['-version'], {}, (error, stdout, stderr) => {
            const javaVersion = parseMajorVersion(stderr);
            if (javaVersion < 17) {
                openJDKDownload(reject, localize("check.java.runtime.version.outdated"));
            } else {
                resolve(javaVersion);
            }
        });
    });
}

export function parseMajorVersion(content: string): number {
    let regexp = /version "(.*)"/g;
    let match = regexp.exec(content);
    if (!match) {
        return 0;
    }
    let version = match[1];
    // Ignore '1.' prefix for legacy Java versions
    if (version.startsWith('1.')) {
        version = version.substring(2);
    }

    // look into the interesting bits now
    regexp = /\d+/g;
    match = regexp.exec(version);
    let javaVersion = 0;
    if (match) {
        javaVersion = parseInt(match[0]);
    }
    return javaVersion;
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
