# Liberty Tools for Visual Studio Code

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Open-Liberty.liberty-dev-vscode-ext?style=for-the-badge&label=VS%20Market "Current Release")](https://marketplace.visualstudio.com/items?itemName=Open-Liberty.liberty-dev-vscode-ext)
[![License](https://img.shields.io/github/license/OpenLiberty/liberty-tools-vscode?style=for-the-badge&logo=eclipse)](https://www.eclipse.org/legal/epl-2.0/)

Liberty Tools for Visual Studio Code offers features for developing cloud-native Java applications with [Open Liberty](https://openliberty.io/) and [WebSphere Liberty](https://www.ibm.com/products/websphere-liberty). Iterate fast with Liberty dev mode, code with assistance for MicroProfile & Jakarta EE APIs, and easily edit Liberty configuration files.

**Note:** This is an early release.

![liberty dashboard screenshot](images/liberty_dashboard.png)


## Quick Start

- Install the extension
- Liberty supported projects will appear in the Liberty Dashboard on the side bar
- Right-click a project in the Liberty Dashboard to view the available commands

## Features

A Visual Studio Code extension for Open Liberty. The extension will detect your Liberty Maven or Liberty Gradle project if it detects the `io.openliberty.tools:liberty-maven-plugin` in the `pom.xml` or `io.openliberty.tools:liberty-gradle-plugin` in the `build.gradle`. Through the Liberty Dashboard, you can start, stop, or interact with Liberty dev mode on all available [Liberty Maven](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) or [Liberty Gradle](https://github.com/OpenLiberty/ci.gradle/blob/master/docs/libertyDev.md) projects in your workspace.

- View supported `liberty-maven-plugin`(version `3.1` or higher) or `liberty-gradle-plugin`(version `3.0` or higher) projects in the workspace
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports

Liberty Tools for Visual Studio Code consumes the [LSP4Jakarta Language Server]() to provide language server features for Java files:

![lsp4jakarta completion screenshot](images/lsp4jakarta_completion.png)

Liberty Tools for Visual Studio Code consumes the [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) providing language server features for Liberty server configuration files:

- server.env
- bootstrap.properties
- server.xml

**Hover support**
![lcls server.xml hover screenshot](images/lcls_hover.png)
**Completion support**
![lcls bootstrap.properties completion screenshot](images/lcls_completion.png)
**Diagnostics support**
![lcls server.env diagnostics screenshot](images/lcls_diagnostics.png)

## Commands

| Command                      | Description                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start                        | Starts dev mode.                                                                                                                                                                                                                                                                                                             |
| Start…​                      | Starts dev mode with custom parameters. Supported parameters can be found in the documentation for the [dev goal of the Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) and the [libertyDev task of the Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle/blob/master/docs/libertyDev.md#command-line-parameters). |
| Start in container                    | Starts dev mode with the server in a container. The `liberty-maven-plugin` must be version `3.3-M1` or higher. The `liberty-gradle-plugin` must be version `3.1-M1` or higher. |
| Stop                         | Stops dev mode.                                                                                                                                                                                                                                                                                                              |
| Run tests                    | Runs the unit tests and integration tests that are configured for your project. This command requires dev mode to be already started.                                                                                                                                                                                        |
| View integration test report | Views the integration test report file.                                                                                                                                                                                                                                                                                      |
| View unit test report        | Views the unit test report file.                                                                                                                                                                                                                                                                                             |

**Note:** Gradle projects only have a single `View test report` command.

## Configurable User Settings

| Setting                      | Description                                                                                                                                                                                 | Default Value |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| liberty.terminal.useJavaHome | If this value is true, and if the setting `java.home` has a value, then the environment variable `JAVA_HOME` will be set to the value of `java.home` when a new terminal window is created. | False         |
| xml.java.home | This property allows a user to define their LemminX language server runtime without altering the `JAVA_HOME` environment variable.  | Not set |

### External Settings

The following settings provided by external extensions will be honoured when executing dev mode commands.

| Setting                      | Description                                                                                                                                                                                 | Provided By |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| maven.executable.path | Maven commands executed by dev mode will honour this setting. When this value is empty, it tries to use `mvn` or `mvnw` according to the value of `maven.executable.preferMavenWrapper`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)         |
| maven.executable.preferMavenWrapper | Maven commands executed by dev mode will honour this setting. If true, it tries to use `mvnw` if a Maven wrapper file can be found. Otherwise it will use `mvn`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)         |
| java.import.gradle.wrapper.enabled | Gradle commands executed by dev mode will honour this setting. If true, it tries to use `gradlew` if a Gradle wrapper file can be found. Otherwise it will use `gradle`. | [Language support for Java extension](https://marketplace.visualstudio.com/items?itemName=redhat.java)        |

## Requirements

- [Tools for MicroProfile extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile)
- [XML extension for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)

## Contributing

See the [DEVELOPING](DEVELOPING.md) and [CONTRIBUTING](CONTRIBUTING.md) documents for more details.

## Issues

Please report bugs, issues and feature requests by creating a [GitHub issue](https://github.com/OpenLiberty/liberty-tools-vscode/issues).
