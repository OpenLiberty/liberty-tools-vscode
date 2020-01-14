/**
 * Look for a valid parent pom.xml
 * A valid parent contains the liberty-maven-plguin in the plugin management section
 * Return true if the pom is a valid parent pom.xml
 * @param xmlString the xmlString version of the pom.xml
 */
export function validParentPom(xmlString: String) {
    var parseString = require('xml2js').parseString;
    var parentPom = false;
    parseString(xmlString, function (err: any, result: any) {

        // check for liberty maven plugin or boost maven plugin in plugin management
        if (result.project.build !== undefined) {
            for (var i = 0; i < result.project.build.length; i++) {
                var pluginManagement = result.project.build[i].pluginManagement;
                if (pluginManagement !== undefined) {
                    var plugins = pluginManagement[i].plugins;
                    if (plugins !== undefined) {
                        for (var j = 0; j < plugins.length; j++) {
                            var plugin = plugins[j].plugin;
                            if (plugin !== undefined) {
                                for (var k = 0; k < plugin.length; k++) {
                                    if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] == "io.openliberty.tools") {
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
export function validPom(xmlString: String, childrenMap: Map<string, String[]>) {
    var parseString = require('xml2js').parseString;
    var validPom = false;
    parseString(xmlString, function (err: any, result: any) {

        // check if the artifactId matches one of the modules found in a parent pom
        if (result.project.artifactId[0] !== undefined && result.project.parent !== undefined && result.project.parent[0].artifactId !== undefined) {
            if (childrenMap.has(result.project.parent[0].artifactId[0])) {
                var modules = childrenMap.get(result.project.parent[0].artifactId[0]);
                if (modules !== undefined) {
                    for (let module of modules) {
                        if (module === result.project.artifactId[0]) {
                            validPom = true;
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in profiles
        if (result.project.profiles !== undefined) {
            for (var i = 0; i < result.project.profiles.length; i++) {
                var profile = result.project.profiles[i].profile;
                if (profile !== undefined) {
                    for (var j = 0; j < profile.length; j++) {
                        if (mavenPluginDetected(profile[j].build)) {
                            validPom = true;
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in plugins 
        if (mavenPluginDetected(result.project.build)) {
            validPom = true;
            return;
        }

        if (err) {
            console.error("Error parsing the pom " + err);
            return;
        }
    });
    return validPom;
}

/**
 * Check the build portion of a pom.xml for the liberty-maven-plugin
 * Return true if the liberty-maven-plugin is found
 * @param build JS object of the build section in a pom.xml
 */
function mavenPluginDetected(build: { plugins: { plugin: any; }[]; }[] | undefined) {
    if (build !== undefined) {
        for (var i = 0; i < build.length; i++) {
            var plugins = build[i].plugins;
            if (plugins !== undefined) {
                for (var j = 0; j < plugins.length; j++) {
                    var plugin = build[i].plugins[j].plugin;
                    if (plugin !== undefined) {
                        for (var k = 0; k < plugin.length; k++) {
                            if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
                                console.debug("Found liberty-maven-plugin in the pom.xml");
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
}

/**
 * Given a parent pom find the corresponding child modules
 * @param xmlString parent pom.xml
 */
export function findChildMavenModules(xmlString: String): Map<string, String[]> {
    var parseString = require('xml2js').parseString;
    var childrenMap: Map<string, String[]> = new Map();
    var children: String[] = [];
    parseString(xmlString, function (err: any, result: any) {
        var artifactId = "";
        if (result.project.artifactId[0] !== undefined) {
            artifactId = result.project.artifactId[0];
        }
        var modules = result.project.modules;
        if (modules !== undefined && artifactId !== undefined) {
            for (var i = 0; i < modules.length; i++) {
                var module = modules[i].module;
                if (module !== undefined) {
                    for (var k = 0; k < module.length; k++) {
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