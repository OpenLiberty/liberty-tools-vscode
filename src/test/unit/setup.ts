/*
 * Mocha setup: register the vscode mock before any test module is loaded.
 * Also sets env vars required by the extension's i18n utilities.
 */
"use strict";

// Required by i18nUtil.ts — must be set before any module import
process.env.VSCODE_NLS_CONFIG = JSON.stringify({ locale: "en" });

const Module = require("module");
const path = require("path");

const originalLoad = Module._load;
Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "vscode") {
        return require(path.join(__dirname, "../../../test-mocks/vscode.js"));
    }
    // i18nUtil reads locale files that don't exist outside the packaged extension
    if (request.includes("i18nUtil")) {
        return { localize: (key: string, ...args: any[]) => key };
    }
    return originalLoad.apply(this, arguments);
};
