/**
 * Copyright (c) 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';

describe('Open Maven Project - path with space', () => {

    let driver: WebDriver;
    before(() => {
        /**
         * Create new gradle project name with space in the new directory
         */
        utils.getProjectWithSpaceInDir(utils.getMvnProjectPath(), utils.getMvnProjectDirWithSpace());
        driver = VSBrowser.instance.driver;

    });

    it('Open Sample Maven Project - path with space', async () => {
        await utils.delay(8000);
        await VSBrowser.instance.openResources(utils.getMvnProjectDirWithSpace());
    }).timeout(15000);

});