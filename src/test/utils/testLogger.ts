/*
 * IBM Confidential
 * Copyright IBM Corp. 2023, 2026
 */

'use strict';

/**
 * Test logger that buffers console output to prevent interleaving with error messages.
 * Logs are buffered during test execution and flushed at appropriate times.
 */
class TestLogger {
    private buffer: string[] = [];
    private isBuffering: boolean = true;

    /**
     * Log a message. If buffering is enabled, the message is stored.
     * Otherwise, it's printed immediately.
     */
    log(message: string): void {
        if (this.isBuffering) {
            this.buffer.push(`[LOG] ${message}`);
        } else {
            console.log(message);
        }
    }

    /**
     * Log an error message. Errors are always printed immediately
     * to ensure they're visible, preceded by flushing any buffered logs.
     */
    error(message: string, error?: any): void {
        this.flush();
        console.error('\n' + '='.repeat(80));
        console.error(`[ERROR] ${message}`);
        if (error) {
            console.error(error);
        }
        console.error('='.repeat(80) + '\n');
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
        this.flush();
    }

    /**
     * Log a test failure message
     */
    testFailed(testName: string, error: any): void {
        this.error(`[TEST FAILED] ${testName} failed`, error);
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
        this.flush();
    }

    /**
     * Flush all buffered logs to console
     */
    flush(): void {
        if (this.buffer.length > 0) {
            this.buffer.forEach(msg => console.log(msg));
            this.buffer = [];
        }
    }

    /**
     * Enable or disable buffering
     */
    setBuffering(enabled: boolean): void {
        if (!enabled) {
            this.flush();
        }
        this.isBuffering = enabled;
    }

    /**
     * Clear the buffer without printing
     */
    clear(): void {
        this.buffer = [];
    }
}

// Export a singleton instance
export const logger = new TestLogger();