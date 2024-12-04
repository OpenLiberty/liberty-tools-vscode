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
 * Return the maven command based on the OS and Terminal for start, start in container, start..
 */
export async function getCommandForMaven(pomPath: string, command: string, terminalType?: string, customCommand?: string): Promise<string> {

    // attempt to use the Maven executable path, if empty try using mvn or mvnw according to the preferMavenWrapper setting
    const mavenExecutablePath: string | undefined = vscode.workspace.getConfiguration("maven").get<string>("executable.path");
    if (mavenExecutablePath) {
        if (isWin() && terminalType === ShellType.POWERSHELL) {
            /**
            * Function call to get the command for powershell in Windows OS
            */
            return formPowershellCommand(mavenExecutablePath, pomPath, command, "-f ", customCommand);
        }
        return formDefaultCommandWithPath(mavenExecutablePath, pomPath, command, "-f ", customCommand);
    }
    let mvnCmdStart = await mvnCmd(pomPath);
    if (mvnCmdStart === "mvn") {
        return formDefaultCommand(mvnCmdStart, pomPath, command, "-f ", customCommand);
    }
    //checking the OS type for command customization
    if (isWin()) {
        return getMavenCommandForWin(mvnCmdStart, pomPath, command, terminalType, customCommand);
    } else {
        return formLinuxBasedCommand(mvnCmdStart, command, "./mvnw ", customCommand);
    }
}

/**
 * Return the gradle command based on the OS and Terminal for start, start in container, start..
 */
export async function getCommandForGradle(buildGradlePath: string, command: string, terminalType?: String, customCommand?: string): Promise<string> {
    let gradleCmdStart = await gradleCmd(buildGradlePath);

    if (gradleCmdStart === "gradle") {
        return formDefaultCommand(gradleCmdStart, buildGradlePath, command, "-b=", customCommand);
    }
    //checking the OS type for command customization
    if (isWin()) {
        return getGradleCommandForWin(gradleCmdStart, buildGradlePath, command, terminalType, customCommand);
    } else {
        gradleCmdStart = Path.join(gradleCmdStart, "gradlew");
        return formDefaultCommandWithPath(gradleCmdStart, buildGradlePath, command, "-b=", customCommand);
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
 * Reused from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 */
export function isWin(): boolean {
    return process.platform.startsWith("win");
}

/**
 * Returns maven wrapper path or mvn
 */
async function mvnCmd(pomPath: string): Promise<string> {
    const preferMavenWrapper: boolean | undefined = vscode.workspace.getConfiguration("maven").get<boolean>("executable.preferMavenWrapper");
    if (preferMavenWrapper) {
        const localMvnwPath: string | undefined = await getLocalMavenWrapperDir(Path.dirname(pomPath));
        if (localMvnwPath) {
            return `${localMvnwPath}`;
        }
    }
    return "mvn";
}

/**
 * Returns gradle wrapper path or gradle
 */
async function gradleCmd(buildGradle: string): Promise<string> {
    const preferGradleWrapper: boolean | undefined = vscode.workspace.getConfiguration("java").get<boolean>("import.gradle.wrapper.enabled");
    if (preferGradleWrapper) {
        const localGradlewPath: string | undefined = await getLocalGradleWrapperDir(Path.dirname(buildGradle));
        if (localGradlewPath) {
            return `${localGradlewPath}`;
        }
    }
    return "gradle";
}

/**
 * Search for potential Gradle wrapper, return undefined if does not exist
 * Modified from vscode-maven, see getLocalMavenWrapperDir method below
 * @param projectFolder
 */
async function getLocalGradleWrapperDir(projectFolder: string): Promise<string | undefined> {
    const gradlew: string = isWin() ? "gradlew.bat" : "gradlew";
    // walk up parent folders
    let currentDir: string = projectFolder;
    while (Path.basename(currentDir)) {
        const potentialGradlewPath: string = Path.join(currentDir, gradlew);
        if (await pathExists(potentialGradlewPath)) {
            return currentDir;
        }
        currentDir = Path.dirname(currentDir);
    }
    return undefined;
}

/**
 * Search for potential Maven wrapper, return undefined if it does not exist
 * Modified from vscode-maven
 * https://github.com/microsoft/vscode-maven/blob/2ab8f392f418c8e0fe2903387f2b0013a1c50e78/src/utils/mavenUtils.ts
 * @param projectFolder
 */
async function getLocalMavenWrapperDir(projectFolder: string): Promise<string | undefined> {
    const mvnw: string = isWin() ? "mvnw.cmd" : "mvnw";
    // walk up parent folders
    let currentDir: string = projectFolder;
    while (Path.basename(currentDir)) {
        const potentialMvnwPath: string = Path.join(currentDir, mvnw);
        if (await pathExists(potentialMvnwPath)) {
            return currentDir;
        }
        currentDir = Path.dirname(currentDir);
    }
    return undefined;
}

/**
 * Returns the gradle command for windows OS based on the terminal configured
 */
function getGradleCommandForWin(gradleCmdStart: string, buildGradlePath: string, command: string, terminalType?: String, customCommand?: string): string {
    switch (terminalType) {
        case ShellType.GIT_BASH:
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew");
            return formDefaultCommandWithPath(gradleCmdStart, buildGradlePath, command, "-b=", customCommand); //Bash
        case ShellType.POWERSHELL:
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew.bat");
            return formPowershellCommand(gradleCmdStart, buildGradlePath, command, "-b=", customCommand);
        case ShellType.WSL:
            return formLinuxBasedCommand(toDefaultWslPath(gradleCmdStart), command, "./gradlew ", customCommand); //Wsl
        default:
            // The default case is ShellType CMD or OTHERS
            gradleCmdStart = Path.join(gradleCmdStart, "gradlew.bat");
            return formDefaultCommandWithPath(gradleCmdStart, buildGradlePath, command, "-b=", customCommand);
    }
}

/**
 * Returns the maven command for windows OS based on the terminal configured
 */
function getMavenCommandForWin(mvnCmdStart: string, pomPath: string, command: string, terminalType?: String, customCommand?: string): string {
    switch (terminalType) {
        case ShellType.GIT_BASH:
            return formLinuxBasedCommand(mvnCmdStart, command, "./mvnw ", customCommand);
        case ShellType.POWERSHELL:
            mvnCmdStart = Path.join(mvnCmdStart, "mvnw.cmd");
            return formPowershellCommand(mvnCmdStart, pomPath, command, "-f ", customCommand);
        case ShellType.WSL:
            mvnCmdStart = toDefaultWslPath(mvnCmdStart);
            return formLinuxBasedCommand(mvnCmdStart, command, "./mvnw ", customCommand);
        default:
            // The default case is ShellType CMD or OTHERS
            mvnCmdStart = Path.join(mvnCmdStart, "mvnw.cmd");
            return formDefaultCommandWithPath(mvnCmdStart, pomPath, command, "-f ", customCommand);
    }
}

/**
 * Returns the Powershell based command for windows OS
 */
function formPowershellCommand(cmdStart: string, projectPath: string, command: string, cmdOption: String, customCommand?: string): string {
    if (customCommand) {
        return "& \"" + cmdStart + "\" " + `${command}` + ` ${customCommand}` + ` ${cmdOption}"${projectPath}"`; //Powershell for start..
    }
    return "& \"" + cmdStart + "\" " + `${command}` + ` ${cmdOption}"${projectPath}"`;  //PowerShell
}

/**
 * Returns the Linux based command
 */
function formLinuxBasedCommand(cmdStart: string, command: string, wrapperType: String, customCommand?: string): string {
    if (customCommand) {
        return "cd \"" + cmdStart + "\" && " + `${wrapperType}` + `${command}` + ` ${customCommand}`; //Bash or WSL for start..
    }
    return "cd \"" + cmdStart + "\" && " + `${wrapperType}` + `${command}`; //Bash or WSL command
}

/**
 * Returns default command
 */
function formDefaultCommand(projectPath: string, buildFilePath: String, command: string, cmdOption: String, customCommand?: string): string {
    if (customCommand) {
        return `${projectPath} ` + `${command}` + ` ${customCommand}` + ` ${cmdOption}"${buildFilePath}"`;
    }
    return `${projectPath} ` + `${command}` + ` ${cmdOption}"${buildFilePath}"`;
}

/**
 * Returns default format for the command with Path  
 */
function formDefaultCommandWithPath(projectPath: string, buildFilePath: String, command: string, cmdOption: String, customCommand?: string): string {
    if (customCommand) {
        return "\"" + projectPath + "\" " + `${command}` + ` ${customCommand}` + ` ${cmdOption}"${buildFilePath}"`;
    }
    return "\"" + projectPath + "\" " + `${command}` + ` ${cmdOption}"${buildFilePath}"`;
}

/**
 * Reused from vscode-maven - currentWindowsShell()
 * https://github.com/microsoft/vscode-maven/blob/main/src/mavenTerminal.ts
 * method to fetch default terminal configured
 */
export function defaultWindowsShell(): ShellType {
    const defaultWindowsShellPath: string = vscode.env.shell;
    const executable: string = Path.basename(defaultWindowsShellPath);
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


