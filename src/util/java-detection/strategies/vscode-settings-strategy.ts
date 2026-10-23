/**
 * Copyright IBM Corp. 2026
 *
 *  Piority order for reading vs code settings:
 *   1. xml.java.home              
 *   2. java.configuration.runtimes 
 *   3. java.jdt.ls.java.home
 *   4. java.import.gradle.java.home
 *   5. java.import.maven.java.home
 *   6. java.home                 
 *
 */

import { Uri, workspace } from "vscode";
import { getRuntime } from "jdk-utils";
import { IJavaDetectStrategy, IJavaInstallation } from "../../javaSelector";

// shape of entries in java.configuration.runtimes
interface RuntimeConfig {
    name?: string;
    path: string;
    default?: boolean;
}

export const vscodeSettingsStrategy: IJavaDetectStrategy = {
    name: "vscode-settings" as const,

    async detect(scope?: Uri): Promise<IJavaInstallation[]> {
        const installations: IJavaInstallation[] = [];
        // When a project scope is provided (per-project terminal), read from that
        // project's .vscode/settings.json. Without a scope, reads global settings
        // (used for language server startup).
        const config = workspace.getConfiguration("", scope ?? null);

        // Check java.configuration.runtimes, same as AMA
        const runtimes = config.get<RuntimeConfig[]>("java.configuration.runtimes");
        // loop through each entry
        if (runtimes && Array.isArray(runtimes)) {
            let hasDefault = false;

            for (const runtime of runtimes) {
                if (!runtime.path) {
                    continue;
                }
                if (runtime.default) {
                    hasDefault = true;
                }

                const detected = await getRuntime(runtime.path, {
                    withVersion: true,
                    checkJavac: true,
                });

                installations.push({
                    path: runtime.path,
                    name: runtime.name,
                    isDefault: runtime.default,
                    version: detected?.version?.java_version ?? "",
                    majorVersion: detected?.version?.major ?? 0,
                    sources: [this.name],
                    isJdk: detected?.hasJavac,
                });
            }

            //  If no default: true was specified, we'll mark the first config with default
            if (!hasDefault && installations.length > 0) {
                installations[0].isDefault = true;
            }
        }

        // Helper to add installation from a simple string setting
        const addFromSetting = async (key: string) => {
            const value = config.get<string>(key)?.trim();
            if (value) {
                const detected = await getRuntime(value, {
                    withVersion: true,
                    checkJavac: true,
                });
                installations.push({
                    path: value,
                    version: detected?.version?.java_version ?? "",
                    majorVersion: detected?.version?.major ?? 0,
                    sources: [this.name],
                    isJdk: detected?.hasJavac,
                });
            }
        };

        // string settings in priority order
        await addFromSetting("xml.java.home");
        await addFromSetting("java.jdt.ls.java.home");
        await addFromSetting("java.import.gradle.java.home");
        await addFromSetting("java.import.maven.java.home");
        await addFromSetting("java.home"); // deprecated but still checked

        // returns array of IJavaInstallation objects
        return installations;
    },
};
