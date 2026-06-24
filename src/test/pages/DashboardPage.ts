/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { SideBarView, ViewSection, DefaultTreeItem } from 'vscode-extension-tester';
import * as utils from '../utils/testUtils';

export class DashboardPage {
    private readonly sidebar = new SideBarView(); 

    /** The Liberty Tools dashboard section, re-fetched fresh. */
    async getSection(): Promise<ViewSection> {
        return utils.getDashboardSection(this.sidebar);
    }

    /** The dashboard tree item for a project, re-fetched fresh. */
    async getProjectItem(projectName: string): Promise<DefaultTreeItem> {
        const section = await this.getSection();
        return utils.getDashboardItem(section, projectName);
    }

    /**
     * Run a dashboard action on a project. Re-fetches section + item, then
     * launches the action (handling the mac vs non-mac label internally).
     * Does not wait for or assert any server/terminal state — the caller owns
     * that verification.
     *
     * @param projectName Project name in the dashboard (e.g. constants.MAVEN_PROJECT).
     * @param action      The action label (e.g. constants.START_DASHBOARD_ACTION).
     * @param macAction   The macOS action label (e.g. constants.START_DASHBOARD_MAC_ACTION).
     */
    async runAction(projectName: string, action: string, macAction: string): Promise<void> {
        const item = await this.getProjectItem(projectName);
        await utils.launchDashboardAction(item, action, macAction);
    }


}