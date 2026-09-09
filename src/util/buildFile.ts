/*
 * IBM Confidential
 * Copyright IBM Corp. 2020, 2026
 */
interface BuildFile {
    buildFilePath: string;
    projectType: string;
    validBuildFile: boolean;
    children?: string[];
}

/**
 * Defines a general BuilFile object
 */
export class BuildFileImpl implements BuildFile{
    buildFilePath: string;
    projectType: string;
    validBuildFile: boolean;

    constructor (validBuildFile: boolean, projectType: string){
        this.validBuildFile = validBuildFile;
        this.projectType = projectType;
        this.buildFilePath = "";
    }

    public getBuildFilePath(): string {
        return this.buildFilePath;
    }

    public setBuildFilePath(buildFilePath: string): void {
        this.buildFilePath = buildFilePath;
    }

    public getProjectType(): string {
        return this.projectType;
    }

    public setProjectType(projectType: string): void {
        this.projectType = projectType;
    }

    public isValidBuildFile(): boolean{
        return this.validBuildFile;
    }
    
    /**
     * Check if this build file has the Liberty plugin
     * @returns true if projectType is not empty (indicating Liberty plugin is present)
     */
    public hasLibertyPlugin(): boolean {
        return this.projectType !== "";
    }
}

/**
 * Defines a Gradle Build File object
 */
export class GradleBuildFile extends BuildFileImpl implements BuildFile {
    children: string[]; // list to track children associated with parent

    constructor(validBuildFile: boolean, projectType: string) {
        super(validBuildFile, projectType);
        this.children = [];
    }

    public getChildren(): string[] {
        return this.children;
    }

    public setChildren(children: string[]): void {
        this.children = children;
    }
    
    /**
     * Check if this is an aggregator project (has child modules)
     * @returns true if this project has children
     */
    public isAggregator(): boolean {
        return this.children.length > 0;
    }
}