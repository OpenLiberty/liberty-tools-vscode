/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */
import { ExtensionContext, LogOutputChannel, window } from "vscode";

/**
 * Creates a named LogOutputChannel for a language server and registers it for
 * disposal with the extension context.
 *
 * vscode-languageclient pipes every stderr line from the spawned server process
 * through outputChannel.error(). Java language servers using java.util.logging
 * (JUL) write structured records to stderr where the log level appears as a
 * prefix on the message line ("INFO: ...", "WARNING: ...", "SEVERE: ...").
 * This helper intercepts those .error() calls and routes each line to the
 * matching VS Code log level so the output channel reflects the real severity
 * rather than tagging everything as [error].
 *
 * @param name    The display name for the output channel (shown in the Output dropdown).
 * @param context The extension context used to register the channel for disposal.
 * @returns A LogOutputChannel suitable for use as LanguageClientOptions.outputChannel.
 */
export function createLsOutputChannel(name: string, context: ExtensionContext): LogOutputChannel {
    const rawChannel = window.createOutputChannel(name, { log: true });
    context.subscriptions.push(rawChannel);

    const outputChannel: LogOutputChannel = {
        ...rawChannel,
        error: (message: string | Error, ...args: any[]) => {
            const text = message instanceof Error ? message.message : message;
            if (text.startsWith("SEVERE:")) {
                rawChannel.error(text, ...args);
            } else if (text.startsWith("WARNING:")) {
                rawChannel.warn(text, ...args);
            } else {
                rawChannel.info(text, ...args);
            }
        },
    };

    return outputChannel;
}
