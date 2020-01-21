import * as fse from "fs-extra";
import * as path from "path";

/**
 * Check a build.gradle file for the liberty-gradle-plugin
 * Return true if the build.gradle contains applies the liberty plugin
 * @param buildFile JS object representation of the build.gradle
 */
export function validGradleBuild(buildFile: any): boolean {
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
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Get the name of a gradle project
 * If a settings.gradle exists with a name specified, return name
 * Else return the parent directory name of the build.gradle
 * @param path build.gradle location
 */
export async function getGradleProjetName(gradlePath: string): Promise<string> {
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
        }).catch((err: any) => console.error("Unable to parse settings.gradle: " + gradleSettings + "; " + err));
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
 * Returns children associated with the parent build.gradle
 * @param settingsFile settings.gradle file
 */
export function findChildGradleProjects(buildFile: any, settingsFile: any): string[] {
    let gradleChildren: string[] = [];
    let validGradleChildren: string[] = [];
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
        validGradleChildren = validParent(buildFile, gradleChildren);
    }
    return validGradleChildren;
}

function validParent(buildFile: any, gradleChildren: string[]): string[] {
    // every subproject listed in the include section of the parent is supported by the liberty-gradle-plugin
    if (validGradleBuild(buildFile.subprojects) || validGradleBuild(buildFile.allprojects)) {
        return gradleChildren;
    }
    return [];
}
