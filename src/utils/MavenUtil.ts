import { LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_MAVEN_PROJECT } from "./constants";
import { Console } from "console";

/**
 * Look for a valid parent pom.xml
 * A valid parent contains the liberty-maven-plguin in the plugin management section
 *  Return [true, liberty project type] if valid, else [false, ""]
 * 
 * @param xmlString the xmlString version of the pom.xml
 */
export function validParentPom(xmlString: string): [boolean, string] {
    const parseString = require("xml2js").parseString;
    let parentPom: [boolean, string] = [false, ""];
    parseString(xmlString, (err: any, result: any) => {

        // check for liberty maven plugin or boost maven plugin in plugin management
        if (result.project.build !== undefined) {
            for (let i = 0; i < result.project.build.length; i++) {
                const pluginManagement = result.project.build[i].pluginManagement;
                if (pluginManagement !== undefined) {
                    const plugins = pluginManagement[i].plugins;
                    if (plugins !== undefined) {
                        for (let j = 0; j < plugins.length; j++) {
                            const plugin = plugins[j].plugin;
                            if (plugin !== undefined) {
                                for (let k = 0; k < plugin.length; k++) {
                                    if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
                                        console.debug("Found liberty-maven-plugin in the pom.xml plugin management");
                                        if (mavenPluginVersionValid(plugin[k])) {
                                            parentPom = [true, LIBERTY_MAVEN_PROJECT_CONTAINER];
                                            return;
                                        } else {
                                            parentPom = [true, LIBERTY_MAVEN_PROJECT];
                                            return;
                                        }
                                    }
                                    if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                        console.debug("Found boost-maven-plugin in the pom.xml");
                                        parentPom = [true, LIBERTY_MAVEN_PROJECT];
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (err) {
            console.error("Error parsing the pom " + err);
        }
    });
    return parentPom;
}

/**
 * Check a pom.xml to see if it contains the liberty-maven-plugin
 * pom.xml may either match a child pom artifactId, contain the plugin in the profiles section
 * or define the plugin in the build section
 * Return [true, liberty project type] if valid, else [false, ""]
 * 
 * @param xmlString string representation of the pom.xml
 * @param childrenMap map of all the children pom.xml identified
 */
export function validPom(xmlString: string, childrenMap: Map<string, string[]>): [boolean, string] {
    const parseString = require("xml2js").parseString;
    let isValidPom: [boolean, string] = [false, ""];
    parseString(xmlString, (err: any, result: any) => {

        // check if the artifactId matches one of the modules found in a parent pom
        if (result.project.arifactId !== undefined && result.project.artifactId[0] !== undefined
            && result.project.parent !== undefined && result.project.parent[0].artifactId !== undefined) {
            if (childrenMap.has(result.project.parent[0].artifactId[0])) {
                const modules = childrenMap.get(result.project.parent[0].artifactId[0]);
                if (modules !== undefined) {
                    for (const module of modules) {
                        if (module === result.project.artifactId[0]) {
                            // TODO: add ability to detect version of LMP once multi-module project scenarios are defined
                            // @see https://github.com/OpenLiberty/open-liberty-tools-vscode/issues/61
                            // @see https://github.com/OpenLiberty/open-liberty-tools-vscode/issues/26 
                            isValidPom = [true, LIBERTY_MAVEN_PROJECT];
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in profiles
        if (result.project.profiles !== undefined) {
            for (let i = 0; i < result.project.profiles.length; i++) {
                const profile = result.project.profiles[i].profile;
                if (profile !== undefined) {
                    for (let j = 0; j < profile.length; j++) {
                        const validPom = mavenPluginDetected(profile[j].build);
                        if (validPom[0]) {
                            isValidPom = validPom;
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in plugins
        const validPom = mavenPluginDetected(result.project.build);
        if (validPom[0]) {
            isValidPom = validPom;
            return;
        }

        if (err) {
            console.error("Error parsing the pom " + err);
            return;
        }
    });
    return isValidPom;
}

/**
 * Check the build portion of a pom.xml for the liberty-maven-plugin
 * Return [true, liberty project type] if liberty-maven-plugin is found
 * else [false, ""]
 * 
 * @param build JS object of the build section in a pom.xml
 */
export function mavenPluginDetected(build: Array<{ plugins: Array<{ plugin: any }> }> | undefined): [boolean, string] {
    if (build !== undefined) {
        for (let i = 0; i < build.length; i++) {
            const plugins = build[i].plugins;
            if (plugins !== undefined) {
                for (let j = 0; j < plugins.length; j++) {
                    const plugin = build[i].plugins[j].plugin;
                    if (plugin !== undefined) {
                        for (let k = 0; k < plugin.length; k++) {
                            if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
                                if (mavenPluginVersionValid(plugin[k])) {
                                    return [true, LIBERTY_MAVEN_PROJECT_CONTAINER]
                                } else {
                                    return [true, LIBERTY_MAVEN_PROJECT]
                                }
                            }
                            if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                console.debug("Found boost-maven-plugin in the pom.xml");
                                return [true, LIBERTY_MAVEN_PROJECT]
                            }
                        }
                    }
                }
            }
        }
    }
    return [false, ""];
}

/**
 * Given a parent pom find the corresponding child modules
 * @param xmlString parent pom.xml
 */
export function findChildMavenModules(xmlString: string): Map<string, string[]> {
    const parseString = require("xml2js").parseString;
    const childrenMap: Map<string, string[]> = new Map();
    const children: string[] = [];
    parseString(xmlString, (err: any, result: any) => {
        let artifactId = "";
        if (result.project.artifactId[0] !== undefined) {
            artifactId = result.project.artifactId[0];
        }
        const modules = result.project.modules;
        if (modules !== undefined && artifactId !== undefined) {
            for (let i = 0; i < modules.length; i++) {
                const module = modules[i].module;
                if (module !== undefined) {
                    for (let k = 0; k < module.length; k++) {
                        children.push(module[k]);
                    }
                }
            }
        }

        if (children.length !== 0) {
            childrenMap.set(artifactId, children);
        }

        if (err) {
            console.error("Error parsing the pom " + err);
        }
    });
    return childrenMap;
}

/**
 * Return true if the liberty-maven-plugin version is compatible
 * for dev mode with containers 
 * 
 * @param plugin JS object for liberty-maven-plugin
 */
function mavenPluginVersionValid(plugin: any): boolean {
    if (plugin.version === undefined) {
        return true;
    }
    if (plugin.version[0] !== undefined) {
        // grab the first 2 digits, ie. if version is 3.3.1 return a float of `3.3`
        let versionStart = plugin.version[0].substring(0,3);
        if (parseFloat(versionStart) >= LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION) {
            return true;
        }
    }
    return false;
}
