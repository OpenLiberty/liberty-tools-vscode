# Liberty Tools for Visual Studio Code User Guide

This guide provides detailed instructions on how to configure your Liberty project to use the Liberty Tools for Visual Studio Code extension.
For information regarding known issues and limitations, refer to our [Common Issues](https://github.com/OpenLiberty/liberty-tools-vscode/wiki/Common-Issues) wiki page or our [Known Problems and Limitations](https://github.com/OpenLiberty/liberty-tools-vscode/wiki/Known-Problems-and-Limitations) wiki page.

- [Before you begin](#before-you-begin)
  - [Software requirements](#software-requirements)
  - [Application requirements](#application-requirements)
  - [Configure your Java runtime for language servers](#configure-your-java-runtime-for-language-servers)
  - [Liberty Tools settings](#liberty-tools-settings)
  - [External extension settings](#external-extension-settings)
  - [Terminal shell support](#terminal-shell-support)
- [Liberty Tools](#liberty-tools)
- [Run your application on Liberty using dev mode](#run-your-application-on-liberty-using-dev-mode)
  - [Use Liberty Tools](#use-liberty-tools)
  - [Use the Visual Studio Code Command Palette](#use-the-visual-studio-code-command-palette)
  - [Start your application in dev mode](#start-your-application-in-dev-mode)
  - [Start your application in dev mode in a container](#start-your-application-in-dev-mode-in-a-container)
  - [Start your application in dev mode with configuration](#start-your-application-in-dev-mode-with-configuration)
- [Run your application tests](#run-your-application-tests)
- [View your application test reports](#view-your-application-test-reports)
  - [Customize test report locations](#customize-test-report-locations)
- [Stop your application](#stop-your-application)
- [Debug your application](#debug-your-application)
  - [Start in debug mode](#start-in-debug-mode)
  - [Attach debugger manually](#attach-debugger-manually)
- [Create a Liberty project](#create-a-liberty-project)
- [Manually add your Liberty project to Liberty Tools](#manually-add-your-liberty-project-to-liberty-tools)
  - [Manually remove project](#manually-remove-project)
- [Multi-module projects](#multi-module-projects)
- [Custom configuration directory (Maven)](#custom-configuration-directory-maven)
- [Configure a Liberty server](#configure-a-liberty-server)
- [Develop with Jakarta EE and MicroProfile APIs](#develop-with-jakarta-ee-and-microprofile-apis)

## Before you begin

### Software requirements
<!-- Match the VSCode and Java version with the README.md -->
- **Visual Studio Code 1.78.0** or later.
- **Java 21** or later is required by Liberty Tools for Visual Studio Code. To point Visual Studio Code to a specific runtime, see [Settings](#settings) for more information.

### Application requirements

- Define a Liberty `server.xml` configuration file in the `src/main/liberty/config` location. For Maven projects, you can use a different location by setting `configDirectory` in the Liberty Maven Plugin configuration. See [Custom configuration directory (Maven)](#custom-configuration-directory-maven).
- Ensure the `src/main/webapp` directory exists in your project. If your application serves web content, this directory is required for Liberty to resolve file paths correctly (for example, `getRealPath()` returns `null` without it). If you use a deployment descriptor, place your `web.xml` file at `src/main/webapp/WEB-INF/web.xml`.
- [Configure the Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven#configuration) or [configure the Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle#adding-the-plugin-to-the-build-script). We recommend using the most recent versions of the plugins as they include several important bug fixes.

    - [Liberty Maven Plugin latest release](https://github.com/OpenLiberty/ci.maven/releases/latest)

    - [Liberty Gradle Plugin latest release](https://github.com/OpenLiberty/ci.gradle/releases/latest)

### Configure your Java runtime for language servers

Liberty Tools for Visual Studio Code requires Java 21 or later to ensure that the following language servers start properly:
- [Liberty Config Language Server](https://github.com/OpenLiberty/liberty-language-server)
- [Eclipse Language Server for Jakarta EE](https://github.com/eclipse/lsp4jakarta)
- [XML Language Server (LemMinX)](https://github.com/eclipse/lemminx) 

A toast message alerts you if any language server fails to run or if Visual Studio Code has trouble locating your Java.

<img src="/docs/screenshots/update%20jdk%20toast.png" width="40%"/> 
<img src="/docs/screenshots/java_21_toast_alert.png" width="40%" />

To resolve this issue, you can define settings in your Visual Studio Code [settings.json](https://code.visualstudio.com/docs/getstarted/settings#_settingsjson) file or set system environment variables to point Liberty Tools to Java 21 or later. 

Liberty Tools checks all available Java sources and selects the best Java 21+ installation, skipping any source that provides an older version rather than stopping with an error. The sources are checked in the following priority order:

1. The [embedded JRE](https://github.com/redhat-developer/vscode-java#java-tooling-jdk) included by [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java).
2. `java.configuration.runtimes` in settings.json (entry marked `default: true` is preferred).
3. `java.jdt.ls.java.home` in settings.json.
4. `xml.java.home` in settings.json.
5. `java.import.maven.java.home` or `java.import.gradle.java.home` in settings.json.
6. `JAVA_HOME` or `JDK_HOME` as system environment variables.
7. JDKs discovered on the system path (Homebrew, SDKMAN, jEnv, OS defaults).

If a source provides a Java version older than 21, it is skipped and the next source is tried. An error is shown only if no Java 21+ installation is found across all sources.

By default, Liberty Tools installs the latest version of the Language Support for Java(TM) by Red Hat extension. The latest version contains an embedded JRE higher than Java 21 and therefore no additional configuration is required. However, if using an older version of the Language Support for Java(TM) by Red Hat extension or using the universal version without the embedded JRE causes an issue, then any of the settings listed above can be configured to point to Java 21 or later.

![settings.json example](/docs/screenshots/settings.json%20path%20example.png)

### Liberty Tools settings

The following settings are provided by Liberty Tools and can be configured in your VS Code [settings.json](https://code.visualstudio.com/docs/getstarted/settings#_settingsjson) file or through the Settings UI (`Cmd+,` / `Ctrl+,`) by searching for **Liberty**.

| Setting | Description | Default |
| --- | --- | --- |
| `liberty.java.home` | Path to the JDK used to run Liberty dev mode in the terminal. When set, this overrides any JDK detected from VS Code Java settings (`java.configuration.runtimes`, `java.jdt.ls.java.home`). Leave empty to use the JDK configured via VS Code Java settings, or the system PATH if none is set. | `""` |
| `liberty.dev.debugStartTimeout` | Maximum time in seconds to wait for the Liberty server to start before automatically attaching the debugger when using **Start in debug mode**. Increase this value if your server takes longer than the default to start. | `180` |

### External extension settings

| Setting | Description | Provided By |
| --- | --- | --- |
| `maven.executable.path` | Maven commands executed by dev mode honour this setting. When this value is empty, dev mode tries to use `mvn` or `mvnw` according to the value of `maven.executable.preferMavenWrapper`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven) |
| `maven.executable.preferMavenWrapper` | Maven commands executed by dev mode honour this setting. If this setting set to `true`, dev mode tries to use `mvnw` if a Maven wrapper file can be found. Otherwise, it uses `mvn`. | [Maven for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven) |
| `java.import.gradle.wrapper.enabled` | Gradle commands executed by dev mode honour this setting. If this setting is set to `true`, dev mode tries to use `gradlew` if a Gradle wrapper file can be found. Otherwise, it uses `gradle`. | [Language support for Java extension](https://marketplace.visualstudio.com/items?itemName=redhat.java) |
| `xml.java.home` | This setting allows a user to define their LemMinX language server runtime without altering the `JAVA_HOME` environment variable.  | Not set |
| `java.jdt.ls.java.home` | This setting specifies the folder path to the JDK (21 or later) that is used to launch the Java Language Server. This setting replaces the Java extension's embedded JRE to start the language servers.  | Not set |

### Configure the JDK used for Liberty dev mode terminals

When you start a Liberty project, Liberty Tools sets `JAVA_HOME` in the terminal to the JDK configured for that specific project. Each project in a multi-root workspace resolves its own JDK independently. The JDK is selected in the following priority order:

1. `liberty.java.home` in settings.json — manual override, takes priority over everything else.
2. `java.configuration.runtimes` in the project's `.vscode/settings.json` (entry marked `default: true` is preferred).
3. `java.jdt.ls.java.home`, `xml.java.home`, `java.import.maven.java.home`, `java.import.gradle.java.home`, or `java.home` in settings.json.
4. `JAVA_HOME` or `JDK_HOME` as system environment variables.
5. JDKs discovered on the system path.

If no JDK is found, the terminal opens without a `JAVA_HOME` prefix and uses whatever `java` is available on the system PATH.

Note: The JDK used for the dev mode terminal is resolved independently from the JDK used to run the language servers. A project can run dev mode on Java 17 while the language servers run on Java 21.

Note: The `liberty.terminal.useJavaHome` setting is deprecated and no longer has any effect. If you previously used it to point Liberty terminals at a specific JDK via `java.home`, you can now set `liberty.java.home` directly to the JDK path, or leave it unset to let Liberty Tools detect the JDK automatically from the sources listed above.

### Terminal shell support

Liberty Tools supports the default shell types for each OS in the Visual Studio Code terminal. These include:
- Linux: Bash or sh
- macOS: Bash or Zsh
- Windows: Command Prompt (cmd.exe)

It may be possible to use other shell types, but support is not guaranteed. Please feel free to open an enhancement issue if your preferred shell type is not supported: https://github.com/OpenLiberty/liberty-tools-vscode/issues.

## Liberty Tools

By default, Liberty Tools appears in the Project Explorer side bar. Optionally, you can drag Liberty Tools into the Activity Bar.

| Side Bar view | Activity Bar view |
| ------ | ----- |
| ![Liberty Tools Side Bar view](/docs/user-guide-screenshots/liberty_dashboard_side_bar.png) | ![Liberty Tools Activity Bar view](/docs/user-guide-screenshots/liberty_dashboard_activity_bar.png)|

Projects that are already properly configured to run on Liberty and use Liberty dev mode are automatically added to Liberty Tools when it opens. If your Liberty project does not show up in Liberty Tools automatically and you have the Liberty Maven or Liberty Gradle plugin configured, check out [how to manually add your project to Liberty Tools](#manually-add-your-liberty-project-to-liberty-tools).

If you add new projects or make changes, use the refresh icon in the Liberty Tools toolbar to refresh the view.

![Dashboard Refresh highlighted](/docs/user-guide-screenshots/dashboardToolbarRefresh.png)

## Run your application on Liberty using dev mode

The following three menu actions are available to start your Liberty application in dev mode through Liberty Tools or the Visual Studio Code command palette:

- [Start your application in dev mode](#start-your-application-in-dev-mode)
- [Start your application in dev mode with configuration](#start-your-application-in-dev-mode-with-configuration)
- [Start your application in dev mode in a container](#start-your-application-in-dev-mode-in-a-container)

### Use Liberty Tools

Liberty Tools provides a context menu for Liberty projects. You can choose different commands from the menu to speed up application development.

![Dashboard context menu](/docs/user-guide-screenshots/liberty_dashboard_contextual.png)

### Use the Visual Studio Code Command Palette

The Liberty Tools plugin provides a set of commands to the [command palette](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces). The command palette is accessible a [number of ways](https://docs.github.com/en/codespaces/codespaces-reference/using-the-vs-code-command-palette-in-codespaces#accessing-the-vs-code-command-palette). Additionally, the <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> shortcut shows a similar menu with only Liberty commands.

All Liberty Tools commands that are described in the following sections are also available from the command palette.

![Liberty Command Palette](/docs/user-guide-screenshots/liberty_command_palette.png)

### Start your application in dev mode

To start your application in dev mode, select the **Start** command for your application in Liberty Tools.

A new terminal tab opens to run the application in dev mode.

![Start command started](/docs/user-guide-screenshots/devModeStarted.png)

### Start your application in dev mode with configuration

To start your application in dev mode with custom configuration, select the **Start...** command for your application in Liberty Tools. The command opens an edit dialog where you can specify parameters for the [Liberty Maven dev goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#additional-parameters) or [Liberty Gradle dev task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#command-line-parameters).

![Liberty Start... command](/docs/user-guide-screenshots/devModeStartCustom.png)

A new terminal tab opens to run the application in dev mode.

![Liberty Start... command running in terminal](/docs/user-guide-screenshots/devModeStartCustomStarted.png)

The next time you choose to start dev mode with configuration, the menu provides a history of previously used configurations.

![Liberty Start... history](/docs/user-guide-screenshots/devModeStartCustomHistory.png)

### Start your application in dev mode in a container

To use dev mode for containers, select the **Start in container** command for your application in Liberty Tools.

![Liberty Start in container command](/docs/user-guide-screenshots/devModeStartContainer.png)

For more information on dev mode for containers, check out the [Liberty Maven devc goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode) or the [Liberty Gradle libertyDevc task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md#libertydevc-task-container-mode).

## Run your application tests

After your application is running on Liberty using dev mode, you can easily run the tests provided by your application.

To run tests, select the **Run tests** command for your application in Liberty Tools.

The tests are run in the corresponding terminal.

![Liberty run tests command](/docs/user-guide-screenshots/run_tests_command.png)

## View your application test reports

After you finish running your application tests, you can access the produced test reports.

![Liberty show test results](/docs/user-guide-screenshots/show_test_report.png)

### Maven-built applications

To view the integration test report for Maven-built applications, select the **View integration test report** command for your application in Liberty Tools.

This command looks for the integration test report at the `/target/site/failsafe-report.html` default location.

To view the unit test report for Maven-built applications, select the **View unit test report** command for your application in Liberty Tools.

This command looks for the unit test report at the`/target/site/surefire-report.html` default location.

### Gradle-built applications

To view the test report for Gradle-built applications, select the **View test report** command for your application in Liberty Tools.

This command looks for the test report at the `build/reports/tests/test/index.html` default location.

### Customize test report locations

By default, Liberty Tools looks for test reports at the locations described above. If your build produces reports at a different path, Liberty Tools resolves the location using the following priority order.

#### Maven report location resolution

1. **VS Code setting** — if `liberty.test.report.surefire.path` or `liberty.test.report.failsafe.path` is set, that path is used and no further lookup is performed.
2. **`<outputDirectory>` in `pom.xml`** — if the `maven-surefire-report-plugin` or `maven-failsafe-report-plugin` declares a custom `<outputDirectory>`, Liberty Tools reads that value directly from your `pom.xml`. The plugin may be declared in either the `<reporting>` section (conventional) or the `<build>` section.
3. **Default locations** — if neither of the above is configured, Liberty Tools checks `target/reports/surefire.html` (or `failsafe.html`) and then `target/site/surefire-report.html` (or `failsafe-report.html`).

**Example: plugin in `<reporting>` (conventional, Maven Surefire Report Plugin ≤ 3.4.x)**

```xml
<reporting>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-report-plugin</artifactId>
      <configuration>
        <outputDirectory>target/my-reports</outputDirectory>
      </configuration>
    </plugin>
  </plugins>
</reporting>
```

> **Note:** Liberty Tools skips `<outputDirectory>` values that contain Maven variable expressions such as `${project.build.directory}` because they cannot be resolved statically. In that case, resolution falls through to the default locations. Use the VS Code setting to specify an explicit path when your configuration uses variables.

**Example: plugin in `<build>` (Maven Surefire Report Plugin ≥ 3.5.x)**

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-report-plugin</artifactId>
      <configuration>
        <outputDirectory>target/my-reports</outputDirectory>
      </configuration>
    </plugin>
  </plugins>
</build>
```

The same patterns apply to `maven-failsafe-report-plugin` for integration test reports.

#### Gradle report location resolution

1. **VS Code setting** — if `liberty.test.report.gradle.path` is set, that path is used and no further lookup is performed.
2. **`build.gradle` destination** — Liberty Tools parses your `build.gradle` and reads the custom HTML report directory from the `test` task's `reports.html` block. It checks the following keys in order:
   - `destination` (Gradle ≤ 7) — in flat (`test.reports.html.destination = "..."`), nested, or deep form
   - `outputLocation` (Gradle 8/9) — in flat (`test.reports.html.outputLocation = "..."`), nested, or deep form
3. **Default location** — if neither of the above is configured, Liberty Tools falls back to `build/reports/tests/test/index.html`.

**Example: Gradle ≤ 7 (`destination`)**

```groovy
test {
    reports {
        html.destination = file("build/my-reports/tests")
    }
}
```

**Example: Gradle 8/9 (`outputLocation`)**

```groovy
test {
    reports {
        html.outputLocation = file("build/my-reports/tests")
    }
}
```

> **Note:** Liberty Tools skips `destination` or `outputLocation` values that contain Gradle variable expressions such as `$buildDir` or `${project.buildDir}` because they cannot be resolved statically. In that case, resolution falls through to the default location. Use the VS Code setting to specify an explicit path when your configuration uses variables.

#### VS Code settings override

To override the automatically resolved location entirely, set the following in your Visual Studio Code [settings.json](https://code.visualstudio.com/docs/getstarted/settings#_settingsjson) file:

| Setting | Description |
| --- | --- |
| `liberty.test.report.surefire.path` | Custom path to the Maven Surefire HTML test report. Accepts an absolute path or a path relative to the project root (the directory containing `pom.xml`). When set, this overrides the default locations (`target/reports/surefire.html` and `target/site/surefire-report.html`). Leave empty to use the default locations. |
| `liberty.test.report.failsafe.path` | Custom path to the Maven Failsafe HTML integration-test report. Accepts an absolute path or a path relative to the project root (the directory containing `pom.xml`). When set, this overrides the default locations (`target/reports/failsafe.html` and `target/site/failsafe-report.html`). Leave empty to use the default locations. |
| `liberty.test.report.gradle.path` | Custom path to the Gradle HTML test report (`index.html`). Accepts an absolute path. When set, this overrides both the value parsed from `build.gradle` and the default location (`build/reports/tests/test/index.html`). Leave empty to use the value from `build.gradle` or the default location. |

These settings have `resource` scope, so they can be configured per project in a multi-root workspace.

## Stop your application

To stop your application, select the **Stop** command for your application in Liberty Tools.

![Stop command](/docs/user-guide-screenshots/devModeStop.png)

## Debug your application

### Start in debug mode

To start your application in dev mode and have the debugger attach automatically, select the **Start in debug mode** command for your application in Liberty Tools or run **Liberty: Start in debug mode** from the command palette.

Liberty Tools starts the server with the Java debug agent enabled and waits for the server to reach a ready state before attaching the VS Code Java debugger. If the server does not reach a ready state within the timeout period, a warning message is shown and you can attach the debugger manually using the **Attach debugger** command.

The default timeout is **180 seconds (3 minutes)**. If your server consistently takes longer to start, you can increase the timeout by setting `liberty.dev.debugStartTimeout` (in seconds) in your VS Code settings:

```json
"liberty.dev.debugStartTimeout": 300
```

To configure this setting, open the Settings UI (`Cmd+,` / `Ctrl+,`) and search for **Liberty debug**.

#### Change the debug port

By default, the server listens for the debugger on port **7777**. You can use a different port in any of the following ways:

- **`server.env` (Maven and Gradle):** Add `WLP_DEBUG_ADDRESS=<port>` to `src/main/liberty/config/server.env`. **Start in debug mode** starts the server on that port and attaches the debugger to it.

  ```
  WLP_DEBUG_ADDRESS=8888
  ```

  Liberty Tools reads only `src/main/liberty/config/server.env`. If your project uses a different `configDirectory`, the `server.env` file in that directory is not read, and **Start in debug mode** uses port 7777.

- **Maven build configuration:** Set `libertyDebugPort` in the `liberty-maven-plugin` configuration in your `pom.xml`. The parameter name is `libertyDebugPort`, not `debugPort`. A value set in the `pom.xml` takes precedence over the `-DdebugPort` command-line parameter.

  ```xml
  <plugin>
      <groupId>io.openliberty.tools</groupId>
      <artifactId>liberty-maven-plugin</artifactId>
      <configuration>
          <libertyDebugPort>8888</libertyDebugPort>
      </configuration>
  </plugin>
  ```

- **Custom parameters:** Use the **Start...** command and enter a custom parameter, then attach with the **Attach debugger** command.
  - Maven: `-DdebugPort=<port>`
  - Gradle: `--libertyDebugPort=<port>`

  For Gradle, `libertyDebugPort` is honored only as a command-line parameter. Setting it in `build.gradle` or `gradle.properties` has no effect.

For more information, see the [Liberty Maven plugin dev goal](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#dev) and the [Liberty Gradle plugin `libertyDev` task](https://github.com/OpenLiberty/ci.gradle/blob/main/docs/libertyDev.md) documentation.

### Attach debugger manually

To attach the debugger, you must have a [running server](#run-your-application-on-liberty-using-dev-mode). Once the server is running, click the **Attach debugger** command or select the **Liberty: Attach debugger** command in the command palette, followed by your application.

![Attach Debugger](/docs/user-guide-screenshots/attach_debugger.png)

When the debugger is attached, the Visual Studio Code [debug options](https://code.visualstudio.com/docs/editor/debugging) become available.

![Debug Mode](/docs/user-guide-screenshots/debugger_mode.png)

## Create a Liberty project

You can generate a starter project configured for Liberty directly within Visual Studio Code using the Liberty Starter.

To create a new project:

1. Open the Command Palette and run **Liberty: Create a Liberty project**, or click **Create Project** in the Liberty Tools welcome view if no projects are open.
2. Follow the wizard prompts:
   - **Base Package**: Enter the group ID (e.g., `com.example`).
   - **App Name**: Enter the artifact ID and folder name (e.g., `my-liberty-app`).
   - **Build System**: Select `Maven` or `Gradle`.
   - **Java SE Version**: Select your Java version (e.g., `21`, `17`, `11`, `8`).
   - **Java EE / Jakarta EE Version**: Select the Jakarta EE version or choose `None`.
   - **MicroProfile Version**: Select a compatible MicroProfile version or choose `None`.
   - **Destination**: Select the directory where the project folder should be created.
3. Choose whether to open the generated project in the current window or in a new window.

Once opened, the project is ready for dev mode.

## Manually add your Liberty project to Liberty Tools

If your Liberty project is not automatically detected by Liberty Tools, you can manually add your Liberty project to Liberty Tools in one of four ways:<br>
* Click the plus icon (+) in Liberty Tools.<br>
  ![Add Liberty project from Liberty Tools](/docs/user-guide-screenshots/add_from_liberty_dashboard.png)<br>
* Right-click into an empty space in the Explorer view and select **Add project to Liberty Tools**.<br>
  ![Add Liberty project from Explorer view empty space](/docs/user-guide-screenshots/add_from_empty_space.png)<br>
* If you have a workspace open, you also have the option to right-click on a project root folder in the Explorer view and select **Add project to Liberty Tools**.<br>
  ![Add Liberty project from Explorer view project root](/docs/user-guide-screenshots/add_from_project_root_folder.png)<br>
* Use the Command Palette to select the **Liberty: Add project to Liberty Tools** command.<br>
  ![Add Liberty project from Command Palette](/docs/user-guide-screenshots/add_from_command_palette.png)<br>

In each of these cases, you are prompted in the Command Palette to select a project from a list of projects that are currently not displayed in Liberty Tools.<br>
![Liberty add project selection](/docs/user-guide-screenshots/add_project_selection.png)<br>

### Manually remove project

To remove manually added Liberty projects from Liberty Tools, you have a similar set of four options:
* Click the minus icon (-) in Liberty Tools.
* Right-click into an empty space in the Explorer view and select **Remove project from Liberty Tools**.
* If you have a workspace open, you also have the option to right-click on a project root folder in the Explorer view and select  **Remove project from Liberty Tools**.
* Use the Command Palette to select the  **Liberty: Remove project from Liberty Tools** command.

Similar to adding the project, you are prompted in the Command Palette to select a project from a list of projects in Liberty Tools that can be removed.

## Multi-module projects

Liberty Tools supports Maven and Gradle multi-module projects and displays them in a hierarchy in the Liberty dashboard.

- **Maven**: Detected when a parent `pom.xml` contains a `<modules>` section.
- **Gradle**: Detected when `settings.gradle` contains `include` directives for subprojects.

In the Liberty Tools dashboard:
- Parent or root projects appear as parent nodes containing their child submodules.
- If a parent project configures the Liberty plugin, dev mode commands can be run directly on the parent.
- If individual submodules configure the Liberty plugin, you can run dev mode commands directly on each submodule independently.
- Adding or removing a parent project also adds or removes its child submodules.

![Run start a multi-module project](/docs/user-guide-screenshots/multi-mod-start.png)

## Custom configuration directory (Maven)

By default, Liberty Tools looks for `server.xml` in `src/main/liberty/config`.

If your Maven project keeps its Liberty configuration in a different directory, set `configDirectory` in the `liberty-maven-plugin` configuration. Liberty Tools then also looks for a `server.xml` in that directory when it decides whether a `pom.xml` is a Liberty project. This lets Liberty Tools show projects that configure the Liberty Maven Plugin only in `<pluginManagement>`, or that inherit the plugin configuration from a parent `pom.xml`:

```xml
<plugin>
    <groupId>io.openliberty.tools</groupId>
    <artifactId>liberty-maven-plugin</artifactId>
    <configuration>
        <configDirectory>${project.basedir}/src/main/custom-liberty-config</configDirectory>
    </configuration>
</plugin>
```

Liberty Tools reads `configDirectory` from the following locations in the `pom.xml`, in this order:
1. `<build><plugins>`
2. `<build><pluginManagement><plugins>`
3. `<profiles>`

Notes:
- A relative path is resolved against the directory that contains the module's `pom.xml`. An absolute path is used as is.
- The `${project.basedir}` and `${basedir}` properties are expanded. Other Maven properties are not.
- A module that does not set `configDirectory` inherits the value from its parent `pom.xml` (for example, one declared in the parent's `<pluginManagement>`). The parent must be part of the opened workspace and must be referenced through its `<parent><artifactId>`.
- If no `server.xml` exists in the configured directory, and the Liberty Maven Plugin is not declared in `<build><plugins>` or a profile, the project is not shown in Liberty Tools. You can [manually add it](#manually-add-your-liberty-project-to-liberty-tools).
- Custom configuration directories are supported for Maven projects only. For Gradle projects, use the default `src/main/liberty/config` location.

## Configure a Liberty server

Liberty configuration assistance provides editing assistance, such as [code completion, diagnostics, and quick-fixes](https://github.com/OpenLiberty/liberty-language-server#features), in Liberty `server.xml`, `server.env`, and `bootstrap.properties` files.

1. Start the project in dev mode by using one of the previously described Liberty dashboard or command palette commands. Dev mode installs the Liberty features that are required for your application.
2. Open any of the supported Liberty configuration files.
3. To use Liberty-specific code completion, press <kbd>Ctrl</kbd> + <kbd>Space</kbd> / <kbd>Cmd</kbd> + <kbd>Space</kbd> anywhere within the document. A drop-down list of completion suggestions appears.

![LCLS server.xml completion](/docs/user-guide-screenshots/serverXmlCompletion.png)

Liberty configuration assistance is offered through the Liberty Config Language Server. For more information, see the [project documentation in GitHub](https://github.com/OpenLiberty/liberty-language-server#liberty-config-language-server).

## Develop with Jakarta EE and MicroProfile APIs

Liberty Tools editing assistance provides code completion, diagnostics, and quick-fixes in configuration and application files for Jakarta EE and MicroProfile APIs.

1. Open a Java or microprofile-config.properties file.
2. To use Jakarta EE-specific and MicroProfile-specific code completion, press <kbd>Ctrl</kbd> + <kbd>Space</kbd> / <kbd>Cmd</kbd> + <kbd>Space</kbd> anywhere within the document. A drop-down list of completion suggestions appears.

![Eclipse LSP4Jakarta RESTful completion](/docs/screenshots/lsp4jakarta_completion.png)

![Eclipse LSP4MP microprofile-config.properties completion](/docs/user-guide-screenshots/mp_completion.png)

3. To use Jakarta EE-specific and MicroProfile-specific quick-fixes, hover over a Jakarta EE or MicroProfile diagnostic. A pop-up dialog appears that contains the diagnostic message and a **Quick Fix** link, if a quick-fix is available. Click the **Quick Fix...** link to view a list of quick-fix options.

![Jakarta EE quick fix](/docs/user-guide-screenshots/LSP4Jakarta-quickfix.png)

Jakarta EE API configuration assistance is offered through Eclipse LSP4Jakarta, the Language Server for Jakarta EE. For more information, see the [project documentation in GitHub](https://github.com/eclipse/lsp4jakarta#eclipse-lsp4jakarta).

MicroProfile EE API configuration assistance is offered through Eclipse LSP4MP, the Language Server for MicroProfile. For more information, see the [project documentation in GitHub](https://github.com/eclipse/lsp4mp#eclipse-lsp4mp---language-server-for-microprofile).
