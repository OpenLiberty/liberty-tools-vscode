/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

/**
 * Shared VS Code API fake for unit tests that run in plain Node (no VS Code window).
 *
 * Import this file before any extension code. It sets the NLS config env var,
 * installs Module._load hooks for "vscode" and the i18n helper, and returns
 * a mutable fake object tests can inspect and mutate.
 */

// The extension's localization helper reads this env var on import.
// Set it before any extension module loads.
process.env.VSCODE_NLS_CONFIG = JSON.stringify({ locale: "en" });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require("module");
const originalLoad = Module._load;

export interface FakeVscode {
    EventEmitter: any;
    TreeItemCollapsibleState: { None: number };
    TreeItem: any;
    Uri: { file: (p: string) => { fsPath: string } };
    window: {
        showInformationMessage: (...args: any[]) => any;
        setStatusBarMessage: () => { dispose(): void };
    };
    workspace: {
        workspaceFolders: any;
        name: any;
    };
}

export function installFakeVscode(windowOverrides: Partial<FakeVscode["window"]> = {}): FakeVscode {
    const fakeVscode: FakeVscode = {
        EventEmitter: class { event = () => {}; fire() {} },
        TreeItemCollapsibleState: { None: 0 },
        TreeItem: class {
            label: string;
            collapsibleState: number;
            constructor(label: string, collapsibleState = 0) {
                this.label = label;
                this.collapsibleState = collapsibleState;
            }
        },
        Uri: { file: (p: string) => ({ fsPath: p }) },
        window: {
            showInformationMessage: () => {},
            setStatusBarMessage: () => ({ dispose() {} }),
            ...windowOverrides
        },
        workspace: {
            workspaceFolders: undefined,
            name: undefined
        }
    };

    Module._load = function(request: string, ...args: any[]) {
        if (request === "vscode") {
            return fakeVscode;
        }
        // Stub the i18n helper so tests get a predictable "<key>:<arg>" string
        // instead of crashing when NLS translation files are not available in plain Node.
        if (request.endsWith("/util/i18nUtil") || request === "../util/i18nUtil") {
            return { localize: (key: string, ...args2: any[]) => [key, ...args2].join(":") };
        }
        return originalLoad.call(this, request, ...args);
    };

    return fakeVscode;
}
