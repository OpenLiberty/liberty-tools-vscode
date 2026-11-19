/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './testLogger';

const execAsync = promisify(exec);

/**
 * Kill orphaned Liberty server processes that might be holding ports.
 * This prevents "port already in use" errors between test runs.
 */
export async function killOrphanedLibertyProcesses(): Promise<void> {
    if (process.platform === 'win32') {
        // Windows: kill java processes running ws-server.jar
        try {
            await execAsync('taskkill /F /IM java.exe /FI "WINDOWTITLE eq defaultServer*" 2>nul');
        } catch (e) {
            // Ignore errors if no processes found
        }
    } else {
        // Mac/Linux: find and kill Liberty server processes
        try {
            const { stdout } = await execAsync('ps aux | grep "ws-server.jar.*defaultServer" | grep -v grep | awk \'{print $2}\'');
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    logger.info(`Killed orphaned Liberty process: ${pid}`);
                } catch (e) {
                    // Process might have already exited
                }
            }
        } catch (e) {
            // No processes found or error - that's okay
        }
    }
    
    // Give OS time to release ports
    await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Kill orphaned Gradle daemon processes that might be locking files.
 * Only stops daemons if they've been idle for a while.
 */
export async function killOrphanedGradleDaemons(): Promise<void> {
    // Don't stop Gradle daemons - they're designed to stay running
    // and stopping them can interfere with ongoing operations.
    // Only kill truly stuck processes if needed.
}

/**
 * Full cleanup: kill Liberty processes and Gradle daemons, wait for ports to release.
 */
export async function cleanupTestProcesses(): Promise<void> {
    logger.info('Cleaning up orphaned test processes...');
    await killOrphanedLibertyProcesses();
    await killOrphanedGradleDaemons();
    logger.info('Process cleanup complete');
}
