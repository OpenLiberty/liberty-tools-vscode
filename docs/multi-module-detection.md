# Multi-Module Detection & Project Tree Hierarchy

> **Audience:** Open-source contributors and maintainers of `liberty-tools-vscode`.  
> **Purpose:** Explain how the extension finds Liberty projects, classifies them, and builds the tree shown in the Liberty Dashboard.

---

## Overview

The extension scans every workspace folder for Maven (`pom.xml`) and Gradle (`build.gradle`) build files, checks each for the Liberty plugin, then wires parent-child relationships to produce a tree. Only projects that are Liberty-enabled (or that *contain* a Liberty-enabled descendant) appear in the dashboard.

```
Workspace
└── discoverWorkspace()                   ← entry point (projectDiscovery.ts)
      ├── Phase 1 · Read + Parse          ← parallel file I/O
      ├── Phase 2 · Classify parents      ← find aggregators + child paths
      ├── Phase 3 · Create LibertyProject ← shell objects into projectsMap
      ├── stampProjects()                 ← attach metadata (artifactId, flags)
      └── linkProjects()                  ← wire parent ↔ children, compute roots
```

---

## Key Classes

| Class / Interface | File | Role |
|---|---|---|
| `LibertyProject` | `src/liberty/libertyProject.ts` | VSCode `TreeItem`; holds state, terminal, parent/children refs |
| `BaseLibertyProject` | `src/liberty/baseLibertyProject.ts` | Thin persistence DTO (label, path, contextValue) |
| `BuildFileImpl` | `src/util/buildFile.ts` | Wraps validity + `contextValue` string for Maven |
| `GradleBuildFile` | `src/util/buildFile.ts` | Extends `BuildFileImpl`; adds `children[]` (subproject names) |
| `ProjectRegistry` | `src/liberty/projectRegistry.ts` | Singleton; owns `Map<path, LibertyProject>` + rootProjects list |
| `ProjectTreeProvider` | `src/liberty/projectTreeProvider.ts` | VSCode `TreeDataProvider`; calls `discoverWorkspace`, feeds `ProjectRegistry` |

---

## contextValue Scheme

Every `LibertyProject` carries a `contextValue` string that drives which toolbar/context-menu commands are enabled in `package.json`.

```
libertyProject:{tool}[:{variant}]
```

| contextValue | Meaning |
|---|---|
| `libertyProject:maven` | Maven leaf project |
| `libertyProject:gradle` | Gradle leaf project |
| `libertyProject:maven:container` | Maven, Liberty plugin ≥ 3.3.0 (supports dev in container) |
| `libertyProject:gradle:container` | Gradle, Liberty plugin ≥ 3.1.0 |
| `libertyProject:maven:aggregator` | Maven parent POM (has `<modules>`) |
| `libertyProject:gradle:aggregator` | Gradle root project (has `include` in `settings.gradle`) |

Helper predicates in `src/definitions/constants.ts`:

```ts
isMaven(cv)      // /^libertyProject:maven/
isGradle(cv)     // /^libertyProject:gradle/
isContainer(cv)  // /^libertyProject.*:container/
isAggregator(cv) // /^libertyProject.*:aggregator/
```

---

## Discovery Pipeline (Step-by-Step)

### Phase 1 — Parallel Read + Parse

`discoverProjects()` in `projectDiscovery.ts` reads every build file **once** into a `ParsedBuildEntry[]`:

- **Maven** – raw XML string stored; parsed later by `xml2js`.
- **Gradle** – fast regex check (`LIBERTY_PLUGIN_ID_REGEX`) runs first.  
  - If modern `plugins { id '...' }` syntax detected → `regexBuildFile` is set; **g2js skipped**.  
  - If legacy `buildscript { dependencies {} }` syntax detected → `g2js.parseFile()` runs.  
  - `settings.gradle` parsed in parallel when `include` blocks are found (needed for multi-module detection).

### Phase 2 — Classify Parents

Determines which build files are **aggregators** and records which paths are **child** build files.

**Maven:**
1. `mavenUtil.validParentPom(xmlString)` — checks `<build><plugins>` for `liberty-maven-plugin`.
2. `mavenUtil.findChildMavenModules(xmlString)` — reads `<modules>` → builds `Map<parentArtifactId, string[]>`.
3. Resolves each module name to an absolute `pom.xml` path → populates `mavenChildPomPaths`.

**Gradle:**
1. `gradleUtil.findChildGradleProjects(parsedBuild, parsedSettings, path)` — reads `include` from `settings.gradle`.
2. Converts Gradle project notation (`:module`) to filesystem paths → populates `gradleChildBuildPaths`.

### Phase 3 — Create Shell LibertyProject Objects

Runs in parallel across all entries. Classification determines which validator to call:

| Condition | Maven validator | Gradle validator |
|---|---|---|
| Is parent/aggregator | `validParentPom()` | `findChildGradleProjects()` |
| Is known child | `BuildFileImpl(true, maven)` (always valid) | `validateGradleChildModule()` |
| Standalone | `validPom(xml, childrenMap)` | `validGradleBuild()` / regex |

Projects that fail validation are **skipped** (not added to `projectsMap`).

If the project already exists in `existingProjects` (previous refresh), the existing object is reused to preserve terminal state; only label and `contextValue` are updated if changed.

### stampProjects()

Iterates `projectsMap` and extracts metadata from each `ParsedBuildEntry`:

- **Maven** → `mavenUtil.extractMavenMetadata()`:
  - `artifactId`, `parentArtifactId`, `modules[]`
  - `isAggregator` (has `<modules>` or `<packaging>pom</packaging>`)
  - `isLibertyEnabled` (Liberty plugin present in `<build>` or a `<profile>`)

- **Gradle** → `gradleUtil.extractGradleMetadata()`:
  - `projectName` (from `rootProject.name` in `settings.gradle`, else directory name)
  - `parentProjectName` (derived by scanning parent directory's `settings.gradle`)
  - `subprojects[]` (from `include` list)
  - `isAggregator`, `isLibertyEnabled`

Stamps are written directly onto the `LibertyProject` object:

```ts
project.artifactId       = metadata.artifactId;
project.parentArtifactId = metadata.parentArtifactId;
project.isAggregator     = metadata.isAggregator;
project.isLibertyEnabled = metadata.isLibertyEnabled;
```

### linkProjects()

Builds lookup maps and wires relationships:

```
mavenProjectsByArtifactId : Map<artifactId, LibertyProject>
gradleProjectsByName      : Map<projectName, LibertyProject>
```

**Parent-child wiring (pass 1 — by artifactId/name):**
For each project with a `parentArtifactId`, look up the parent in the correct map, then:
```
child.parent = parent
parent.children.push(child)
```
If child has no Liberty plugin but parent does → `child.isLibertyEnabled = true` (inheritance).

**Parent-child wiring (pass 2 — by filesystem path, Maven only):**
For each Maven aggregator, resolves `<module>` names to absolute pom paths. Catches cases where `artifactId`-based wiring missed a child (e.g., artifactId ≠ directory name).

**Aggregator contextValue stamp:**
```ts
if (project.isAggregator) {
  project.setContextValue(isMaven(...) ? LIBERTY_PROJECT_MAVEN_AGGREGATOR
                                       : LIBERTY_PROJECT_GRADLE_AGGREGATOR);
}
```

**Root computation:**
```ts
rootProjects = projectsMap.values()
  .filter(p => !p.parent)                        // no parent = potential root
  .filter(p => p.isLibertyEnabled
            || hasLibertyDescendants(p));         // at least one Liberty node in subtree
```

---

## Tree Hierarchy — Visual Examples

### Maven Multi-Module

```
my-app-parent  [libertyProject:maven:aggregator]
├── server     [libertyProject:maven:container]   ← has liberty-maven-plugin ≥ 3.3.0
└── common     [libertyProject:maven]             ← inherits plugin from parent
```

**How detected:**
- `my-app-parent/pom.xml` has `<modules><module>server</module><module>common</module></modules>` → aggregator.
- `server/pom.xml` has `liberty-maven-plugin` version ≥ 3.3.0 → container.
- `common/pom.xml` has no plugin but its `<parent><artifactId>` matches → linked; inherits `isLibertyEnabled`.

### Gradle Multi-Module

```
my-gradle-root  [libertyProject:gradle:aggregator]
├── app         [libertyProject:gradle:container]
└── lib         [libertyProject:gradle]
```

**How detected:**
- `my-gradle-root/settings.gradle` has `include 'app', 'lib'` → aggregator.
- `app/build.gradle` has `id 'io.openliberty.tools.gradle.Liberty' version '3.8'` (≥ 3.1.0) → container.
- `lib/build.gradle` has same plugin at lower version → leaf.

### Single Project (No Multi-Module)

```
my-service  [libertyProject:maven]
```

No parent, no children. Root project directly.

### Aggregator with Non-Liberty Child

```
platform  [libertyProject:maven:aggregator]
├── api       (no Liberty plugin — hidden from dashboard)
└── runtime   [libertyProject:maven]
```

`api` is linked in the internal tree but filtered out by:
```ts
// ProjectTreeProvider.getChildren()
element.children.filter(child =>
  child.isLibertyEnabled || this.hasLibertyDescendants(child)
)
```

---

## Fallback: server.xml Discovery

If a workspace folder has no `pom.xml` or `build.gradle` at the root but contains a `server.xml` at `src/main/liberty/config/server.xml`, the extension walks up 4 directories and checks for a build file there. This catches projects where the Liberty config is deeply nested.

---

## Progressive Refresh

`discoverWorkspace()` processes workspace folders in parallel. After each folder completes, an `onFolderComplete` callback fires:

```ts
onFolderComplete(partial, foldersComplete, totalFolders)
```

`ProjectTreeProvider` uses this to update the tree incrementally — the dashboard populates folder-by-folder instead of waiting for the full workspace scan.

---

## Module Map

```
src/
├── extension.ts                  ← activates extension, creates Registry + TreeProvider
├── definitions/
│   └── constants.ts              ← contextValue strings + helper predicates
├── liberty/
│   ├── baseLibertyProject.ts     ← persistence DTO
│   ├── libertyProject.ts         ← TreeItem model (parent/children/state)
│   ├── projectDiscovery.ts       ← discoverWorkspace() + 3-phase pipeline
│   ├── projectRegistry.ts        ← singleton registry (source of truth)
│   ├── projectTreeProvider.ts    ← TreeDataProvider + refresh + pickProject()
│   ├── dashboard.ts              ← workspace storage schema (DashboardData)
│   └── devCommands.ts            ← Liberty dev commands (start/stop/test)
└── util/
    ├── buildFile.ts              ← BuildFileImpl / GradleBuildFile
    ├── mavenUtil.ts              ← pom.xml parsing, metadata extraction
    ├── gradleUtil.ts             ← build.gradle parsing, settings.gradle, metadata
    └── helperUtil.ts             ← filterProjects(), storage helpers
```

---

## Data Flow Summary

```
vscode.workspace.findFiles()
        │  pom.xml / build.gradle paths
        ▼
discoverProjects()          ← Phase 1: parse all files in parallel
        │  ParsedBuildEntry[]
        ▼
[Phase 2: classify]         ← find aggregators, resolve child paths
        │
        ▼
[Phase 3: create objects]   ← validate + instantiate LibertyProject shells
        │  Map<path, LibertyProject>
        ▼
stampProjects()             ← attach artifactId, isAggregator, isLibertyEnabled
        │  MavenMetadataMap + GradleMetadataMap
        ▼
linkProjects()              ← wire parent ↔ child, compute rootProjects[]
        │
        ▼
ProjectRegistry             ← setProjects() + setRootProjects()
        │
        ▼
ProjectTreeProvider         ← getChildren() renders dashboard tree
```
