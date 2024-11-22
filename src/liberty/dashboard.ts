/**
 * Copyright (c) 2024 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { BaseLibertyProject } from "./baseLibertyProject";
import { ProjectStartCmdParam } from "./projectStartCmdParam";

export class DashboardData {
  public projects: BaseLibertyProject[] = [];
  public lastUsedStartParams: ProjectStartCmdParam[] = [];

  constructor(projects: BaseLibertyProject[], startCommandParams: ProjectStartCmdParam[]) {
    if ( projects !== undefined ) {
      for ( let i = 0; i < projects.length; i++ ) {
        this.projects.push(projects[i]);
      }
    }
    if ( startCommandParams !== undefined ) {
      for ( let i = 0; i < startCommandParams.length; i++ ) {
        this.lastUsedStartParams.push(startCommandParams[i]);
      }
    }
  }

  // add last used custom parameters to the top of the list
  public addStartCmdParams(cmdParam: ProjectStartCmdParam): void {
    const index = this.lastUsedStartParams.findIndex(
      element => element.path === cmdParam.path && element.param === cmdParam.param);
    if ( index > 0 ) {
      const element = this.lastUsedStartParams.splice(index,1)[0];
      this.lastUsedStartParams.unshift(element);
    } else if ( index < 0 ) {
      this.lastUsedStartParams.unshift(cmdParam);
    }
  }

  public removeProject(path: string): void {
    this.projects = this.projects.filter(function (baseLibertyProject) {
      return baseLibertyProject.path !== path;
    });
  }

  public isPathExists(path: string): boolean {
    if (
      this.projects.some((customProject) => customProject.path === path)
    ) {
      return true;
    }
    return false;
  }

  public addProjectToManualProjects(project: BaseLibertyProject): boolean {
    if (this.isPathExists(project.path) === false) {
      this.projects.push(project);
      return true;
    }
    return false;
  }
}
