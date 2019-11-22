# Open Liberty Tools for VS Code
A VS Code extension for Open Liberty. The extension will detect your Liberty Maven project if it detects the `io.openliberty.tools:liberty-maven-plugin` in the `pom.xml`. Through the Liberty Dev Dashboard, you can start, stop, or interact with [Liberty dev mode](https://github.com/OpenLiberty/ci.maven/blob/master/docs/dev.md#dev) on all available Liberty Maven projects in your workspace.

## Quick Start
- Install the extension
- Open Liberty supported projects will appear in the Liberty Dev Dashboard on the side bar
- Right-click a project in the Liberty Dev Dashboard to view the available commands

## Features
- View supported `liberty-maven-plugin` projects in the workspace (`liberty-maven-plugin` should be of version `3.1` or higher)
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports

## Configurable User Settings
| Setting | Description | Default Value |
| --------  | ----------- | -------  |
| liberty.terminal.useJavaHome | If this value is true, and if the setting `java.home` has a value, then the environment variable `JAVA_HOME` will be set to the value of `java.home` when a new terminal window is created. | False |

## Contributing
Our [CONTRIBUTING](CONTRIBUTING.md) document contains details for submitting pull requests.
