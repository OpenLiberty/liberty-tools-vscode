import { BaseLibertyProject } from "./baseLibertyProject";

/**
 * Copyright (c) 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
export class DashboardData {
  public projects: BaseLibertyProject[] = [];

  constructor(data: BaseLibertyProject[]) {
    for ( let i = 0; i < data.length; i++ ) {
      this.projects.push(data[i]);
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
