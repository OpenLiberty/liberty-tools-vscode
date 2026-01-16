/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

'use strict';

/**
 * Test logger that provides structured output for test execution.
 * Works with Mocha's test output - logs go to stdout, errors to stderr.
 */
class TestLogger {
    /**
     * Log a message to stdout
     */
    log(message: string): void {
        console.log(message);
    }

    /**
     * Log an error message - just log it, let Mocha handle the error display
     */
    error(message: string, error?: any): void {
        // Just log the error message - Mocha will display the full error
        console.error(`[ERROR] ${message}`);
    }

    /**
     * Log an info message with special formatting
     */
    info(message: string): void {
        console.log(`       [INFO] ${message}`);
    }

    /**
     * Log a test start message - use gray color like Mocha's test names
     */
    testStart(testName: string): void {
        const YELLOW = '\x1b[33m';
        const GRAY = '\x1b[90m';
        const RESET = '\x1b[0m';
        console.log(`    ${YELLOW}▶${RESET} ${GRAY}${testName}${RESET}`);
    }

    /**
     * Log a test completion message
     */
    testComplete(testName: string): void {
        // No output needed - Mocha shows the checkmark
    }

    /**
     * Log a test failure message - let Mocha handle the error display
     */
    testFailed(testName: string, error: any): void {
        // Don't log here - just throw the error so Mocha can display it properly
        throw error;
    }

    /**
     * Log a step in the test
     */
    step(stepNumber: number, description: string): void {
        console.log(`      [STEP ${stepNumber}] ${description}`);
    }

    /**
     * Log a successful step completion
     */
    stepSuccess(stepNumber: number, description: string): void {
        console.log(`      [STEP ${stepNumber} ✓] ${description}`);
    }

    /**
     * Log a skip message
     */
    skip(message: string): void {
        console.log(`    [SKIP] ${message}`);
    }
}

// Export a singleton instance
export const logger = new TestLogger();