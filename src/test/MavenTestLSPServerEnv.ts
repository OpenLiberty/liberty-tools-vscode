/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import * as utils from './utils/testUtils';
import { runConfigFileTestSuite } from './shared/configFileTestSuite';

runConfigFileTestSuite({
    suiteTitle: 'Server Env',
    getProjectPath: utils.getMvnProjectPath,
    filePathSegments: ['src', 'main', 'liberty', 'config', 'server.env'],
    tabTitle: 'server.env',
    hoverInitialContent: 'WLP_USER_DIR=./custom-user-dir\nLOG_DIR=./logs\n',
    hoverCases: [
        {
            element: 'WLP_USER_DIR',
            line: 1,
            column: 1,
            expectedDoc: 'The user or custom configuration directory that is used to store shared and server-specific configuration. See the path_to_liberty/wlp/README.TXT file for details about shared resource locations. A server configuration is at the %WLP_USER_DIR%/servers/serverName location. The default value is the user directory in the installation directory.',
        },
        {
            element: 'LOG_DIR',
            line: 2,
            column: 1,
            expectedDoc: 'The directory that contains the log file. The default value is %WLP_OUTPUT_DIR%/serverName/logs',
        },
    ],
    completion: {
        trigger: 'WLP_LOG',
        fullItem: 'WLP_LOGGING_MESSAGE_FORMAT',
        value: 'JSON',
    },
    diagnostic: {
        lineToken: 'WLP_LOGGING_MESSAGE_FORMAT',
        validValue: 'JSON',
        diagnosticMessage: 'The value `INVALID` is not valid for the variable `WLP_LOGGING_MESSAGE_FORMAT`.',
        quickFixLabel: 'Replace value with JSON',
    },
});
