/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import * as utils from './utils/testUtils';
import { runRestSnippetSuite } from './shared/restSnippetSuite';

runRestSnippetSuite({ buildTool: 'maven', getProjectPath: utils.getMvnProjectPath });
