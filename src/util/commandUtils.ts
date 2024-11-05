/**
 * Copyright (c) 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import * as Path from "path";
import * as vscode from "vscode";
import { pathExists } from "fs-extra";

/**
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/main/src/mavenTerminal.ts
 */
enum ShellType {
    CMD = "Command Prompt",
    POWERSHELL = "PowerShell",
    GIT_BASH = "Git Bash",
    WSL = "WSL Bash",
    OTHERS = "Others"
}
/**
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/main/src/mavenTerminal.ts
 */
function currentWindowsShell(): ShellType {
    const currentWindowsShellPath: string = vscode.env.shell;
    const executable: string = Path.basename(currentWindowsShellPath);
    switch (executable.toLowerCase()) {
        case "cmd.exe":
            return ShellType.CMD;
        case "pwsh.exe":
        case "powershell.exe":
        case "pwsh": // pwsh on mac/linux
            return ShellType.POWERSHELL;
        case "bash.exe":
        case 'git-cmd.exe':
            return ShellType.GIT_BASH;
        case 'wsl.exe':
        case 'ubuntu.exe':
        case 'ubuntu1804.exe':
        case 'kali.exe':
        case 'debian.exe':
        case 'opensuse-42.exe':
        case 'sles-12.exe':
            return ShellType.WSL;
        default:
            return ShellType.OTHERS;
    }
}

/**
 * Return the maven commands based on the OS and Terminal for start, startinContainer, start..
 */

export async function getCommandForMaven(pomPath: string, command: string, customCommand?: string): Promise<string> {

    // attempt to use the Maven executable path, if empty try using mvn or mvnw according to the preferMavenWrapper setting
    const mavenExecutablePath: string | undefined = vscode.workspace.getConfiguration("maven").get<string>("executable.path");

    if (mavenExecutablePath) {

        if (customCommand) {
            return `${mavenExecutablePath} ` + `${command}` + ` ${customCommand}` + ` -f "${pomPath}"`;
        }
        return `${mavenExecutablePath} ` + `${command}` + ` -f "${pomPath}"`;
    }

    let mvnCmdStart = await mvnCmd(pomPath);

    if (mvnCmdStart === "mvn") {
        if (customCommand) {
            return `${mvnCmdStart} ` + `${command}` + ` ${customCommand}` + ` -f "${pomPath}"`;
        }
        return `${mvnCmdStart} ` + `${command}` + ` -f "${pomPath}"`;
    }
    //checking the OS type for command customization
    if (isWin()) {
        switch (currentWindowsShell()) {
            case ShellType.GIT_BASH:
                if (customCommand) {
                    return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}` + ` ${customCommand}`; //Bash 
                }
                return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}`; //Bash for start..

            case ShellType.POWERSHELL: {
                mvnCmdStart = Path.join(mvnCmdStart, "mvnw.cmd");
                if (customCommand) {

                    return "& \"" + mvnCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -f "${pomPath}"`; //Poweshell for start..
                }
                return "& \"" + mvnCmdStart + "\" " + `${command}` + ` -f "${pomPath}"`; // PowerShell
            }
            case ShellType.CMD:
                mvnCmdStart = Path.join(mvnCmdStart, "mvnw.cmd");
                if (customCommand) {
                    return "\"" + mvnCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -f "${pomPath}"`; //cmd for start..
                }
                return "\"" + mvnCmdStart + "\" " + `${command}` + ` -f "${pomPath}"`; // CMD
            case ShellType.WSL:
                mvnCmdStart = toDefaultWslPath(mvnCmdStart);
                pomPath = toDefaultWslPath(pomPath);
                if (customCommand) {
                    return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}` + ` ${customCommand}`; //Wsl start ..  
                }
                return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}`; //Wsl  


            default:
                mvnCmdStart = Path.join(mvnCmdStart, "mvnw.cmd");
                if (customCommand) {
                    return "\"" + mvnCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -f "${pomPath}"`;
                }
                return "\"" + mvnCmdStart + "\" " + `${command}` + ` -f "${pomPath}"`;
        }
    } else {
        if (customCommand) {
            return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}` + ` ${customCommand}`;
        }
        return "cd \"" + mvnCmdStart + "\" && " + "./mvnw " + `${command}`;
    }

}

/**
 * Return the Gradle commands based on the OS and Terminal for start, startinContainer, start..
 */

export async function getCommandForGradle(buildGradlePath: string, command: string, customCommand?: string): Promise<string> {
    let gradleCmdStart = await gradleCmd(buildGradlePath);

    if (gradleCmdStart === "gradle") {
        if (customCommand) {
            return `${gradleCmdStart} ` + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`;
        }
        return `${gradleCmdStart} ` + `${command}` + ` -b="${buildGradlePath}"`;
    }
    //checking the OS type for command customization
    if (isWin()) {
        return getGradleCommandsForWin(gradleCmdStart, buildGradlePath, command, customCommand);
    } else {
        gradleCmdStart = Path.join(gradleCmdStart, "gradlew");
        if (customCommand) {
            return "\"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`;
        }
        return "\"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`;
    }

}

/**
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/main/src/mavenTerminal.ts
 */

function toDefaultWslPath(p: string): string {
    const arr: string[] = p.split(":\\");
    if (arr.length === 2) {
        const drive: string = arr[0].toLowerCase();
        const dir: string = arr[1].replace(/\\/g, "/");
        return `/mnt/${drive}/${dir}`;
    } else {
        return p.replace(/\\/g, "/");
    }
}

/**
 * Return the Gradle commands for windows OS based on the terminal configured
 */

function getGradleCommandsForWin(gradleCmdStart: string, buildGradlePath: string, command: string, customCommand?: string): string {
    switch (currentWindowsShell()) {
        case ShellType.GIT_BASH:
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew");
            if (customCommand) {
                return "\"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`; //bash start..
            }
            return "\"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`; //Bash
        case ShellType.POWERSHELL: {
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew.bat");
            if (customCommand) {
                return "& \"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`;// PowerShell strat..
            }
            return "& \"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`;// PowerShell
        }
        case ShellType.CMD:
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew.bat");
            if (customCommand) {
                return "\"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`; // CMD start..
            }
            return "\"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`; // CMD
        case ShellType.WSL:
            buildGradlePath = toDefaultWslPath(buildGradlePath);
            gradleCmdStart = toDefaultWslPath(gradleCmdStart)
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew");
            if (customCommand) {
                return "\"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`; //wsl start..
            }
            return "\"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`; //wsl
        default:
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew.bat");
            if (customCommand) {
                "\"" + gradleCmdStart + "\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`;
            }
            return "\"" + gradleCmdStart + "\" " + `${command}` + ` -b="${buildGradlePath}"`;
    }
}
/**
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 */
function isWin(): boolean {
    return process.platform.startsWith("win");
}


// return Maven executable path, Maven wrapper, or mvn
async function mvnCmd(pomPath: string): Promise<string> {
    const preferMavenWrapper: boolean | undefined = vscode.workspace.getConfiguration("maven").get<boolean>("executable.preferMavenWrapper");
    if (preferMavenWrapper) {
        const localMvnwPath: string | undefined = await getLocalMavenWrapper(Path.dirname(pomPath));
        if (localMvnwPath) {
            return `${localMvnwPath}`;
        }
    }
    return "mvn";
}

async function gradleCmd(buildGradle: string): Promise<string> {
    const preferGradleWrapper: boolean | undefined = vscode.workspace.getConfiguration("java").get<boolean>("import.gradle.wrapper.enabled");
    if (preferGradleWrapper) {
        const localGradlewPath: string | undefined = await getLocalGradleWrapper(Path.dirname(buildGradle));
        if (localGradlewPath) {
            return `${localGradlewPath}`;
        }
    }
    return "gradle";
}
/**
 * Search for potential Maven wrapper, return undefined if does not exist
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 * @param projectFolder
 */
async function getLocalMavenWrapper(projectFolder: string): Promise<string | undefined> {

    let current: string = projectFolder;
    while (Path.basename(current)) {
        const potentialMvnwPath: string = Path.join(current);

        if (await pathExists(potentialMvnwPath)) {
            return potentialMvnwPath;
        }
        current = Path.dirname(current);
    }
    return undefined;
}
/**
 * Search for potential Gradle wrapper, return undefined if it does not exist
 * Modified from vscode-maven, see getLocalMavenWrapper method above
 * @param projectFolder
 */
async function getLocalGradleWrapper(projectFolder: string): Promise<string | undefined> {

    let current: string = projectFolder;
    while (Path.basename(current)) {
        const potentialGradlewPath: string = Path.join(current);
        if (await pathExists(potentialGradlewPath)) {
            return potentialGradlewPath;
        }
        current = Path.dirname(current);
    }
    return undefined;
}


