# Change Log

All notable changes to the Open Liberty Tools extension will be documented below.

## 0.1.10
- Honour Maven and Gradle wrapper settings when running dev mode

## 0.1.9
- Removed "tech preview" wording from "Start in container" action

## 0.1.8
- Added dependency on [Tools for MicroProfile](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-microprofile)

## 0.1.7
- Added Start in container (tech preview) action
- Upgrade lodash dependency version

## 0.1.6

- Detect custom test report locations
- Add refresh button to Liberty Dev Dashboard
- Persist custom parameters between runs of dev mode
- Upgrade minimist and acorn dependency versions

## 0.1.5

- Support for the [Liberty Gradle Plugin](https://github.com/OpenLiberty/ci.gradle)
- Bug fixes for Liberty Project Provider
- Updated Manifest

## 0.1.4

- Improved message when test reports do not exist
- Added OpenLiberty category to Liberty Dev commands

## 0.1.3

- Change name to Open Liberty Tools

## 0.1.2

- Enhancement to honour `java.home` setting with `liberty.terminal.useJavaHome`

## 0.1.1

- Bug fix to recognize plugins defined in profile section of `pom.xml`

## 0.1.0

- View supported liberty-maven-plugin projects in the workspace (must be of version `3.0.M1` or higher)
- Start/Stop dev mode
- Start dev mode with custom parameters
- Run tests
- View unit and integration test reports
