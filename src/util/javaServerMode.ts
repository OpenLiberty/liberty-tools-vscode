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

import { window, commands } from "vscode";
import { JavaExtensionAPI } from "../extension";

export const JAVA_EXTENSION_ID = "redhat.java";

export enum ServerMode {
    STANDARD = "Standard",
    LIGHTWEIGHT = "LightWeight",
    HYBRID = "Hybrid",
}

/**
 * Waits for the java language server to launch in standard mode
 * Before activating Tools for MicroProfile.
 * If java ls was started in lightweight mode, It will prompt user to switch
 * 
 * Referenced:
 * https://github.com/redhat-developer/vscode-microprofile/blob/master/src/util/javaServerMode.ts
 */
export async function waitForStandardMode(api: JavaExtensionAPI): Promise<void> {
    // If hybrid, standard mode is being launched. Wait for standard mode then resolve.
    if (api.serverMode === ServerMode.HYBRID) {
        return new Promise((resolve) => {
            api.onDidServerModeChange((mode: string) => {
                if (mode === ServerMode.STANDARD) {
                    resolve();
                }
            });
        });
        // If Lightweight. Prompt to switch then wait for Standard mode.
        // Even if they do not select Yes on the prompt. This still waits for standard mode
        // since standard mode switch can be triggered other ways.
    } else if (api.serverMode === ServerMode.LIGHTWEIGHT) {
        window.showInformationMessage(
            "Liberty Tools for VS Code requires the Java language server to run in Standard mode. " +
            "Do you want to switch it to Standard mode now?",
            "Yes",
            "Later"
        )
            .then((answer) => {
                if (answer === "Yes") {
                    commands.executeCommand("java.server.mode.switch", ServerMode.STANDARD, true);
                }
            });
        return new Promise((resolve) => {
            api.onDidServerModeChange((mode: string) => {
                if (mode === ServerMode.STANDARD) {
                    resolve();
                }
            });
        });
    }
}
