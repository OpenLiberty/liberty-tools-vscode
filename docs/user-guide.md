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
4. [Running your application's tests](#running-your-applications-tests)
5. [Viewing your application's test reports](#viewing-your-applications-test-reports)
6. [Stopping your application](#stopping-your-application)
7. [Debugging your application](#debugging-your-application)
8. [Manually adding your Liberty project to the tool window](#manually-adding-the-liberty-nature-to-a-project)
9. [Configuring a Liberty server](#configuring-a-liberty-server)
10. [Developing with Jakarta EE and MicroProfile APIs](#developing-microprofile-applications)

## Before you begin

### Application requirements

- Define a Liberty `server.xml` configuration file at location `src/main/liberty/config`.
- Configure the [Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven#configuration) or [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle#adding-the-plugin-to-the-build-script). We recommend using newer versions of the plugins as several important bug fixes have been included in recent versions.

Recommended minimum versions of:

- Liberty Maven Plugin -> 3.7.1
- Liberty Gradle Plugin -> 3.5.1

### Settings

To ensure that the Liberty Config Language Server starts properly, we advise users define the `xml.java.home` property in their VS Code settings.

Liberty Tools for IntelliJ IDEA will honour the:

- Maven home path set in the **Preferences > Build, Execution, Deployment > Build Tools > Maven** window when running Liberty dev mode on Maven projects.
- Gradle user home set in the **Preferences > Build, Execution, Deployment > Build Tools > Gradle** window when running Liberty dev mode on Gradle projects.

## Opening the Liberty dashboard

By default, the Liberty dashboard will appear in the Project Explorer side bar. Optionally, he Liberty dashboard can be dragged into the Activity Bar.

| Side Bar view | Activity Bar view |
| ------ | ----- |
| ![Liberty Dashboard Side Bar view](/images/docs/liberty_dashboard_side_bar.png) | ![Liberty Dashboard Activity Bar view](/images/docs/liberty_dashboard_activity_bar.png)|

If the dashboard is opened and there are projects that already properly configured to run on Liberty and use Liberty dev mode, those projects are automatically added to the dashboard when it opens.

If you add new projects or make changes, and you need the dashboard to be refreshed, use the refresh icon in the Liberty dashboard toolbar.

![Dashboard Refresh highlighted](/images/docs/dashboardToolbarRefresh.png)


## Running your application on Liberty using dev mode

There are three options ([Start](#start), [Start...](#start-with-configuration), [Start in container](#start-in-container)) for starting your Liberty application in dev mode by using the menu actions provided through the Liberty dashboard.

### Using the Liberty dashboard view

The Liberty dashboard provides a context menu to the Liberty projects in it. Users can choose the menu contents to perform a series of operations aiming to speed up application development.

![Dashboard context menu](/images/docs/liberty_dashboard_contextual.png)

### Using the Command Palette

The Liberty Tools plugin provides a set of actions to [command palette](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces). The command palette is accessible through a [number of ways](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces#accessing-the-vs-code-command-palette). Additionally, the `Shift` + `Alt` + `L` shortcut shows a similar menu with only Liberty commands.

![Liberty Command Palette](/images/docs/liberty_command_palette.png)

### Start

If you want to start your application in dev mode, you can either right-click on the application listed in the Liberty dashboard and click on the `Start` action, or select the `Liberty: Start` action in the command palette followed by your desired application.

A new terminal tab will open to run the application in dev mode.

![Start action started](/images/docs/devModeStarted.png)

### Start with Configuration

If you want to start your application in dev mode with custom configuration, you can either right-click on the application listed in the Liberty tool window, and click on the `Start...` action or select the `Liberty: Start...` action in the command palette followed by your desired application.
You can specify parameters for the [Liberty Maven dev goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#additional-parameters) or [Liberty Gradle dev task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#command-line-parameters).

![Liberty Start... action](/images/docs/devModeStartCustom.png)

A new terminal tab will open to run the application in dev mode.

![Liberty Start... action running in terminal](/images/docs/devModeStartCustomStarted.png)

The next time you choose to start with configuration again the menu will provide a history of previous used configurations.

![Liberty Start... history](/images/docs/devModeStartCustomHistory.png)

### Start in container

If you want to make use of dev mode for containers, you can either right-click on the application listed in the Liberty tool window, and click on the `Start in container` action or select the `Liberty: Start in container` action in the command palette followed by your desired application.

For more information on dev mode for containers, check out the [Liberty Maven devc goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode) or the [Liberty Gradle libertyDevc task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#libertydevc-task-container-mode).

![Liberty Start in container action](/images/docs/devModeStartContainer.png)

## Running your application's tests

Once your application is running on Liberty using dev mode, you can easily run the tests provided by your application.

To do this, you can either right-click on the application listed in the Liberty tool window, and click on the `Run tests` action or select the `Liberty: Run tests` action in the command palette followed by your desired application.

The tests are run in the corresponding terminal.

![Liberty run tests action](/images/docs/run_tests_action.png)

## Viewing your application's test reports

Once you are done running your application's tests, you can access the produced test reports.

![Liberty show test results](/images/docs/show_test_report.png)

### Maven built application

To view the integration test report for Maven built applications, you can either right-click on the application listed in the Liberty tool window, and click on the `View integration test report` action or select the `Liberty: View integration test report` action in the command palette followed by your desired application.

Note that this action will look for the integration test report at the default location `/target/site/failsafe-report.html`.

To view the unit test report for Maven built applications, you can either right-click on the application listed in the Liberty tool window, and click on the `View unit test report` action or select the `Liberty: View unit test report` action in the command palette followed by your desired application.

Note that this action will look for the unit test report at the default location `/target/site/surefire-report.html`.

### Gradle built application

To view the test report for Gradle built applications, you can either right-click on the application listed in the Liberty tool window, and click on the `View test report` action or select the `Liberty: View test report` action in the command palette followed by your desired application.

Note that this action will look for the test report at the default location `build/reports/tests/test/index.html`.

## Stopping your application

To stop your application, you can either right-click on the application listed in the Liberty tool window, and click on the `Stop` action or select the `Liberty: Stop` action in the command palette followed by your desired application.

![Stop action](/images/docs/devModeStop.png)

Once the project is stopped, the terminal in which it ran is closed.

## Debugging your application

To attach the debugger, you must have a [running server](#running-your-application-on-liberty-using-dev-mode). Once running, click on the `Attach debugger` action or select the `Liberty: Attach debugger` action in the command palette followed by your desired application.

![Attach Debugger](/images/docs/attach_debugger.png)

When attached, Visual Studio Code's [debug options](https://code.visualstudio.com/docs/editor/debugging) will become available.

![Debug Mode](/images/docs/debugger_mode.png)

## Manually adding the Liberty nature to a project

To manually add your Liberty project to the Liberty tool window, right click into an empty space in the project explorer and select `Add project to Liberty Dashboard` or select the `Liberty: Add project to the tool window` action in the command palette followed by your desired application.

![Liberty add project to tool window](/images/docs/add_liberty_project.png)

You will be prompted with a list of available projects that are not already displayed in the Liberty tool window.

![Liberty add project to tool window selection](/images/docs/add_liberty_project_2.png)

You can remove manually added Liberty projects from the Liberty tool window right clicking into an empty space in the project explorer and selecting `Remove project from Liberty Dashboard` or by selecting the `Liberty: Remove project from the tool window` action in the command palette followed by your desired application.

![Liberty Remove Project](/images/docs/removeLibertyProject.png)

## Configuring a Liberty server

Liberty configuration assistance is offered through the Liberty Config Language Server. For more information, see the [project documentation in GitHub](https://github.com/OpenLiberty/liberty-language-server#liberty-config-language-server).

1. Start the project in dev mode, using one of the Liberty tool window start commands above. This will install the Liberty features required for your application and allow generation of a corresponding server.xml schema file.
2. Open your server.xml file. Proceed to use Liberty specific editing support: completion by typing `Ctrl`/`Cmd` + `Space` at a given point within the document.
3. Open your bootstrap.properties or server.env file. Proceed to use Liberty specific editing support: completion by typing `Ctrl`/`Cmd` + `Space` at a given point within the document.

![LCLS server.xml completion](/images/docs/serverXmlCompletion.png)

## Developing MicroProfile applications

Editing assistance for configuration and application files for Jakarta EE and MicroProfile APIs is provided through the following language server projects, which this project consumes. For more information, see the documentation for these projects:

- Jakarta EE APIs in Java files: [Eclipse LSP4Jakarta](https://github.com/eclipse/lsp4jakarta#eclipse-lsp4jakarta), the Language Server for Jakarta EE.
- MicroProfile APIs in microprofile-config.properties and Java files: [Eclipse LSP4MP](https://github.com/eclipse/lsp4mp#eclipse-lsp4mp---language-server-for-microprofile), the Language Server for MicroProfile.

Open a Java or microprofile-config.properties file. Proceed to use Jakarta EE and MicroProfile specific editing support: completion by typing `Ctrl`/`Cmd` + `Space` at a given point within the document.

![Eclipse LSP4Jakarta RESTful WS completion](/images/docs/lsp4jakarta_completion.png)
