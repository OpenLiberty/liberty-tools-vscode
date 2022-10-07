/**
 * Copyright (c) 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
export class BaseLibertyProject {
	public label: string;
	public path: string;
	public contextValue: string;
	constructor(label: string, path: string, contextValue: string) {
		this.label = label;
		this.contextValue = contextValue;
		this.path = path;
	}	
}