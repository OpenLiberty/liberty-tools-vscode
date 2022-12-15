# Liberty Tools for Visual Studio Code User Guide

1. [Before you begin](#before-you-begin)
    - [Application requirements](#application-requirements)
    - [Settings](#settings)
2. [Opening the Liberty dashboard](#opening-the-liberty-dashboard)
3. [Running your application on Liberty using dev mode](#running-your-application-on-liberty-using-dev-mode)
    - [Using the Liberty dashboard view](#using-the-liberty-dashboard-view)
    - [Using the Command Palette](#using-the-command-palette)
    - [Start](#start)
    - [Start with configuration](#start-with-configuration)
    - [Start in container](#start-in-container)
4. [Running your application tests](#running-your-application-tests)
5. [Viewing your application test reports](#viewing-your-application-test-reports)
6. [Stopping your application](#stopping-your-application)
7. [Debugging your application](#debugging-your-application)
8. [Manually adding your Liberty project to the tool window](#manually-adding-the-liberty-nature-to-a-project)
9. [Configuring a Liberty server](#configuring-a-liberty-server)
10. [Develop with Jakarta EE and MicroProfile APIs](#develop-microprofile-applications)

## Before you begin

### Application requirements

- Define a Liberty `server.xml` configuration file at location `src/main/liberty/config`.
- Configure the [Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven#configuration) or [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle#adding-the-plugin-to-the-build-script). We recommend using newer versions of the plugins as several important bug fixes have been included in recent versions.
  - Recommended minimum versions of:
    - Liberty Maven Plugin -> 3.7.1
    - Liberty Gradle Plugin -> 3.5.1

### Settings

To ensure that the Liberty Config Language Server starts properly, we advise users define the `xml.java.home` property in their VS Code settings.

## Opening the Liberty dashboard

By default, the Liberty dashboard will appear in the Project Explorer side bar. Optionally, the Liberty dashboard can be dragged into the Activity Bar.

| Side Bar view | Activity Bar view |
| ------ | ----- |
| ![Liberty Dashboard Side Bar view](/docs/user-guide-screenshots/liberty_dashboard_side_bar.png) | ![Liberty Dashboard Activity Bar view](/docs/user-guide-screenshots/liberty_dashboard_activity_bar.png)|

If the dashboard is opened and there are projects that already properly configured to run on Liberty and use Liberty dev mode, those projects are automatically added to the dashboard when it opens.

If you add new projects or make changes, and you need the dashboard to be refreshed, use the refresh icon in the Liberty dashboard toolbar.

![Dashboard Refresh highlighted](/docs/user-guide-screenshots/dashboardToolbarRefresh.png)


## Running your application on Liberty using dev mode

There are three options ([Start](#start), [Start...](#start-with-configuration), [Start in container](#start-in-container)) for starting your Liberty application in dev mode by using the menu commands provided through the Liberty dashboard.

### Using the Liberty dashboard view

The Liberty dashboard provides a context menu to the Liberty projects in it. Users can choose the menu contents to perform a series of operations aiming to speed up application development.

![Dashboard context menu](/docs/user-guide-screenshots/liberty_dashboard_contextual.png)

### Using the Command Palette

The Liberty Tools plugin provides a set of commands to the [command palette](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces). The command palette is accessible a [number of ways](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces#accessing-the-vs-code-command-palette). Additionally, the `Shift` + `Alt` + `L` shortcut shows a similar menu with only Liberty commands.

![Liberty Command Palette](/docs/user-guide-screenshots/liberty_command_palette.png)

### Start

If you want to start your application in dev mode, select the **Start** command for your application in the Liberty dashboard or select the `Liberty: Start` command in the command palette followed by your desired application.

A new terminal tab opens to run the application in dev mode.

![Start command started](/docs/user-guide-screenshots/devModeStarted.png)

### Start with Configuration

If you want to start your application in dev mode with custom configuration, select the **Start...** command for your application in the Liberty dashboard or select the `Liberty: Start...` command in the command palette followed by your desired application.
You can specify parameters for the [Liberty Maven dev goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#additional-parameters) or [Liberty Gradle dev task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#command-line-parameters).

![Liberty Start... command](/docs/user-guide-screenshots/devModeStartCustom.png)

A new terminal tab opens to run the application in dev mode.

![Liberty Start... command running in terminal](/docs/user-guide-screenshots/devModeStartCustomStarted.png)

The next time you choose to start with configuration again the menu will provide a history of previous used configurations.

![Liberty Start... history](/docs/user-guide-screenshots/devModeStartCustomHistory.png)

### Start in container

If you want to make use of dev mode for containers, select the **Start in container** command for your application in the Liberty dashboard or select the `Liberty: Start in container` command in the command palette followed by your desired application.

For more information on dev mode for containers, check out the [Liberty Maven devc goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode) or the [Liberty Gradle libertyDevc task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#libertydevc-task-container-mode).

![Liberty Start in container command](/docs/user-guide-screenshots/devModeStartContainer.png)

## Running your application tests

Once your application is running on Liberty using dev mode, you can easily run the tests provided by your application.

To do this, select the **Run tests** command for your application in the Liberty dashboard or select the `Liberty: Run tests` command in the command palette followed by your desired application.

The tests are run in the corresponding terminal.

![Liberty run tests command](/docs/user-guide-screenshots/run_tests_command.png)

## Viewing your application test reports

After you finish running your application tests, you can access the produced test reports.

![Liberty show test results](/docs/user-guide-screenshots/show_test_report.png)

### Maven built application

To view the integration test report for Maven built applications, select the **View integration test report** command for your application in the Liberty dashboard or select the `Liberty: View integration test report` command in the command palette followed by your desired application.

Note that this command will look for the integration test report at the default location `/target/site/failsafe-report.html`.

To view the unit test report for Maven built applications, select the **View unit test report** command for your application in the Liberty dashboard or select the `Liberty: View unit test report` command in the command palette followed by your desired application.

Note that this command will look for the unit test report at the default location `/target/site/surefire-report.html`.

### Gradle built application

To view the test report for Gradle built applications, select the **View test report** command for your application in the Liberty dashboard or select the `Liberty: View test report` command in the command palette followed by your desired application.

Note that this command will look for the test report at the default location `build/reports/tests/test/index.html`.

## Stopping your application

To stop your application, select the **Stop** command for your application in the Liberty dashboard or select the `Liberty: Stop` command in the command palette followed by your desired application.

![Stop command](/docs/user-guide-screenshots/devModeStop.png)

Once the project is stopped, the terminal in which it ran is closed.

## Debugging your application

To attach the debugger, you must have a [running server](#running-your-application-on-liberty-using-dev-mode). Once running, click on the `Attach debugger` command or select the `Liberty: Attach debugger` command in the command palette followed by your desired application.

![Attach Debugger](/docs/user-guide-screenshots/attach_debugger.png)

When attached, Visual Studio Code's [debug options](https://code.visualstudio.com/docs/editor/debugging) will become available.

![Debug Mode](/docs/user-guide-screenshots/debugger_mode.png)

## Manually adding the Liberty nature to a project

To manually add your Liberty project to the in the Liberty dashboard, right click into an empty space in the project explorer and select **Add project to Liberty Dashboard** or select the `Liberty: Add project to the tool window` command in the command palette followed by your desired application.

![Liberty add project to tool window](/docs/user-guide-screenshots/add_liberty_project.png)

You will be prompted with a list of available projects that are not already displayed in the in the Liberty dashboard.

![Liberty add project to tool window selection](/docs/user-guide-screenshots/add_liberty_project_2.png)

You can remove manually added Liberty projects from the in the Liberty dashboard right clicking into an empty space in the project explorer and selecting `Remove project from Liberty Dashboard` or by selecting the `Liberty: Remove project from the tool window` command in the command palette followed by your desired application.

![Liberty Remove Project](/docs/user-guide-screenshots/removeLibertyProject.png)

## Configuring a Liberty server

Liberty configuration assistance is offered through the Liberty Config Language Server. For more information, see the [project documentation in GitHub](https://github.com/OpenLiberty/liberty-language-server#liberty-config-language-server).

1. Start the project in dev mode by using one of the previously described Liberty dashboard or command palette commands. Dev mode installs the Liberty features that are required for your application.
2. Open any of the supported Liberty configuration files.
3. To use Liberty-specific code completion, press `Ctrl`/`Cmd` + `Space` anywhere within the document. A drop-down list of completion suggestions appears.

![LCLS server.xml completion](/docs/user-guide-screenshots/serverXmlCompletion.png)

## Develop MicroProfile applications

Editing assistance for configuration and application files for Jakarta EE and MicroProfile APIs is provided through the following language server projects, which this project consumes. For more information, see the documentation for these projects:

- Jakarta EE APIs in Java files: [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta#eclipse-lsp4jakarta), the Language Server for Jakarta EE.
- MicroProfile APIs in microprofile-config.properties and Java files: [Eclipse LSP4MP](https://github.com/eclipse/lsp4mp#eclipse-lsp4mp---language-server-for-microprofile), the Language Server for MicroProfile.

Open a Java or microprofile-config.properties file. Proceed to use Jakarta EE and MicroProfile specific editing support: completion by typing `Ctrl`/`Cmd` + `Space` at a given point within the document.

![Eclipse LSP4Jakarta RESTful completion](/docs/screenshots/lsp4jakarta_completion.png)

![Eclipse LSP4MP microprofile-config.properties completion](/docs/user-guide-screenshots/mp_completion.png)
