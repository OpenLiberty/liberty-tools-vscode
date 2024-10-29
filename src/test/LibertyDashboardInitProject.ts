/**
 * Copyright (c) 2023 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */import { WebDriver, VSBrowser } from 'vscode-extension-tester';
import * as utils from './utils/testUtils';

describe('Open Maven Server xml Project', () => {

    let driver: WebDriver;

    before(() => {
        driver = VSBrowser.instance.driver;
    });

    it('Open Sample Maven Project with no LMP or LGP defined in build file', async () => {
        await VSBrowser.instance.openResources(utils.getMvnServerXmlProjectPath());
    }).timeout(15000);

});


