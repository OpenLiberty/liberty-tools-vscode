# Liberty Tools for Visual Studio Code User Guide

This guide provides detailed instructions on how to configure your Liberty project to use the Liberty Tools for Visual Studio Code extension.

- [Before you begin](#before-you-begin)
  - [Application requirements](#application-requirements)
  - [Settings](#settings)
- [Open the Liberty dashboard](#open-the-liberty-dashboard)
- [Run your application on Liberty using dev mode](#run-your-application-on-liberty-using-dev-mode)
  - [Use the Liberty dashboard](#use-the-liberty-dashboard)
  - [Use the Visual Studio Code Command Palette](#use-the-visual-studio-code-command-palette)
  - [Start your application in dev mode](#start-your-application-in-dev-mode)
  - [Start your application in dev mode in a container](#start-your-application-in-dev-mode-in-a-container)
  - [Start your application in dev mode with configuration](#start-your-application-in-dev-mode-with-configuration)
- [Run your application tests](#run-your-application-tests)
- [View your application test reports](#view-your-application-test-reports)
- [Stop your application](#stop-your-application)
- [Debug your application](#debug-your-application)
- [Manually add your liberty project to the dashboard](#manually-add-your-liberty-project-to-the-dashboard)
- [Configure a Liberty server](#configure-a-liberty-server)
- [Develop with Jakarta EE and MicroProfile APIs](#develop-with-jakarta-ee-and-microprofile-apis)

## Before you begin

### Software requirements

- Java 17 is required by Liberty Tools for Visual Studio Code.

### Application requirements

- Define a Liberty `server.xml` configuration file in the `src/main/liberty/config` location.
- Configure the [Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven#configuration) or [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle#adding-the-plugin-to-the-build-script). We recommend using recent versions of the plugins as they include several important bug fixes.

  The following versions are recommended at minimum:
  - Liberty Maven Plugin -> 3.7.1
  - Liberty Gradle Plugin -> 3.5.1

### Settings

To ensure that the Liberty Config Language Server starts properly, define the `xml.java.home` property in your VS Code settings or set the system `JAVA_HOME` environment variable to point to Java 17 .

## Open the Liberty dashboard

By default, the Liberty dashboard appears in the Project Explorer side bar. Optionally, you can drag the Liberty dashboard into the Activity Bar.

| Side Bar view | Activity Bar view |
| ------ | ----- |
| ![Liberty Dashboard Side Bar view](/docs/user-guide-screenshots/liberty_dashboard_side_bar.png) | ![Liberty Dashboard Activity Bar view](/docs/user-guide-screenshots/liberty_dashboard_activity_bar.png)|

Projects that are already properly configured to run on Liberty and use Liberty dev mode are automatically added the Liberty dashboard when it opens. If your Liberty project does not show up in the Liberty dashboard automatically and you have the Liberty Maven or Liberty Gradle plugin configured, check out [how to manually add your project to the Liberty dashboard](#manually-add-your-liberty-project-to-the-dashboard).

If you add new projects or make changes, use the refresh icon in the Liberty dashboard toolbar to refresh the dashboard view.

![Dashboard Refresh highlighted](/docs/user-guide-screenshots/dashboardToolbarRefresh.png)

## Run your application on Liberty using dev mode

The following three menu actions are available to start your Liberty application in dev mode through the Liberty dashboard or the Visual Studio Code command palette:

- [Start your application in dev mode](#start-your-application-in-dev-mode)
- [Start your application in dev mode with configuration](#start-your-application-in-dev-mode-with-configuration)
- [Start your application in dev mode in a container](#start-your-application-in-dev-mode-in-a-container)

### Use the Liberty dashboard

The Liberty dashboard provides a context menu for Liberty projects. You can choose different commands from the menu to speed up application development.

![Dashboard context menu](/docs/user-guide-screenshots/liberty_dashboard_contextual.png)

### Use the Visual Studio Code Command Palette

The Liberty Tools plugin provides a set of commands to the [command palette](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces). The command palette is accessible a [number of ways](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces#accessing-the-vs-code-command-palette). Additionally, the <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> shortcut shows a similar menu with only Liberty commands.

All Liberty Tools commands that are described in the following sections are also available from the command palette.

![Liberty Command Palette](/docs/user-guide-screenshots/liberty_command_palette.png)

### Start your application in dev mode

To start your application in dev mode, select the **Start** command for your application in the Liberty dashboard.

A new terminal tab opens to run the application in dev mode.

![Start command started](/docs/user-guide-screenshots/devModeStarted.png)

### Start your application in dev mode with configuration

To start your application in dev mode with custom configuration, select the **Start...** command for your application in the Liberty dashboard. The command opens an edit dialog where you can specify parameters for the [Liberty Maven dev goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#additional-parameters) or [Liberty Gradle dev task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#command-line-parameters).

![Liberty Start... command](/docs/user-guide-screenshots/devModeStartCustom.png)

A new terminal tab opens to run the application in dev mode.

![Liberty Start... command running in terminal](/docs/user-guide-screenshots/devModeStartCustomStarted.png)

The next time you choose to start dev mode with configuration, the menu provides a history of previously used configurations.

![Liberty Start... history](/docs/user-guide-screenshots/devModeStartCustomHistory.png)

### Start your application in dev mode in a container

To use dev mode for containers, select the **Start in container** command for your application in the Liberty dashboard.

![Liberty Start in container command](/docs/user-guide-screenshots/devModeStartContainer.png)

For more information on dev mode for containers, check out the [Liberty Maven devc goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode) or the [Liberty Gradle libertyDevc task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#libertydevc-task-container-mode).

## Run your application tests

After your application is running on Liberty using dev mode, you can easily run the tests provided by your application.

To run tests, select the **Run tests** command for your application in the Liberty dashboard.

The tests are run in the corresponding terminal.

![Liberty run tests command](/docs/user-guide-screenshots/run_tests_command.png)

## View your application test reports

After you finish running your application tests, you can access the produced test reports.

![Liberty show test results](/docs/user-guide-screenshots/show_test_report.png)

### Maven-built applications

To view the integration test report for Maven-built applications, select the **View integration test report** command for your application in the Liberty dashboard.

This command looks for the integration test report at the `/target/site/failsafe-report.html` default location.

To view the unit test report for Maven-built applications, select the **View unit test report** command for your application in the Liberty dashboard.

This command looks for the unit test report at the`/target/site/surefire-report.html` default location.

### Gradle-built applications

To view the test report for Gradle-built applications, select the **View test report** command for your application in the Liberty dashboard.

This command looks for the test report at the `build/reports/tests/test/index.html` default location.

## Stop your application

To stop your application, select the **Stop** command for your application in the Liberty dashboard.

![Stop command](/docs/user-guide-screenshots/devModeStop.png)

## Debug your application

To attach the debugger, you must have a [running server](#run-your-application-on-liberty-using-dev-mode). Once the server is running, click the **Attach debugger** command or select the **Liberty: Attach debugger** command in the command palette, followed by your application.

![Attach Debugger](/docs/user-guide-screenshots/attach_debugger.png)

When the debugger is attached, the Visual Studio Code [debug options](https://code.visualstudio.com/docs/editor/debugging) become available.

![Debug Mode](/docs/user-guide-screenshots/debugger_mode.png)

## Manually add your Liberty project to the dashboard

In the event that your Liberty project is not automatically detected by the Liberty dashboard, you can manually add your Liberty project to the Liberty dashboard. To manually add your Liberty project to the Liberty dashboard, right-click into an empty space in the project explorer and select **Add project to Liberty Dashboard** or select the **Liberty: Add project to the tool window** command in the command palette, followed by your application.

![Liberty add project to tool window](/docs/user-guide-screenshots/add_liberty_project.png)

You are prompted with a list of projects that are not already displayed in the in the Liberty dashboard.

![Liberty add project to tool window selection](/docs/user-guide-screenshots/add_liberty_project_2.png)

To remove manually added Liberty projects from the Liberty dashboard, right-click in an empty space in the project explorer and select **Remove project from Liberty Dashboard** or select the **Liberty: Remove project from the tool window** command in the command palette, followed by your application.

![Liberty Remove Project](/docs/user-guide-screenshots/removeLibertyProject.png)

## Configure a Liberty server

Liberty configuration assistance provides editing assistance, such as [code completion, diagnostics, and quick-fixes](https://github.com/OpenLiberty/liberty-language-server#features), in Liberty `server.xml`, `server.env`, and `bootstrap.properties` files.

1. Start the project in dev mode by using one of the previously described Liberty dashboard or command palette commands. Dev mode installs the Liberty features that are required for your application.
2. Open any of the supported Liberty configuration files.
3. To use Liberty-specific code completion, press <kbd>Ctrl/Cmd</kbd> + <kbd>Space</kbd> anywhere within the document. A drop-down list of completion suggestions appears.

Liberty configuration assistance is offered through the Liberty Config Language Server. For more information, see the [project documentation in GitHub](https://github.com/OpenLiberty/liberty-language-server#liberty-config-language-server).

![LCLS server.xml completion](/docs/user-guide-screenshots/serverXmlCompletion.png)

## Develop with Jakarta EE and MicroProfile APIs

Liberty Tools editing assistance provides code completion in configuration and application files for Jakarta EE and MicroProfile APIs.

1. Open a Java or microprofile-config.properties file.
2. To use Jakarta EE-specific and MicroProfile-specific code completion, press <kbd>Ctrl</kbd> + <kbd>Space</kbd> / <kbd>Cmd</kbd> + <kbd>Space</kbd> anywhere within the document. A drop-down list of completion suggestions appears.

Open a Java or microprofile-config.properties file. Proceed to use Jakarta EE and MicroProfile specific editing support: completion by typing `Ctrl`/`Cmd` + `Space` at a given point within the document.

![Eclipse LSP4Jakarta RESTful completion](/docs/screenshots/lsp4jakarta_completion.png)

![Eclipse LSP4MP microprofile-config.properties completion](/docs/user-guide-screenshots/mp_completion.png)

Jakarta EE API configuration assistance is offered through Eclipse LSP4Jakarta, the Language Server for Jakarta EE. For more information, see the [project documentation in GitHub](https://github.com/eclipse/lsp4jakarta#eclipse-lsp4jakarta).

MicroProfile EE API configuration assistance is offered through Eclipse LSP4MP, the Language Server for MicroProfile. For more information, see the [project documentation in GitHub](https://github.com/eclipse/lsp4mp#eclipse-lsp4mp---language-server-for-microprofile).
