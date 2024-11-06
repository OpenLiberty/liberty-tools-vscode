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

describe('Open Gradle Project - Project name with space', () => {

    let driver: WebDriver;

    before(() => {

        /**
         * Create new gradle project name with space in the directory
         */

        utils.getRenamedProject();
        driver = VSBrowser.instance.driver;

    });

    it('Open Sample Gradle Project - Project name with space', async () => {

        await utils.delay(8000);
        await VSBrowser.instance.openResources(utils.getGradleProjectPathWithSpace());

    }).timeout(25000);

});


