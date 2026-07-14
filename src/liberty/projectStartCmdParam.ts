/*
 * IBM Confidential
 * Copyright IBM Corp. 2022
 */
export class ProjectStartCmdParam {
	public param: string;
	public path: string;
	constructor(path: string, param: string) {
		this.param = param;
		this.path = path;
	}	
}