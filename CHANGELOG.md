# Change Log

All notable changes to the Liberty Tools extension will be documented below.

## 25.0.3

Version 25.0.3 of Liberty Tools for Visual Studio Code is a fix release that contains minor enhancements and fixes. Version 25.0.3 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

Notable changes:

- Updated [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta) version to 0.2.3, which resolves the following bug:
  - Diagnostic and quick fix not available for a field incorrectly annotated with @PositiveOrZero annotation - https://github.com/OpenLiberty/liberty-tools-vscode/issues/389
  - For more information regarding changes for version 0.2.3, refer to the release notes: https://github.com/eclipse-lsp4jakarta/lsp4jakarta/releases/tag/0.2.3.
- Updated [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) version to 2.2.1, which includes multiple enhancements and bug fixes. For more information regarding changes for version 2.2.1, refer to the release notes:
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/liberty-langserver-2.2.1
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/lemminx-liberty-2.2.1
- New buttons added to the Liberty dashboard to allow manually adding or removing a project to or from the Liberty dashboard using the dashboard itself.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/498
- Fix to prevent refreshing the Liberty dashboard when files used for project detection are generated under a project’s target or build directory.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/455

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/24.0.12...25.0.3) for the full set of changes since the previous release.

## 24.0.12

Version 24.0.12 of Liberty Tools for Visual Studio Code is a fix release that contains minor enhancements and fixes. Version 24.0.12 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

Notable changes:

- Updated [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta) version to 0.2.2, which resolves the following bugs:
  - Quick fix NullPointerException failures - https://github.com/OpenLiberty/liberty-tools-vscode/issues/336
  - UnsupportedOperationException in the output tabs for language servers - https://github.com/OpenLiberty/liberty-tools-vscode/issues/207
  - Incorrect behaviour for @Dependent quick fix - https://github.com/OpenLiberty/liberty-tools-vscode/issues/362
  - For more information regarding changes for version 0.2.2, refer to the release notes: https://github.com/eclipse/lsp4jakarta/releases/tag/0.2.2.
- Updated [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) version to 2.2, which adds support for versionless features in server configuration and includes several bug fixes. For more information regarding changes for version 2.2, refer to the release notes:
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/liberty-langserver-2.2
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/lemminx-liberty-2.2
- The Liberty dashboard now refreshes when a project is added to a workspace.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/371
- Support has been added to the “Start”, “Start…”, and “Start in container” actions for project paths that contain spaces.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/337
- Support has been added for various terminal shell types for the “Start”, “Start…”, and “Start in container” actions. For more information regarding support for terminal shell types, refer to the “Terminal shell support” section of the user guide: https://github.com/OpenLiberty/liberty-tools-vscode/blob/main/docs/user-guide.md#terminal-shell-support.
- Support has been added for the new test report location following the update of the Maven Surefire Report Plugin.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/340

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/24.0.3...24.0.12) for the full set of changes since the previous release.

## 24.0.3

Version 24.0.3 of Liberty Tools for Visual Studio Code is a fix release that contains minor enhancements and fixes. Version 24.0.3 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

Notable changes:

- Updated [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta) version to 0.2.1 to resolve bug where Jakarta EE diagnostics were not appearing.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/322
  - For more information regarding changes for version 0.2.1, refer to the release notes: https://github.com/eclipse/lsp4jakarta/releases/tag/0.2.1
- Added instructions for when the Liberty dashboard detects no Liberty projects.
  - https://github.com/OpenLiberty/liberty-tools-vscode/issues/203

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/23.0.12...24.0.3) for the full set of changes since the previous release.

## 23.0.12

Version 23.0.12 of Liberty Tools for Visual Studio Code contains enhancements for editing support. Version 23.0.12 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

NOTE: There is a known problem with Jakarta EE diagnostics in this release. For details on the issue and the workaround, please refer to [issue #322](https://github.com/OpenLiberty/liberty-tools-vscode/issues/322). For more known problems and workarounds for this release, please refer to the wiki: https://github.com/OpenLiberty/liberty-tools-vscode/wiki/Known-Problems-and-Limitations.

Notable changes:

- Updated [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) version to 2.1.1. For information regarding changes for version 2.1, refer to the release notes linked below:
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/liberty-langserver-2.1
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/lemminx-liberty-2.1
- Updated [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta) version to 0.2.0. For more information regarding changes for version 0.2.0, refer to the release notes linked below:
  - https://github.com/eclipse/lsp4jakarta/releases/tag/0.2.0

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/23.0.9...23.0.12) for the full set of changes since the previous release.

## 23.0.9

Version 23.0.9 of Liberty Tools for Visual Studio Code is a fix release that contains minor enhancements and fixes. Version 23.0.9 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

Notable changes:

- Updated [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) version to 2.0.1. For information regarding changes for version 2.0.1, refer to the release notes linked below:
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/liberty-langserver-2.0.1
  - https://github.com/OpenLiberty/liberty-language-server/releases/tag/lemminx-liberty-2.0.1
- Bug fix for “Start in container” action not appearing when project parent folder is opened in VS Code Explorer - https://github.com/OpenLiberty/liberty-tools-vscode/issues/258
- Bug fix for the Liberty Dashboard not refreshing project names after they are changed - https://github.com/OpenLiberty/liberty-tools-vscode/issues/177
- Bug fix for parameter field in “Start…” command redirecting focus to the terminal - https://github.com/OpenLiberty/liberty-tools-vscode/issues/210
- Added the build file path as a tooltip when hovering over project names in the Liberty dashboard - https://github.com/OpenLiberty/liberty-tools-vscode/issues/208

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/23.0.6...23.0.9) for the full set of changes since the previous release.

## 23.0.6

Version 23.0.6 of Liberty Tools for Visual Studio Code contains minor enhancements and fixes. Version 23.0.6 requires Visual Studio Code version 1.78+ and requires Java 17 or later.

Notable enhancements:

- Update to allow context aware snippets in Java files provided by [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta), Language Server for Jakarta EE.
- Update to latest version of `vscode-languageclient` to resolve language client failures

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/0.1.12...23.0.6) for the full set of changes since the previous release.

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

See the [commit log](https://github.com/OpenLiberty/liberty-tools-vscode/compare/0.1.11...0.1.12) for the full set of changes since the previous early release.

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
