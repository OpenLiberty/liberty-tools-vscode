/**
 * Look for a valid parent pom.xml
 * A valid parent contains the liberty-maven-plguin in the plugin management section
 * Return true if the pom is a valid parent pom.xml
 * @param xmlString the xmlString version of the pom.xml
 */
export function validParentPom(xmlString: string): boolean {
    const parseString = require("xml2js").parseString;
    let parentPom = false;
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
                                        parentPom = true;
                                    }
                                    if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                        console.debug("Found boost-maven-plugin in the pom.xml");
                                        parentPom = true;
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
 * Pom.xml may either match a child pom artifactId, contain the plugin in the profiles section
 * or define the plugin in the build section
 * Return true if the pom.xml contains the plugin
 * @param xmlString string representation of the pom.xml
 * @param childrenMap map of all the children pom.xml identified
 */
export function validPom(xmlString: string, childrenMap: Map<string, string[]>): boolean {
    const parseString = require("xml2js").parseString;
    let isValidPom = false;
    parseString(xmlString, (err: any, result: any) => {

        // check if the artifactId matches one of the modules found in a parent pom
        if (result.project.artifactId[0] !== undefined && result.project.parent !== undefined && result.project.parent[0].artifactId !== undefined) {
            if (childrenMap.has(result.project.parent[0].artifactId[0])) {
                const modules = childrenMap.get(result.project.parent[0].artifactId[0]);
                if (modules !== undefined) {
                    for (const module of modules) {
                        if (module === result.project.artifactId[0]) {
                            isValidPom = true;
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
                        if (mavenPluginDetected(profile[j].build)) {
                            isValidPom = true;
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in plugins
        if (mavenPluginDetected(result.project.build)) {
            isValidPom = true;
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
 * Return true if the liberty-maven-plugin is found
 * @param build JS object of the build section in a pom.xml
 */
function mavenPluginDetected(build: Array<{ plugins: Array<{ plugin: any }> }> | undefined): boolean {
    if (build !== undefined) {
        for (let i = 0; i < build.length; i++) {
            const plugins = build[i].plugins;
            if (plugins !== undefined) {
                for (let j = 0; j < plugins.length; j++) {
                    const plugin = build[i].plugins[j].plugin;
                    if (plugin !== undefined) {
                        for (let k = 0; k < plugin.length; k++) {
                            if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
                                return true;
                            }
                            if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                console.debug("Found boost-maven-plugin in the pom.xml");
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
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
