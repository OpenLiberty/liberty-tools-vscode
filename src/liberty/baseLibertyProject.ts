/*
 * IBM Confidential
 * Copyright IBM Corp. 2022
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