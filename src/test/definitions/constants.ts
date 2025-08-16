/**
 * Copyright (c) 2020, 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

export const MAVEN_PROJECT = "liberty.maven.test.wrapper.app";
export const GRADLE_PROJECT= "liberty.gradle.test.wrapper.app";
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
export const  MAVEN_DEVMODE_DEBUG_PORT_PARM = "-DdebugPort";
/** Gradle: Dev mode debug port argument key. */
export const GRADLE_DEVMODE_DEBUG_PORT_PARM = "--libertyDebugPort";
export const CLOSE_EDITOR = "View: Close Editor";
export const TARGET = "target";
export const REPORTS = "reports";
export const SITE = "site";
export const FAILSAFE_HTML = "failsafe.html";
export const SUREFIRE_HTML = "surefire.html";
export const SUREFIRE_REPORT_HTML ="surefire-report.html";
export const FAILSAFE_REPORT_HTML ="failsafe-report.html";
export const COMMENT_REGEX = /<!--\s*Test report insertion point, do not remove\s*-->/;
export const PLUGIN_BLOCK_REGEX = /<!--\s*replace this content\s*-->([\s\S]*?)<!--\s*replace this content end\s*-->/;
export const SUREFIRE_3_4_0_PLUGIN_CONTENT = `<!-- replace this content -->
                                                 <plugin>
                                                    <groupId>org.apache.maven.plugins</groupId>
                                                    <artifactId>maven-surefire-report-plugin</artifactId>
                                                    <version>3.4.0</version>
                                                 </plugin>
                                              <!-- replace this content end -->`;
export const POM_COMMENT = '<!-- Test report insertion point, do not remove -->';
export const MAVEN_TEST_WRAPPER_APP_POM_PATH = 'src/test/resources/maven/liberty.maven.test.wrapper.app/pom.xml'; 
