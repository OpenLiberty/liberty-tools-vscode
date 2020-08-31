interface IBuildFile {
    buildFilePath: string;
    projectType: string;
    validBuildFile: boolean;
    children?: string[]
}

/**
 * Defines a general BuilFile object
 */
export class BuildFile implements IBuildFile{
    buildFilePath: string;
    projectType: string;
    validBuildFile: boolean;

    constructor (validBuildFile: boolean, projectType: string){
        this.validBuildFile = validBuildFile;
        this.projectType = projectType;
        this.buildFilePath = "";
    }

    public getBuildFilePath() {
        return this.buildFilePath;
    }

    public setBuildFilePath(buildFilePath: string) {
        this.buildFilePath = buildFilePath;
    }

    public getProjectType() {
        return this.projectType;
    }

    public setProjectType(projectType: string) {
        this.projectType = projectType;
    }

    public isValidBuildFile() {
        return this.validBuildFile;
    }
}

/**
 * Defines a Gradle Build File object
 */
export class GradleBuildFile extends BuildFile implements IBuildFile {
    children: string[]; // list to track children associated with parent

    constructor(validBuildFile: boolean, projectType: string) {
        super(validBuildFile, projectType);
        this.children = [];
    }

    public getChildren() {
        return this.children;
    }

    public setChildren(children: string[]) {
        this.children = children;
    }
}