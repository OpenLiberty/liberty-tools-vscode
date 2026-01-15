/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */

'use strict';

/**
 * Test logger that provides structured output for test execution.
 * Logs are written immediately to stdout, errors to stderr.
 */
class TestLogger {
    /**
     * Log a message to stdout
     */
    log(message: string): void {
        console.log(message);
    }

    /**
     * Log an error message to stderr with clear separation
     */
    error(message: string, error?: any): void {
        // Write to stderr with clear separation
        process.stderr.write('\n' + '='.repeat(80) + '\n');
        process.stderr.write(`[ERROR] ${message}\n`);
        if (error) {
            if (error.stack) {
                process.stderr.write(error.stack + '\n');
            } else {
                process.stderr.write(String(error) + '\n');
            }
        }
        process.stderr.write('='.repeat(80) + '\n\n');
    }

    /**
     * Log an info message with special formatting
     */
    info(message: string): void {
        this.log(`[INFO] ${message}`);
    }

    /**
     * Log a test start message
     */
    testStart(testName: string): void {
        this.log(`\n${'='.repeat(80)}`);
        this.log(`[TEST START] ${testName}`);
        this.log('='.repeat(80));
    }

    /**
     * Log a test completion message
     */
    testComplete(testName: string): void {
        this.log(`[TEST COMPLETE] ${testName} passed`);
        this.log('='.repeat(80) + '\n');
    }

    /**
     * Log a test failure message
     */
    testFailed(testName: string, error: any): void {
        this.error(`Test failed: ${testName}`, error);
    }

    /**
     * Log a step in the test
     */
    step(stepNumber: number, description: string): void {
        this.log(`[STEP ${stepNumber}] ${description}`);
    }

    /**
     * Log a successful step completion
     */
    stepSuccess(stepNumber: number, description: string): void {
        this.log(`[STEP ${stepNumber} - SUCCESS] ${description}`);
    }

    /**
     * Log a skip message
     */
    skip(message: string): void {
        this.log(`[SKIP] ${message}`);
    }
}

// Export a singleton instance
export const logger = new TestLogger();