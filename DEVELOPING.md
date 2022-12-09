# Developmenting Liberty Tools for Visual Studio Code

- [Build Liberty Tools for Visual Studio Code](#build-liberty-tools-for-visual-studio-code)
- [Language Servers](#language-servers)
  - [Build Liberty Config Language Server locally](#build-liberty-config-language-server-locally)
  - [Build Eclipse LSP4Jakarta locally](#build-eclipse-lsp4jakarta-locally)
- [Localization](#localization)
  - [package.json](#packagejson)
  - [Source code](#source-code)

## Build Liberty Tools for Visual Studio Code

1. `git clone https://github.com/OpenLiberty/liberty-tools-vscode`
2. `cd liberty-tools-vscode`
3. Run `npm install`
4. Run `npm run build`
5. Run `npm run compile`
6. Run the extension in Debug and Run mode by selecting `Run Extension` or `F5`

   Alternatively, build a `.vsix` file:

   - `vsce package` to generate the `liberty-tools-vscode-xxx.vsix` file
   - Install the extension to Visual Studio Code by `View/Command Palette`
   - Select `Extensions: Install from VSIX...` and choose the generated `liberty-tools-vscode-xxx.vsix` file

`npm run build` downloads the jars for Liberty Config Language Server and Eclipse LSP4Jakarta consumed by the VS Code client.
See below for instructions on building these jars locally.

## Language Servers

### Build Liberty Config Language Server locally

1. `git clone`
    Make sure the cloned repo is in the same parent dir as `liberty-tools-vscode`
2. Run `npm run buildLocal`

For more information on building Liberty Config Language Server, see the project documentation on [GitHub](https://github.com/OpenLiberty/liberty-language-server/blob/main/DEVELOPING.md). Note that there are [prerequsites](https://github.com/OpenLiberty/liberty-language-server/blob/main/DEVELOPING.md#prerequisites) to building this project locally.

### Build Eclipse LSP4Jakarta locally

1. `git clone https://github.com/eclipse/lsp4jakarta.git`
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
