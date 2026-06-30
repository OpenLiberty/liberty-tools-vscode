/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import * as utils from './utils/testUtils';
import { runConfigFileTestSuite } from './shared/configFileTestSuite';

runConfigFileTestSuite({
    suiteTitle: 'Bootstrap Properties',
    getProjectPath: utils.getMvnProjectPath,
    filePathSegments: ['src', 'main', 'liberty', 'config', 'bootstrap.properties'],
    tabTitle: 'bootstrap.properties',
    hoverInitialContent: 'com.ibm.ws.logging.log.directory=./logs\ncom.ibm.ws.logging.message.format=SIMPLE\n',
    hoverCases: [
        {
            element: 'com.ibm.ws.logging.log.directory',
            line: 1,
            column: 1,
            expectedDoc: 'The directory that contains the log file.',
        },
        {
            element: 'com.ibm.ws.logging.message.format',
            line: 2,
            column: 1,
            expectedDoc: 'This setting specifies the required format for the messages.log file. Valid values are simple or json format. By default, messageFormat is set to simple.',
        },
    ],
    completion: {
        trigger: 'com.ibm.ws.logging.con',
        fullItem: 'com.ibm.ws.logging.console.log.level',
        value: 'INFO',
    },
    diagnostic: {
        lineToken: 'com.ibm.ws.logging.console.log.level',
        validValue: 'INFO',
        diagnosticMessage: 'The value `INVALID` is not valid for the property `com.ibm.ws.logging.console.log.level`.',
        quickFixLabel: 'Replace value with INFO',
    },
});
