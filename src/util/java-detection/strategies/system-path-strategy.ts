/**
 * Copyright IBM Corp. 2026
 * 
 * system path detection via jdk-utils.
 *
 * Calls findRuntimes() which handles JAVA_HOME, JDK_HOME and a full OS scan
 * (Homebrew, SDKMAN, jEnv, etc.)
 *
 */

import { findRuntimes, IJavaRuntime } from "jdk-utils";
import { IJavaDetectStrategy, IJavaInstallation } from "../../javaSelector";

export const systemPathStrategy: IJavaDetectStrategy = {
    name: "system-path" as const,

    // scope is not used — system-path is machine-wide, not project-scoped
    async detect(_scope?: import("vscode").Uri): Promise<IJavaInstallation[]> {
        try {
            const runtimes: IJavaRuntime[] = await findRuntimes({
                withVersion: true,
                checkJavac: true,
            });
            return runtimes.map((runtime) => javaRuntimeAsInstallation(runtime, [this.name]));
        } catch {
            // Return empty array on error 
            return [];
        }
    },
};

// Same as AMA logic
export function javaRuntimeAsInstallation(runtime: IJavaRuntime, sources: string[]): IJavaInstallation {
    if (runtime.isJavaHomeEnv) {
        sources.push("JAVA_HOME");
    } else if (runtime.isJdkHomeEnv) {
        sources.push("JDK_HOME");
    }

    return {
        path: runtime.homedir,
        version: runtime.version?.java_version ?? "",
        majorVersion: runtime.version?.major ?? 0,
        sources,
        isJdk: runtime.hasJavac,
    };
}
