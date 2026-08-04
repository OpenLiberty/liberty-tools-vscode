/**
 * Copyright IBM Corp. 2025
 *
 *
 * Activates the redhat.java extension and reads api.javaRequirement.tooling_jre.
 * Returns empty silently if the Red Hat extension is not installed
 */

import { extensions } from "vscode";
import { getRuntime } from "jdk-utils";
import { javaRuntimeAsInstallation } from "./system-path-strategy";
import { IJavaDetectStrategy, IJavaInstallation } from "../../javaSelector";


export const redhatExtensionStrategy: IJavaDetectStrategy = {
    name: "redhat.java" as const,

    // scope is not used — the Red Hat embedded JRE is global, not project-scoped
    async detect(_scope?: import("vscode").Uri): Promise<IJavaInstallation[]> {
        const redhatExtension = extensions.getExtension(this.name);
        if (!redhatExtension) {
            // Red Hat Java not installed, return empty.
            return [];
        }

        try {
            // activate redhat extension 
            const api = await redhatExtension.activate();
            const jrePath: string | undefined = api?.javaRequirement?.tooling_jre;
            if (!jrePath) {
                return [];
            }

            // reads the JDK's release to get version number 
            const runtime = await getRuntime(jrePath, {
                withVersion: true,
                checkJavac: true,
            });

            if (!runtime) {
                return [];
            }

            return [javaRuntimeAsInstallation(runtime, [this.name])];
        } catch {
            // If the Red Hat extension fails to activate or its API changes,
            // return empty so other strategies run
            return [];
        }
    },
};
