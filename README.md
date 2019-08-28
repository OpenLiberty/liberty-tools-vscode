# Liberty Dev Mode for VS Code
A VS Code extension for liberty:dev mode. The extension will automatically run your Liberty Maven project in dev mode if it detects the `io.openliberty.tools:liberty-maven-plugin` or `boost.runtimes:openliberty`/`boost.runtimes:wlp` in the `pom.xml`. Through the Liberty Dev Dashboard explorer on the side bar, you can view all available Liberty dev projects in your workspace

## Features
- View supported `liberty-maven-plugin` projects in the workspace (must be of version `3.0.M1` or higher)
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports

## Installing the Extension

- download the latest `liberty-dev-vscode-ext-0.x.vsix` file from [releases](https://github.com/OpenLiberty/liberty-dev-vscode-ext/releases)
- from VS Code select `Install from vsix...` and select the `liberty-dev-vscode-ext-0.x.vsix` file

### Generate and install the .vsix file
- `git clone git@github.com:OpenLiberty/liberty-dev-vscode-ext.git`
- navigate to the cloned `liberty-dev-vscode-ext` directory
- `vsce package` to generate the `liberty-dev-vscode-ext-0.x.vsix` file
- from VS Code select `Install from vsix...` and select the `liberty-dev-vscode-ext-0.x.vsix` file

### Start the extension in debug mode
- `git clone git@github.com:OpenLiberty/liberty-dev-vscode-ext.git`
- navigate to the cloned `liberty-dev-vscode-ext` directory in VS Code
- `F5` to launch the extension in debug mode

## Contributing
Our [CONTRIBUTING](CONTRIBUTING.md) document contains details for submitting pull requests.