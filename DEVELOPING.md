# Development setup for Liberty Language VS Code

## To build the VS Code client extension locally

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

### To build the LSP4Jakarta Language Server locally

For developing 


### Localization

#### package.json
This follows Visual Studio Code extension standard: add localized strings in `package.nls.{locale}.json`.
The default nls message file is `package.nls.json`.

#### Source code

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




# Development setup for Liberty Config Language Server

This repo contains a couple projects providing IDE / language support for Open Liberty using the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/).

## Projects

* [lemminx-liberty](./lemminx-liberty) - an extension to the [Eclipse LemMinX](https://github.com/eclipse/lemminx) XML language server providing language features for the Liberty server.xml file.
    * `mvn clean install` to build. Produces the `/lemminx-liberty/target/lemminx-liberty-x.x-SNAPSHOT.jar`.
* [liberty-ls](./liberty-ls) - a language server providing language features for the Liberty bootstrap.properties and server.env files.
    * `mvn clean install` to build. Produces the `/liberty-ls/target/liberty.ls-x.x-SNAPSHOT.jar`.

To test the changes interactively, you must use a language client. 

Below, we will document how to build and test using the VS Code language client for Liberty Config Language Server.

## Project setup in VS Code

### Prerequisites
These projects require the following VS Code extensions to function:
- [XML Language Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml) for `liberty-lemminx`
- [Tools for MicroProfile](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile) for `liberty-ls`

### Setup
Clone the [Liberty Tools for VS Code](https://github.com/OpenLiberty/liberty-tools-vscode) repo as a sibling folder to this repo. Create a VS Code workspace with these two repos at the root of the workspace. The folder structure should look something like this:
```
| > liberty-tools-vscode
| v liberty-language-server
| | > lemminx-liberty
| | > liberty-ls
```

## Building and Testing with the VS Code client

Prerequisites: [Debugger for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug) for VS Code


1. In the `liberty-tools-vscode` directory, run `npm run buildLocal`.
    
    a) Optionally, `vsce package` may be run next to ensure the VS Code extension can be built properly.

2. Open the debug view, select and launch `Run Extension (liberty-tools-vscode)`. It will open a new window with the newly built extension running.

## Debugging the Liberty Config Language Server

After building and running with the instructions above, you may start debugging the Liberty Config Language Server by running one of the Debug tasks.

In the same debug view, select and launch one of the following to debug each respective project:
* `Debug attach liberty-lemminx`
* `Debug attach liberty-ls` (in progress)


