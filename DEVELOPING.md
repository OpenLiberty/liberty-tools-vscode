# Developing Liberty Tools for Visual Studio Code

> Note: Starting with the [0.1.12 early release](https://github.com/OpenLiberty/liberty-tools-vscode/releases/tag/0.1.12), Java 17 is required to run Liberty Tools for Visual Studio Code.

- [Build Liberty Tools for Visual Studio Code](#build-liberty-tools-for-visual-studio-code)
- [Language Servers](#language-servers)
  - [Build Liberty Config Language Server locally](#build-liberty-config-language-server-locally)
  - [Build Eclipse LSP4Jakarta locally](#build-eclipse-lsp4jakarta-locally)
- [Localization](#localization)
  - [package.json](#packagejson)
  - [Source code](#source-code)

## Building Liberty Tools for Visual Studio Code

Ensure you have [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed.

1. [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo#forking-a-repository) this repository
2. Clone your fork of this repository: `git clone https://github.com/OpenLiberty/liberty-tools-vscode`
3. Change to the `liberty-tools-vscode` directory: `cd liberty-tools-vscode`
4. Run `npm install`
5. Run `npm run build`
6. Run `npm run compile`
7. Run the extension in Debug and Run mode by selecting `Run Extension` or pressing `F5` in Visual Studio Code.

   Alternatively, build a `.vsix` file and install the extension to Visual Studio Code with the command palette or Extensions activity bar.
   - Run `vsce package` to generate the `liberty-tools-vscode-xxx.vsix` file
   - Install the extension with the [command palette](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces#accessing-the-vs-code-command-palette):
     - Select `Extensions: Install from VSIX...` and choose the generated `liberty-tools-vscode-xxx.vsix` file
   - Install the extension with the Extensions activity bar:
     - Navigate to the Extensions activity bar, or use the shortcut `Ctrl`-`Shift`-`X`
     - Click the `...` dropdown menu and select `Install from VSIX` and choose the generated `liberty-tools-vscode-xxx.vsix` file

Step 4 downloads the JARs for Liberty Config Language Server and Eclipse LSP4Jakarta that are consumed by the VS Code client.
The following instructions explain how to build these JARs locally.

## Language Servers

### Build Liberty Config Language Server locally

1. Run `git clone https://github.com/OpenLiberty/liberty-language-server.git`
    Make sure the cloned repo is in the same parent dir as `liberty-tools-vscode`
2. Run `npm run buildLocal`

For more information on building Liberty Config Language Server, see the project documentation on [GitHub](https://github.com/OpenLiberty/liberty-language-server/blob/main/DEVELOPING.md). Note that there are [prerequsites](https://github.com/OpenLiberty/liberty-language-server/blob/main/DEVELOPING.md#prerequisites) to building this project locally.

### Build Eclipse LSP4Jakarta locally

1. Run `git clone https://github.com/eclipse/lsp4jakarta.git`
    Make sure the cloned repo is in the same parent dir as `liberty-tools-vscode`
2. Run `npm run buildJakarta`

For more information on building Eclipse LSP4Jakarta, see the project documentation on [GitHub](https://github.com/eclipse/lsp4jakarta/blob/main/docs/BUILDING.md). Note that there are [prerequisites](https://github.com/eclipse/lsp4jakarta/blob/main/docs/BUILDING.md#prerequisites) to building this project locally.

## Localization

### package.json

This follows Visual Studio Code extension standard: add localized strings in `package.nls.{locale}.json`.
The default nls message file is `package.nls.json`.

### Source code

1. Add new messages in `locales/{locale}.json` file.  If message has parameters, use curly brackets to enclose them: `{0}`, `{1}`...

2. Add the following import statement in your source code:

   ```ts
   import { localize } from "../util/i18nUtil";
   ```

3. Call method `localize` to return localized message.

   Example without parameters:

   ```ts
   const message = localize("my.message.key");
   ```

   Example with parameters:

   ```ts
   const message = localize("my.message.key.with.params", param1, param2);
   ```
