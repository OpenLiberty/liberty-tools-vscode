/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
import { LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION, LIBERTY_MAVEN_PROJECT_CONTAINER, LIBERTY_MAVEN_PROJECT } from "../definitions/constants";
import { BuildFileImpl } from "./buildFile";
import { localize } from "../util/i18nUtil";
import * as semver from "semver";

/**
 * Look for a valid parent pom.xml
 * A valid parent contains the liberty-maven-plguin in the plugin management section
 * Return BuildFile object
 * 
 * @param xmlString the xmlString version of the pom.xml
 */
export function validParentPom(xmlString: string): BuildFileImpl {
    const parseString = require("xml2js").parseString;
    let parentPom: BuildFileImpl = new BuildFileImpl(false, "");
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
                                        if (containerVersion(plugin[k])) {
                                            parentPom = new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT_CONTAINER);
                                            return;
                                        } else {
                                            parentPom = new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT);
                                            return;
                                        }
                                    }
                                    if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                        console.debug("Found boost-maven-plugin in the pom.xml");
                                        parentPom = new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // If no Liberty plugin found, check if this is an aggregator with modules
        // This allows intermediate aggregators to appear in the hierarchy
        if (!parentPom.isValidBuildFile() && result.project.modules !== undefined) {
            const modules = result.project.modules;
            for (let i = 0; i < modules.length; i++) {
                const module = modules[i].module;
                if (module !== undefined && module.length > 0) {
                    console.debug("Found aggregator pom.xml with modules");
                    parentPom = new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT);
                    return;
                }
            }
        }

        if (err) {
            console.error(localize("error.parsing.pom","Error parsing the pom " + err, err));
        }
    });
    return parentPom;
}

/**
 * Check a pom.xml to see if it contains the liberty-maven-plugin
 * pom.xml may either match a child pom artifactId, contain the plugin in the profiles section
 * or define the plugin in the build section
 * Return BuildFile object
 * 
 * @param xmlString string representation of the pom.xml
 * @param childrenMap map of all the children pom.xml identified
 */
export function validPom(xmlString: string, childrenMap: Map<string, string[]>): BuildFileImpl {
    const parseString = require("xml2js").parseString;
    let mavenPOM: BuildFileImpl = new BuildFileImpl(false, "");
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
                            mavenPOM = new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT);
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
                        const validPom: BuildFileImpl = mavenPluginDetected(profile[j].build);
                        if (validPom.isValidBuildFile()) {
                            mavenPOM = validPom;
                            return;
                        }
                    }
                }
            }
        }

        // check for liberty maven plugin in plugins
        const validPom: BuildFileImpl = mavenPluginDetected(result.project.build);
        if (validPom.isValidBuildFile()) {
            mavenPOM = validPom;
            return;
        }

        if (err) {
            console.error(localize("error.parsing.pom", "Error parsing the pom " + err, err));
            return;
        }
    });
    return mavenPOM;
}

/**
 * Check the build portion of a pom.xml for the liberty-maven-plugin
 * Return BuildFile object
 * 
 * @param build JS object of the build section in a pom.xml
 */
export function mavenPluginDetected(build: Array<{ plugins: Array<{ plugin: any }> }> | undefined): BuildFileImpl {
    if (build !== undefined) {
        for (let i = 0; i < build.length; i++) {
            const plugins = build[i].plugins;
            if (plugins !== undefined) {
                for (let j = 0; j < plugins.length; j++) {
                    const plugin = build[i].plugins[j].plugin;
                    if (plugin !== undefined) {
                        for (let k = 0; k < plugin.length; k++) {
                            if (plugin[k].artifactId[0] === "liberty-maven-plugin" && plugin[k].groupId[0] === "io.openliberty.tools") {
                                if (containerVersion(plugin[k])) {
                                    return (new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT_CONTAINER));
                                } else {
                                    return (new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT));
                                }
                            }
                            if (plugin[k].artifactId[0] === "boost-maven-plugin" && plugin[k].groupId[0] === "org.microshed.boost") {
                                console.debug("Found boost-maven-plugin in the pom.xml");
                                return (new BuildFileImpl(true, LIBERTY_MAVEN_PROJECT));
                            }
                        }
                    }
                }
            }
        }
    }
    return (new BuildFileImpl(false, ""));
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
            console.error(localize("error.parsing.pom", err));
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
function containerVersion(plugin: any): boolean {
    if (plugin.version === undefined) {
        return true;
    }
    if (plugin.version[0] !== undefined) {
        const version = semver.coerce(plugin.version[0]);
        if (version !== null) {
            return semver.gte(version, LIBERTY_MAVEN_PLUGIN_CONTAINER_VERSION);
        }
    }
    return false;
}

/**
 * Interface for Maven project metadata used in multi-module hierarchy
 */
export interface MavenProjectMetadata {
    artifactId: string;
    parentArtifactId?: string;
    modules: string[];
    hasLibertyPlugin: boolean;
    isAggregator: boolean;
    isLibertyEnabled: boolean;
    buildFilePath: string;
    contextValue: string;
    xmlString?: string;
}

/**
 * Extract metadata from a Maven POM file for multi-module support
 * @param pomPath Path to the pom.xml file
 * @param xmlString Optional XML string content (if already read)
 * @returns MavenProjectMetadata object
 */
export async function extractMavenMetadata(pomPath: string, xmlString?: string): Promise<MavenProjectMetadata> {
    const fse = require("fs-extra");
    const xml = xmlString || await fse.readFile(pomPath, "utf8");
    
    const metadata = parsePomXml(xml);
    metadata.buildFilePath = pomPath;
    metadata.xmlString = xml;
    
    return metadata;
}

/**
 * Parse POM XML to extract metadata
 * @param xmlString XML content of pom.xml
 * @returns MavenProjectMetadata object
 */
function parsePomXml(xmlString: string): MavenProjectMetadata {
    const parseString = require("xml2js").parseString;
    let metadata: MavenProjectMetadata = {
        artifactId: "",
        modules: [],
        hasLibertyPlugin: false,
        isAggregator: false,
        isLibertyEnabled: false,
        buildFilePath: "",
        contextValue: LIBERTY_MAVEN_PROJECT
    };
    
    parseString(xmlString, (err: any, result: any) => {
        if (err) {
            console.error(localize("error.parsing.pom", "Error parsing the pom " + err, err));
            return;
        }
        
        // Extract artifactId
        if (result.project.artifactId && result.project.artifactId[0] !== undefined) {
            metadata.artifactId = result.project.artifactId[0];
        }
        
        // Extract parent artifactId
        if (result.project.parent && result.project.parent[0].artifactId) {
            metadata.parentArtifactId = result.project.parent[0].artifactId[0];
        }
        
        // Extract modules
        if (result.project.modules) {
            metadata.modules = extractModulesFromPom(result.project.modules);
            if (metadata.modules.length > 0) {
                metadata.isAggregator = true;
            }
        }
        
        // Check for packaging type "pom"
        if (result.project.packaging && result.project.packaging[0] === "pom") {
            metadata.isAggregator = true;
        }
        
        // Check for Liberty Maven plugin
        metadata.hasLibertyPlugin = checkForLibertyMavenPlugin(result);
        metadata.isLibertyEnabled = metadata.hasLibertyPlugin;
        
        // Set context value based on plugin detection
        if (metadata.hasLibertyPlugin) {
            const buildFile = mavenPluginDetected(result.project.build);
            if (buildFile.isValidBuildFile()) {
                metadata.contextValue = buildFile.getProjectType();
            }
        }
    });
    
    return metadata;
}

/**
 * Extract module names from POM modules section
 * @param modules Modules section from parsed POM
 * @returns Array of module names
 */
function extractModulesFromPom(modules: any[]): string[] {
    const moduleNames: string[] = [];
    
    for (let i = 0; i < modules.length; i++) {
        const module = modules[i].module;
        if (module !== undefined) {
            for (let k = 0; k < module.length; k++) {
                moduleNames.push(module[k]);
            }
        }
    }
    
    return moduleNames;
}

/**
 * Check if POM contains Liberty Maven plugin
 * @param result Parsed POM object
 * @returns true if Liberty plugin is found
 */
function checkForLibertyMavenPlugin(result: any): boolean {
    // Check in build section
    if (result.project.build !== undefined) {
        const buildFile = mavenPluginDetected(result.project.build);
        if (buildFile.isValidBuildFile()) {
            return true;
        }
    }
    
    // Check in profiles
    if (result.project.profiles !== undefined) {
        for (let i = 0; i < result.project.profiles.length; i++) {
            const profile = result.project.profiles[i].profile;
            if (profile !== undefined) {
                for (let j = 0; j < profile.length; j++) {
                    const buildFile = mavenPluginDetected(profile[j].build);
                    if (buildFile.isValidBuildFile()) {
                        return true;
                    }
                }
            }
        }
    }
    
    // Check in pluginManagement
    if (result.project.build !== undefined) {
        for (let i = 0; i < result.project.build.length; i++) {
            const pluginManagement = result.project.build[i].pluginManagement;
            if (pluginManagement !== undefined) {
                const plugins = pluginManagement[0].plugins;
                if (plugins !== undefined) {
                    for (let j = 0; j < plugins.length; j++) {
                        const plugin = plugins[j].plugin;
                        if (plugin !== undefined) {
                            for (let k = 0; k < plugin.length; k++) {
                                if (plugin[k].artifactId[0] === "liberty-maven-plugin" && 
                                    plugin[k].groupId[0] === "io.openliberty.tools") {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return false;
}
