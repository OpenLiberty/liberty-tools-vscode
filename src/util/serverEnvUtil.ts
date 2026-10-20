/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import * as fs from "fs";
import * as path from "path";
import {
    DEFAULT_DEVMODE_DEBUG_PORT,
    GRADLE_DEVMODE_DEBUG_PORT_PREFIX,
    MAVEN_DEVMODE_DEBUG_PORT_PREFIX,
} from "../definitions/constants";

/** Matches a WLP_DEBUG_ADDRESS=<port> line (one line, already trimmed). */
const WLP_DEBUG_ADDRESS_LINE_REGEX = /^WLP_DEBUG_ADDRESS=(\d+)$/;

/** Location of the user-authored server.env relative to the project directory. */
export const SOURCE_SERVER_ENV_RELATIVE_PATH = path.join("src", "main", "liberty", "config", "server.env");

/**
 * Parse WLP_DEBUG_ADDRESS=<port> from the text of a server.env file.
 * The LAST occurrence wins (that is the value the JVM ends up with). Comments, blank
 * lines and CRLF line endings are tolerated. Pure function: no I/O.
 *
 * @param serverEnvText contents of a server.env file
 * @returns the port as a string, or undefined if no valid WLP_DEBUG_ADDRESS line exists
 */
export function parseDebugPortFromServerEnv(serverEnvText: string): string | undefined {
    let port: string | undefined;
    for (const rawLine of serverEnvText.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith("#")) { continue; }
        const match = WLP_DEBUG_ADDRESS_LINE_REGEX.exec(line);
        if (match) {
            port = match[1];
        }
    }
    return port;
}

/**
 * Read <projectDir>/src/main/liberty/config/server.env if it exists and return the
 * WLP_DEBUG_ADDRESS port it declares (last occurrence wins).
 *
 * @param projectDir absolute path of the project directory (Maven or Gradle)
 * @returns the port as a string, or undefined if the file is absent, unreadable or has no match
 */
export function readDebugPortFromSourceServerEnv(projectDir: string): string | undefined {
    const serverEnvPath = path.join(projectDir, SOURCE_SERVER_ENV_RELATIVE_PATH);
    try {
        if (!fs.existsSync(serverEnvPath)) { return undefined; }
        return parseDebugPortFromServerEnv(fs.readFileSync(serverEnvPath, "utf8"));
    } catch {
        return undefined;
    }
}

/**
 * Resolve the effective debug port for a Liberty project.
 * Precedence:
 * 1. WLP_DEBUG_ADDRESS in <projectDir>/src/main/liberty/config/server.env
 * 2. Default port "7777"
 *
 * @param projectDir absolute path of the project directory
 * @returns the resolved debug port as a string
 */
export function resolveDebugPort(projectDir: string): string {
    return readDebugPortFromSourceServerEnv(projectDir) ?? DEFAULT_DEVMODE_DEBUG_PORT;
}

/**
 * Build the dev-mode debug port command-line parameter.
 * E.g. "-DdebugPort=7777" for Maven or "--libertyDebugPort=7777" for Gradle.
 *
 * @param isMavenProject whether the target project is Maven (false for Gradle)
 * @param port the resolved debug port
 * @returns formatted parameter flag
 */
export function buildDevModeDebugPortFlag(isMavenProject: boolean, port: string): string {
    const prefix = isMavenProject ? MAVEN_DEVMODE_DEBUG_PORT_PREFIX : GRADLE_DEVMODE_DEBUG_PORT_PREFIX;
    return `${prefix}=${port}`;
}
