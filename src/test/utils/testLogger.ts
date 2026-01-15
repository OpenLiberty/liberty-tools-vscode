/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */

'use strict';

/**
 * Test logger that provides structured output for test execution.
 * Uses synchronous writes to prevent interleaving.
 */
class TestLogger {
    /**
     * Log a message to stdout using synchronous write
     */
    log(message: string): void {
        process.stdout.write(message + '\n');
    }

    /**
     * Log an error message to stderr with clear separation
     * Uses a single synchronous write to prevent interleaving
     */
    error(message: string, error?: any): void {
        // Build the entire error message as a single string
        let errorOutput = '\n' + '='.repeat(80) + '\n';
        errorOutput += `[ERROR] ${message}\n`;
        
        if (error) {
            if (error.stack) {
                errorOutput += error.stack + '\n';
            } else {
                errorOutput += String(error) + '\n';
            }
        }
        
        errorOutput += '='.repeat(80) + '\n\n';
        
        // Write the entire error message in one synchronous operation
        process.stderr.write(errorOutput);
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