# Liberty Tools for VS Code

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Open-Liberty.liberty-dev-vscode-ext?style=for-the-badge&label=VS%20Market "Current Release")](https://marketplace.visualstudio.com/items?itemName=Open-Liberty.liberty-dev-vscode-ext)
[![License](https://img.shields.io/github/license/OpenLiberty/liberty-tools-vscode?style=for-the-badge&logo=eclipse)](https://www.eclipse.org/legal/epl-2.0/)

A VS Code extension for Open Liberty. The extension will detect your Liberty Maven or Liberty Gradle project if it detects the `io.openliberty.tools:liberty-maven-plugin` in the `pom.xml` or `io.openliberty.tools:liberty-gradle-plugin` in the `build.gradle`. Through the Liberty Dashboard, you can start, stop, or interact with Liberty dev mode on all available [Liberty Maven](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) or [Liberty Gradle](https://github.com/OpenLiberty/ci.gradle/blob/master/docs/libertyDev.md) projects in your workspace.

![Liberty Tools Extension](images/open-liberty-tools.png)

## Quick Start

- Install the extension
- Liberty supported projects will appear in the Liberty Dashboard on the side bar
- Right-click a project in the Liberty Dashboard to view the available commands

## Features

- View supported `liberty-maven-plugin`(version `3.1` or higher) or `liberty-gradle-plugin`(version `3.0` or higher) projects in the workspace
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports

Liberty Tools for VS Code consumes the [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server) providing language server features for Liberty server configuration files:
- server.env
- bootstrap.properties
- server.xml

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

Contributions to the Liberty Tools extension are welcome!

Our [CONTRIBUTING](CONTRIBUTING.md) document contains details for submitting pull requests.

To build the extension locally:

1. `git clone https://github.com/OpenLiberty/liberty-tools-vscode`
2. `git clone https://github.com/eclipse/lsp4jakarta.git` - Make sure the `lsp4jakarta` and `liberty-tools-vscode` projects are located in the same directory.
3. `cd liberty-tools-vscode`
4. Run `npm install`
5. Run `npm run build`
6. Run `npm run buildJakarta`
7. Run `npm run compile`
8. Run the extension in Debug and Run mode by selecting `Run Extension` or `F5`

   Alternatively, build a `.vsix` file:

   - `vsce package` to generate the `liberty-tools-vscode-xxx.vsix` file
   - Install the extension to VS Code by `View/Command Palette`
   - Select `Extensions: Install from VSIX...` and choose the generated `liberty-tools-vscode-xxx.vsix` file

### Localization

#### package.json
This follows vscode extension standard: add localized strings in `package.nls.{locale}.json`.
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
## Issues

Please report bugs, issues and feature requests by creating a [GitHub issue](https://github.com/OpenLiberty/liberty-tools-vscode/issues).
