import * as utils from './utils/testUtils';
import { runServerEnvSuite } from './shared/serverEnvSuite';

runServerEnvSuite({
    buildTool: 'maven',
    getProjectPath: utils.getMvnProjectPath,
});