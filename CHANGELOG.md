# Change Log

All notable changes to the Liberty Tools extension will be documented below.

## 0.1.12

Version 0.1.12 of Liberty Tools for Visual Studio Code is an **early release** that contains new functionality and fixes. Liberty Tools for Visual Studio Code now requires Java 17 and depends on the [XML by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml) and [Debugger for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug) Visual Studio Code extensions.

Notable enhancements:
- Editing assistance (completion, hover, diagnostics and quick-fixes) when editing server.xml, server.env, and bootstrap.properties files via the [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server).
- Editing assistance (code snippets, diagnostics and quick-fixes) for Jakarta EE 9.x Web Profile APIs when editing Java files via the [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta), Language Server for Jakarta EE.
- Liberty projects are now automatically detected via the presence of a “src/main/liberty/config/server.xml” file.
- New “Liberty: Attach Debugger” Liberty action, accessible through the Liberty Dashboard or Visual Studio Code Command Palette. Requires “Liberty: Start” to have been run first.
- Ability to run Liberty actions through the Visual Studio Code Command Palette or the keyboard shortcut: Shift + Alt + L.
- “Liberty: Start…” saves command history.
- Ability to manually add projects to the Liberty Dashboard.
- New icons for Maven and Gradle projects in the Liberty Dashboard.

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/0.0.11...0.1.12) for the full set of changes since the previous early release.

## 0.1.11
- Rename extension to Liberty Tools for VS Code
- Rename Liberty Dev Dashboard to Liberty Dashboard

## 0.1.10
- Honour Maven and Gradle wrapper settings when running dev mode

## 0.1.9
- Removed "tech preview" wording from "Start in container" action

## 0.1.8
- Added dependency on [Tools for MicroProfile](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile)

## 0.1.7
- Added Start in container (tech preview) action
- Upgrade lodash dependency version

## 0.1.6

- Detect custom test report locations
- Add refresh button to Liberty Dev Dashboard
- Persist custom parameters between runs of dev mode
- Upgrade minimist and acorn dependency versions

## 0.1.5

- Support for the [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle)
- Bug fixes for Liberty Project Provider
- Updated Manifest

## 0.1.4

- Improved message when test reports do not exist
- Added OpenLiberty category to Liberty Dev commands

## 0.1.3

- Change name to Open Liberty Tools

## 0.1.2

- Enhancement to honour `java.home` setting with `liberty.terminal.useJavaHome`

## 0.1.1

- Bug fix to recognize plugins defined in profile section of `pom.xml`

## 0.1.0

- View supported liberty-maven-plugin projects in the workspace (must be of version `3.0.M1` or higher)
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports
