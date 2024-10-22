import * as Path from "path";
import * as vscode from "vscode";
import { isWin } from "../liberty/devCommands";

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
 * Return the maven commands based on the OS and Terminal 
 */
export function getCommandForMaven(mvnCmdStart: string, pomPath: string,command:string,customCommand?: string) : string {

    if (isWin()) {
        switch (currentWindowsShell()) {
            case ShellType.GIT_BASH:
                if(customCommand){
                    return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+ ` ${customCommand}` +` -f "${pomPath}"`; //Bash 
                }
                return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+ ` -f "${pomPath}"`; //Bash for start..
                
            case ShellType.POWERSHELL: {
                mvnCmdStart=Path.join(mvnCmdStart, "mvnw.cmd");
                if(customCommand){

                    return "& \""+ mvnCmdStart +"\" " + `${command}`+` ${customCommand}` +` -f "${pomPath}"`; //Poweshell for start..
                }
                return   "& \""+ mvnCmdStart +"\" " + `${command}`+ ` -f "${pomPath}"`; // PowerShell
            }
            case ShellType.CMD:
                mvnCmdStart=Path.join(mvnCmdStart, "mvnw.cmd");
                if(customCommand){

                return "\""+ mvnCmdStart +"\" " + `${command}`+` ${customCommand}` + ` -f "${pomPath}"`; //cmd for start..
                }
                return   "\""+ mvnCmdStart +"\" " + `${command}`+ ` -f "${pomPath}"`; // CMD
            case ShellType.WSL:
                mvnCmdStart=toDefaultWslPath(mvnCmdStart);
                pomPath=toDefaultWslPath(pomPath);
                if(customCommand){
                    return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+ ` ${customCommand}` +` -f "${pomPath}"`; //Bash 
                }
                return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+ ` -f "${pomPath}"`; //Bash for start..
                    
        
            default:
                mvnCmdStart=Path.join(mvnCmdStart, "mvnw.cmd");
                if(customCommand){
                    return "\""+ mvnCmdStart +"\" " + `${command}`+` ${customCommand}` + ` -f "${pomPath}"`; 
                }
                return   "\""+ mvnCmdStart +"\" " + `${command}`+ ` -f "${pomPath}"`;  
        }
    } else {
        if(customCommand){
            return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+` ${customCommand}` + ` -f "${pomPath}"`;
        }
        return "cd \""+ mvnCmdStart +"\" && "+"./mvnw "+`${command}`+ ` -f "${pomPath}"`;
    }

}

/**
 * Return the Gradle commands based on the OS and Terminal 
 */
export function getCommandForGradle(gradleCmdStart: string, buildGradlePath: string, command: string, customCommand?: string) : string {

    if (isWin()) {
        switch (currentWindowsShell()) {
            case ShellType.GIT_BASH:
                gradleCmdStart=Path.join(gradleCmdStart, "gradlew");
                if(customCommand){
                    return "\""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` +  ` -b="${buildGradlePath}"`; //bash start..
                }
                return "\""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`; //Bash
            case ShellType.POWERSHELL: {
                gradleCmdStart=Path.join(gradleCmdStart, "gradlew.bat");
                if(customCommand){
                    return   "& \""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` +  ` -b="${buildGradlePath}"`;// PowerShell strat..
                }
                return   "& \""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`;// PowerShell
            }
            case ShellType.CMD:
                gradleCmdStart=Path.join(gradleCmdStart, "gradlew.bat");
                if(customCommand){
                    return   "\""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` +  ` -b="${buildGradlePath}"`; // CMD start..
                }
                return   "\""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`; // CMD
            case ShellType.WSL:
                buildGradlePath=toDefaultWslPath(buildGradlePath);
                gradleCmdStart=toDefaultWslPath(gradleCmdStart)
                gradleCmdStart=Path.join(gradleCmdStart, "gradlew");
                if(customCommand){
                    return "\""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` +  ` -b="${buildGradlePath}"`; //wsl start..
                }
                return "\""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`; //wsl
            default:
                gradleCmdStart=Path.join(gradleCmdStart, "gradlew.bat");
                if(customCommand){
                    "\""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` + ` -b="${buildGradlePath}"`;
                }
                return "\""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`;
        }
    } else {
        gradleCmdStart=Path.join(gradleCmdStart, "gradlew");
        if(customCommand){
            return   "\""+ gradleCmdStart +"\" " + `${command}` + ` ${customCommand}` +  ` -b="${buildGradlePath}"`;
        }
        return   "\""+ gradleCmdStart +"\" " + `${command}` + ` -b="${buildGradlePath}"`; 
    }

}

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