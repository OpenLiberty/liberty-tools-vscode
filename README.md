# Liberty Tools for Visual Studio Code

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Open-Liberty.liberty-dev-vscode-ext?style=for-the-badge&label=VS%20Market "Current Release")](https://marketplace.visualstudio.com/items?itemName=Open-Liberty.liberty-dev-vscode-ext)
[![License](https://img.shields.io/github/license/OpenLiberty/liberty-tools-vscode?style=for-the-badge&logo=eclipse)](https://www.eclipse.org/legal/epl-2.0/)

Liberty Tools for Visual Studio Code offers features for developing cloud-native Java applications with [Open Liberty](https://openliberty.io/) and [WebSphere Liberty](https://www.ibm.com/products/websphere-liberty). Iterate fast with Liberty dev mode, code with assistance for MicroProfile & Jakarta EE APIs, and easily edit Liberty configuration files.

**Note: This is an early release.**

![liberty dashboard screenshot](/docs/screenshots/liberty_dashboard.png)

---
- [Features](#features)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configurable User Settings](#configurable-user-settings)
- [External Settings](#external-settings)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [Issues](#issues)

Use Liberty Tools to run your Liberty Maven or Liberty Gradle projects through the Liberty dashboard or the VS Code command palette. You can start, stop, or interact with [Liberty dev mode](https://openliberty.io/docs/latest/development-mode.html) on all available [Liberty Maven](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) or [Liberty Gradle](https://github.com/OpenLiberty/ci.gradle/blob/master/docs/libertyDev.md) projects in your workspace. Liberty Tools also helps you quickly and easily edit your application and configuration files by providing language support features for MicroProfile, Jakarta EE, and Liberty configuration and Java files.

## Features

- View supported Liberty projects in the Liberty dashboard.
- Start/Stop dev mode.
- Start dev mode with custom parameters.
- Start dev mode in a container.
- Attach the debugger.
- Run tests.
- View test reports.
- Code with language assistance in the following configuration and application files:
    - server.xml, server.env, bootstrap.properties Liberty configuration files
    - Jakarta EE 9.x APIs in Java files
    - MicroProfile APIs in microprofile-config.properties and Java files

Feature completion in bootstrap.properties files helps you quickly edit your Liberty runtime configuration.

![Liberty Config Language Server completion](/docs/screenshots/lcls_completion.png)

Hover in server.xml files provides more detailed descriptions.

![Liberty Config Language Server hover](/docs/screenshots/lcls_hover.png)

Diagnostics in server.env files helps you quickly correct your Liberty runtime configuration.

![Liberty Config Language Server diagnostic](/docs/screenshots/lcls_diagnostics.png)

Helpful code snippets are provided for Jakarta EE APIs in Java files, such as Jakarta RESTful Web Services.

![Eclipse LSP4Jakarta completion](/docs/screenshots/lsp4jakarta_completion.png)

Editing assistance for configuration and application files is provided through the following language server projects, which this project consumes. For more information, see the documentation for these projects.

- Liberty configuration files: [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server#liberty-config-language-server)
- Jakarta EE APIs in Java files:  [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta#eclipse-lsp4jakarta), the Language Server for Jakarta EE.

Liberty Tools for Visual Studio Code depends on the [Tools for MicroProfile](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile) Visual Studio Code extension. This extension provides editing assistance for MicroProfile APIs in Java and microprofile-config.properties files.

## Quick Start

- Install the extension.
- Liberty supported projects will appear in the Liberty Dashboard on the side bar.
- Right-click a project in the Liberty Dashboard to view the available commands.

For minimum requirements information and detailed instructions on how to use the Liberty actions, check out the [Liberty Tools for Visual Studio Code user guide](docs/user-guide.md) page.

## Commands

The following commands are available when you select a project in the Liberty Dashboard.

| Command | Description |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start  | Starts dev mode. |
| Start…​ | Starts dev mode with custom parameters. Supported parameters can be found in the documentation for the [dev goal of the Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) and the [libertyDev task of the Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle/blob/master/docs/libertyDev.md#command-line-parameters). |
| Start in a container | Starts dev mode with Liberty running in a container. The `liberty-maven-plugin` must be version `3.3-M1` or higher. The `liberty-gradle-plugin` must be version `3.1-M1` or higher. |
| Stop | Stops dev mode. Liberty must be running in dev mode to use this command. |
| Run tests | Runs the unit tests and integration tests that are configured for your project. Liberty must be running in dev mode to use this command. |
| View integration test report (Maven) | Views the integration test report file it exists at `/target/site/failsafe-report.html`. |
| View unit test report (Maven) | Views the unit test report file if it exists at `/target/site/surefire-report.html`. |
| View test report (Gradle) | Opens the test report file if it exists at the default location `build/reports/tests/test/index.html`. This action command is only available to Gradle projects. Gradle projects only have a single action command for test result reporting. |

## Configurable User Settings

| Setting                      | Description                                                                                                                                                                                 | Default Value |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| liberty.terminal.useJavaHome | If this value is true, and if the setting `java.home` has a value, then the environment variable `JAVA_HOME` will be set to the value of `java.home` when a new terminal window is created. | False         |
| xml.java.home | This property allows a user to define their LemMinX language server runtime without altering the `JAVA_HOME` environment variable.  | Not set |

### External Settings

The following settings provided by external extensions will be honoured when executing dev mode commands.

| Setting                      | Description                                                                                                                                                                                 | Provided By |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| maven.executable.path | Maven commands executed by dev mode will honour this setting. When this value is empty, it tries to use `mvn` or `mvnw` according to the value of `maven.executable.preferMavenWrapper`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)         |
| maven.executable.preferMavenWrapper | Maven commands executed by dev mode will honour this setting. If true, it tries to use `mvnw` if a Maven wrapper file can be found. Otherwise it will use `mvn`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)         |
| java.import.gradle.wrapper.enabled | Gradle commands executed by dev mode will honour this setting. If true, it tries to use `gradlew` if a Gradle wrapper file can be found. Otherwise it will use `gradle`. | [Language support for Java extension](https://marketplace.visualstudio.com/items?itemName=redhat.java)        |

## Requirements

These requirements are bundled with Liberty Tools for Visual Studio Code during installation and are provided here for additional information.
- [Tools for MicroProfile extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile)
- [XML extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)

## Contributing

See the [DEVELOPING](DEVELOPING.md) and [CONTRIBUTING](CONTRIBUTING.md) documents for more details.

## Issues

Please report bugs, issues and feature requests by creating a [GitHub issue](https://github.com/OpenLiberty/liberty-tools-vscode/issues).
