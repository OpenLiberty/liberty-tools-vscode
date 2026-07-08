/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

// This test runs in plain Node, not inside a real VS Code window.
import { installFakeVscode, FakeVscode } from "./fakeVscode";

// Install the fake and clear any previously cached extension modules so this
// file's import of libertyProject binds to our fake, regardless of test order.
const fakeVscode: FakeVscode = installFakeVscode({}, true);

import * as assert from "assert";
import { ProjectProvider } from "../../liberty/libertyProject";

// Minimal fake ExtensionContext — ProjectProvider needs one to construct.
const fakeContext: any = {
    workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve()
    },
    globalState: {
        get: () => undefined,
        update: () => Promise.resolve()
    }
};

// Helper: build a fake workspaceFolders array with n entries.
function makeFolders(n: number) {
    return Array.from({ length: n }, (_, i) => ({ uri: { fsPath: `/project${i}` } }));
}

describe("isMultiProjectUntitledWorkspace", () => {

    let provider: ProjectProvider;

    before(() => {
        provider = new ProjectProvider(fakeContext);
    });

    // resets fake back to clean slate so test behavior is not affected by last test
    afterEach(() => {
        fakeVscode.workspace.workspaceFolders = undefined;
        fakeVscode.workspace.name = undefined;
        fakeVscode.workspace.workspaceFile = undefined;
    });

    // ─── Test 1 ───────────────────────────────────────────────────────────────
    // Plain single-folder window (the video scenario) where workspace.name is the
    // folder name (like gradleappadd) and no workspaceFile is saved. workspaceState
    // is lost when user does "Save Workspace As..." so isMultiProjectUntitledWorkspace()
    // must return true to trigger the globalState update and prevent the project from being lost.
    it("returns true for a plain single-folder window (no .code-workspace file)", () => {
        fakeVscode.workspace.workspaceFolders = makeFolders(1);
        fakeVscode.workspace.name = "gradleappadd";
        fakeVscode.workspace.workspaceFile = undefined;

        assert.strictEqual(provider.isMultiProjectUntitledWorkspace(), true,
            "A plain single-folder window loses workspaceState on Save Workspace As " +
            "so the safe-path must trigger.");
    });

    // ─── Test 2 ───────────────────────────────────────────────────────────────
    // VS Code auto-created "Untitled (Workspace)" (multiple folders not yet saved):
    // workspaceFile is undefined here too, so must return true.
    it("returns true for an auto-created untitled workspace (multiple folders)", () => {
        fakeVscode.workspace.workspaceFolders = makeFolders(2);
        fakeVscode.workspace.name = "Untitled (Workspace)";
        fakeVscode.workspace.workspaceFile = undefined;

        assert.strictEqual(provider.isMultiProjectUntitledWorkspace(), true);
    });

    // ─── Test 3 ───────────────────────────────────────────────────────────────
    // Workspace already saved to a .code-workspace file: workspaceState is
    // stable, no prompt needed.
    it("returns false when workspace is already saved to a .code-workspace file", () => {
        fakeVscode.workspace.workspaceFolders = makeFolders(1);
        fakeVscode.workspace.name = "testIssue";
        fakeVscode.workspace.workspaceFile = { fsPath: "/home/user/testIssue.code-workspace" };

        assert.strictEqual(provider.isMultiProjectUntitledWorkspace(), false);
    });

    // ─── Test 4 ───────────────────────────────────────────────────────────────
    // No folders open at all: nothing to protect, should return false.
    it("returns false when there are no folders open", () => {
        fakeVscode.workspace.workspaceFolders = undefined;
        fakeVscode.workspace.name = undefined;
        fakeVscode.workspace.workspaceFile = undefined;

        assert.strictEqual(provider.isMultiProjectUntitledWorkspace(), false);
    });

});
