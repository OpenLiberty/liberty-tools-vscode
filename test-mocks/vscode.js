/*
 * Minimal vscode mock for unit tests.
 * Only stubs the surface used by LibertyProject and helperUtil.
 */
"use strict";

class TreeItem {
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.tooltip = undefined;
        this.iconPath = undefined;
        this.command = undefined;
        this.contextValue = undefined;
    }
}

const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

class EventEmitter {
    constructor() { this._listeners = []; }
    get event() { return (listener) => this._listeners.push(listener); }
    fire(data) { this._listeners.forEach(l => l(data)); }
}

const window = {
    showInformationMessage: () => Promise.resolve(),
    showWarningMessage: () => Promise.resolve(),
    showErrorMessage: () => Promise.resolve(),
    showQuickPick: () => Promise.resolve(undefined),
    showInputBox: () => Promise.resolve(undefined),
    setStatusBarMessage: () => ({ dispose: () => {} }),
    createTerminal: () => ({ show: () => {}, sendText: () => {}, dispose: () => {}, processId: Promise.resolve(1) }),
    onDidCloseTerminal: () => ({ dispose: () => {} }),
    createTreeView: () => ({ dispose: () => {} }),
};

const workspace = {
    findFiles: () => Promise.resolve([]),
    workspaceFolders: [],
    name: "",
    onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
    getConfiguration: () => ({ get: () => undefined }),
};

const commands = {
    executeCommand: () => Promise.resolve(),
    registerCommand: () => ({ dispose: () => {} }),
};

class RelativePattern {
    constructor(base, pattern) {
        this.base = base;
        this.pattern = pattern;
    }
}

const Uri = {
    file: (p) => ({ fsPath: p }),
};

module.exports = {
    TreeItem,
    TreeItemCollapsibleState,
    EventEmitter,
    window,
    workspace,
    commands,
    RelativePattern,
    Uri,
};
