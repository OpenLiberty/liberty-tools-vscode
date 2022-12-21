# Liberty Tools for Visual Studio Code User Guide

1. [Before you begin](#before-you-begin)
    - [Application requirements](#application-requirements)
    - [Settings](#settings)

## Before you begin

### Application requirements

- Define a Liberty `server.xml` configuration file at location `src/main/liberty/config`.
- Configure the [Liberty Maven Plugin](https://github.com/OpenLiberty/ci.maven#configuration) or [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle#adding-the-plugin-to-the-build-script). We recommend using newer versions of the plugins as several important bug fixes have been included in recent versions.
  - Recommended minimum versions of:
    - Liberty Maven Plugin -> 3.7.1
    - Liberty Gradle Plugin -> 3.5.1

### Settings

To ensure that the Liberty Config Language Server starts properly, we advise users define the `xml.java.home` property in their VS Code settings.


_TODO_
