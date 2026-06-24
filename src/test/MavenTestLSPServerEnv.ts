import * as utils from './utils/testUtils';
import { runServerEnvSuite } from './shared/serverEnvSuite';

runServerEnvSuite({
    buildTool: 'maven',
    getProjectPath: utils.getMvnProjectPath,
    hoverTestCases: [
        { element: 'WLP_USER_DIR', line: 1, column: 1, expectedDoc: 'The user or custom configuration directory that is used to store shared and server-specific configuration. See the path_to_liberty/wlp/README.TXT file for details about shared resource locations. A server configuration is at the %WLP_USER_DIR%/servers/serverName location. The default value is the user directory in the installation directory.' },
        { element: 'LOG_DIR', line: 2, column: 1, expectedDoc: 'The directory that contains the log file. The default value is %WLP_OUTPUT_DIR%/serverName/logs' },
    ]
});