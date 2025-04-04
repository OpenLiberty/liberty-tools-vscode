
/**
 * Copyright (c) 2020, 2025 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

export const MAVEN_PROJECT = "liberty.maven.test.wrapper.app";
export const GRADLE_PROJECT = "liberty.gradle.test.wrapper.app";
export const START_DASHBOARD_ACTION = "Start";
export const STOP_DASHBOARD_ACTION = "Stop";
export const START_DASHBOARD_MAC_ACTION = "Liberty: Start";
//export const START_DASHBOARD_ACTION_BASE="liberty.dev.start";
export const STOP_DASHBOARD_MAC_ACTION = "Liberty: Stop";
export const START_DASHBOARD_MAC_ACTION_WITH_PARAM = "Liberty: Start...";
export const START_DASHBOARD_ACTION_WITH_PARAM = "Start...";
export const START_DASHBOARD_ACTION_WITHDOCKER = "Start in container";
export const START_DASHBOARD_MAC_ACTION_WITHDOCKER = "Liberty: Start in container";
export const SERVER_START_STRING = "The defaultServer server is ready to run a smarter planet";
export const SERVER_STOP_STRING = "defaultServer stopped";
export const MAVEN_RUN_TESTS_STRING = "Integration tests finished";
export const GRADLE_TEST_RUN_STRING = "Tests finished";
export const RUNTEST_DASHBOARD_ACTION = "Run tests";
export const RUNTEST_DASHBOARD_MAC_ACTION = "Liberty: Run tests";
export const UTR_DASHABOARD_ACTION = "View unit test report";
export const UTR_DASHABOARD_MAC_ACTION = "Liberty: View unit test report";
export const ITR_DASHBOARD_ACTION = "View integration test report";
export const GRADLE_TR_DASHABOARD_ACTION = "View test report";
export const GRADLE_TR_DASHABOARD_MAC_ACTION = "Liberty: View test report";
export const ITR_DASHBOARD_MAC_ACTION = "Liberty: View integration test report";
export const SUREFIRE_REPORT_TITLE = "liberty.maven.test.wrapper.app surefire report";
export const FAILSAFE_REPORT_TITLE = "liberty.maven.test.wrapper.app failsafe report";
export const GRADLE_TEST_REPORT_TITLE = "liberty.gradle.test.wrapper.app test report";
export const ATTACH_DEBUGGER_DASHBOARD_ACTION = "Attach debugger";
export const ATTACH_DEBUGGER_DASHBOARD_MAC_ACTION = "Liberty: Attach debugger";
/** Maven: Dev mode debug port argument key. */
export const MAVEN_DEVMODE_DEBUG_PORT_PARM = "-DdebugPort";
/** Gradle: Dev mode debug port argument key. */
export const GRADLE_DEVMODE_DEBUG_PORT_PARM = "--libertyDebugPort";
export const CONFIG = "config";
export const CONFIG_TWO = "config2";
export const BOOTSTRAP_PROPERTIES = "bootstrap.properties";
export const SERVER_XML = "server.xml";
export const SERVER_ENV = "server.env";
export const CLOSE_EDITOR = "View: Close Editor";
export const CONFIRM_MESSAGES = {
  [SERVER_XML]: 'Do you want to save the changes you made to server.xml?',
  [SERVER_ENV]: 'Do you want to save the changes you made to server.env?',
  [BOOTSTRAP_PROPERTIES]: 'Do you want to save the changes you made to bootstrap.properties?'
};
export const EXPECTED_OUTCOME_WRONG = "'wrong' is not a valid value of union type 'booleanType'.";
export const TARGETED_VALUE_LOGGING = '<logging appsWriteJson = \"wrong\" />';
export const FOCUS_WRONG = "//*[contains(text(), 'wrong')]";
export const SNIPPET_LOGGING = "<logging appsWriteJson = \"true\" />";
export const FOCUS_QUICKFIX = "//*[contains(text(), 'Quick Fix')]";
export const LOGGING_TRUE = "//*[contains(text(), \"Replace with 'true'\")]";
export const FOCUS_HTTPENDPOINT = "//*[contains(text(), 'httpEndpoint')]";
export const FOCUS_MPHEALTH = "//*[contains(text(), 'mpHealth')]";
export const FEATURE_MPHEALTH = '<feature>mpHealth-4.0</feature>';
export const NEWLINE = '\n';
export const DESCRIPTION_MPHEALTH = "Description: This feature provides support for the MicroProfile Health specification.";
export const DESCRIPTION_HTTPENDPOINT = `Configuration properties for an HTTP endpoint.`;
export const FEATURE_EL = "<feature>el-3.0</feature>";
export const LOGGING_TAG = "<logging></logging>";
export const LOGGING = 'logging';
export const FEATURE_TAG = 'feature';
export const EL_VALUE = 'el-3.0';
export const PLATFORM_JAKARTA_VALUE = "<platform>jakartaee-11.0</platform>";
export const DESCRIPTION_PLATFORM = `Description: This platform resolves the Liberty features that support the Jakarta EE 11.0 platform.`;
export const FOCUS_JAKARTA = "//*[contains(text(), '\jakarta\')]";
export const PLATFORM_JAKARTA = "<platform>jakarta</platform>";
export const PLATFORM_JAKARTA_ERROR = `ERROR: The platform "jakarta" does not exist.`;
export const FOCUS_JAKARTA_ELEVEN = "//*[contains(text(), \"Replace platform with jakartaee-11.0\")]";
export const FEATURE_SERVLET = "<feature>servlet</feature>";
export const SERVLET_ERROR = `ERROR: The "servlet" versionless feature cannot be resolved since there are more than one common platform. Specify a platform or a feature with a version to enable resolution`;
export const FOCUS_SERVLET = "//*[contains(text(), '\servlet\')]";
export const SERVLET_VALUE = "<feature>servlet-3.1</feature>";
export const FOCUS_SERVLET_VALUE = "//*[contains(text(), \"Replace feature with servlet-3.1\")]";
export const PLATFORM = "platform";
export const JAKARTA_ELEVEN = 'jakartaee-11.0';
export const PLATFORM_JAKARTA_NINE = "<platform>jakartaee-9.1</platform>";
export const WLP_LOGGING_CONSOLE_FORMAT = 'WLP_LOGGING_CONSOLE_FORMAT';
export const CONSOLE_FORMAT_TBASIC = 'WLP_LOGGING_CONSOLE_FORMAT=TBASIC';
export const TBASIC = 'TBASIC';
export const TBA = "=TBA";
export const WLP_LOGGING_CON = 'WLP_LOGGING_CON';
export const LOG_LEVEL_INFO_MSG = 'This setting controls the granularity of messages that go to the console. The valid values are INFO, AUDIT, WARNING, ERROR, and OFF. The default is AUDIT. If using with the Eclipse developer tools this must be set to the default.';
export const FOCUS_LOGLEVEL = "//*[contains(text(), 'CONSOLE_LOGLEVEL')]";
export const LOGLEVEL_WITH_VALUE = 'WLP_LOGGING_CONSOLE_LOGLEVEL=OFF';
export const CONSOLE_FORMAT_DIAGNOSTIC = 'The value `sample_value_is_updating_as_nodata` is not valid for the variable `WLP_LOGGING_CONSOLE_FORMAT`.';
export const FOCUS_NODATA = "//*[contains(text(), 'nodata')]";
export const VALUE_NODATA = '=sample_value_is_updating_as_nodata';
export const WS_LOGGING_CON = "com.ibm.ws.logging.con";
export const VALUE_WRONG = "=wrong";
export const WS_LOGGING_CONSOLE_FORMAT = "com.ibm.ws.logging.console.format";
export const WS_LOGGING_CONSOLE_DIAGNOSTIC = "The value `wrong` is not valid for the property `com.ibm.ws.logging.console.format`.";
export const WS_LOGGING_CONSOLE_VALUE = "com.ibm.ws.logging.console.log.level=OFF";
export const FOCUS_WS_LOGLEVEL = "//*[contains(text(), 'ws.logging.console.log.level')]";
export const WS_LOGLEVEL_TBASIC = 'com.ibm.ws.logging.trace.format=TBASIC';
export const WS_LOG_TRACE_FORMAT = 'com.ibm.ws.logging.trace.format';
export const WS_LOGGING_T = "com.ibm.ws.logging.t";