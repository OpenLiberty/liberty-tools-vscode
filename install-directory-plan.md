# Plan: Honor `installDirectory` / `installDir` from LMP and LGP

## Overview

The Liberty Maven Plugin (LMP) and Liberty Gradle Plugin (LGP) both support a property that redirects the Liberty server installation to a directory outside the project's standard build output folder:

- **LMP** — `<configuration><installDirectory>…</installDirectory></configuration>` inside the `liberty-maven-plugin` plugin entry in `pom.xml`
- **LGP** — `installDir = '…'` inside the `liberty { }` extension block in `build.gradle`

When this property is set, the Liberty server's runtime files — including `usr/servers/<serverName>/server.env` — live under the external install path rather than under `target/liberty/` (Maven) or `build/wlp/` (Gradle). The extension currently hard-codes its searches to the standard build output folder, so any command that needs to locate server-side files fails silently when an external install directory is configured.

**Goal:** Parse `installDirectory` / `installDir` from each project's build file AND capture the value when it is passed as a CLI property at Start… time. Store it on `LibertyProject` and use it to guide the `Attach Debugger` command's `server.env` search.

**Scope:**

- The confirmed affected command is **Attach Debugger** (`attachDebugger` in `devCommands.ts`).
- Report-opening commands (`openReport`, `getGradleTestReport`) search only build-artefact directories and are **not** affected by install directory — they are out of scope.
- Only absolute or project-relative *static string* values will be honoured for build-file parsing; dynamic expressions (Gradle variables, Maven property references) are explicitly out of scope for the build-file path.
- CLI property (`-DinstallDirectory=…` for Maven, `-PinstallDirectory=…` or `ext.installDir=…` for Gradle) values passed at **Start…** time must also be captured and stored on the live `LibertyProject` instance so they override the build-file value for the duration of that running server session.

---

## Sub-Tasks

---

### Sub-Task 1 — Extract `installDirectory` during Maven metadata parsing

**Status:** `[x] done`

**Intent:**
Read the `<installDirectory>` value from the liberty-maven-plugin's `<configuration>` block in `pom.xml` and include it in the parsed Maven metadata. This is a pure parsing concern with no side effects on discovery logic.

**Expected Outcomes:**
- `MavenProjectMetadata` gains an optional `installDirectory?: string` field.
- `parsePomXml` populates it when a literal string value is present in `plugin[k].configuration[0].installDirectory[0]` (xml2js tree path).
- `extractMavenMetadata` inherits the field with no changes needed — it delegates to `parsePomXml`.
- The property is also extracted when the plugin appears inside a `<profiles>` block (same traversal used by `checkForLibertyMavenPlugin`).

**Relevant Context:**
- `src/util/mavenUtil.ts` — `MavenProjectMetadata` interface, `parsePomXml`, `mavenPluginDetected`, `checkForLibertyMavenPlugin`
- xml2js parse tree shape: `result.project.build[0].plugins[0].plugin[k].configuration[0].installDirectory[0]`

---

### Sub-Task 2 — Extract `installDir` during Gradle metadata parsing

**Status:** `[x] done`

**Intent:**
Detect the `installDir` value from the `liberty { }` extension block in `build.gradle` using a regex applied to the raw file content, consistent with how the extension already detects plugin ID and version. Include it in the parsed Gradle metadata.

**Expected Outcomes:**
- `GradleProjectMetadata` gains an optional `installDirectory?: string` field.
- A new regex captures a static string assigned to `installDir` (or `installDirectory`) inside a `liberty { }` block.
- `extractGradleMetadata` reads the raw file text and applies the regex; the captured value is stored in `metadata.installDirectory`.
- Non-string / variable-referenced values (e.g. `installDir = someVar`) are silently ignored — the field remains `undefined`.

**Relevant Context:**
- `src/util/gradleUtil.ts` — `GradleProjectMetadata` interface, `extractGradleMetadata`, existing `LIBERTY_PLUGIN_VERSION_REGEX` pattern
- LGP docs: property name is `installDir` (not `installDirectory`). The regex should accept both for resilience.

---

### Sub-Task 3 — Store `installDirectory` on `LibertyProject` and stamp it during discovery

**Status:** `[x] done`

**Intent:**
Add `installDirectory` as an optional field on `LibertyProject` so it is available anywhere in the extension. Assign it during the existing post-creation metadata stamping step in `projectDiscovery.ts`.

**Expected Outcomes:**
- `LibertyProject` has a new public optional field `installDirectory?: string`.
- `stampProjects` in `projectDiscovery.ts` assigns `project.installDirectory = metadata.installDirectory` for both Maven and Gradle projects, following the same pattern used for `artifactId` and `isLibertyEnabled`.
- Projects without a configured install directory keep `installDirectory` as `undefined` — no behaviour change for the common case.
- No change to the constructor signature; the field is assigned post-construction, consistent with the existing stamped fields.

**Relevant Context:**
- `src/liberty/libertyProject.ts` — `LibertyProject` class, `public installDirectory?: string` field (line 46)
- `src/liberty/projectDiscovery.ts` — stamping assignments at lines 309, 318

---

### Sub-Task 4 — Fix `attachDebugger` to search `installDirectory` first, then fall back

**Status:** `[x] done`

**Intent:**
Update the `server.env` discovery in `attachDebugger` so that when `installDirectory` is set on the project, the search starts there (under `<installDirectory>/usr/servers/**/server.env`); only if no file is found there does it fall back to the current `target/**/` or `build/**/` search. This follows the design decision: install-dir first, fall back to build output.

**Expected Outcomes:**
- When `targetProject.installDirectory` is set and a `server.env` exists under it, the debugger attaches correctly regardless of whether the install dir is inside or outside the workspace.
- When `installDirectory` is not set, behaviour is identical to today.
- When `installDirectory` is set but no `server.env` is found there, the code falls back to the `target/**/` or `build/**/` search — no regression for users who set `installDirectory` to a path that does not yet contain a server.
- The existing `paths.length === 1` guard and the "multiple matches" failure path are preserved; the change only affects which directory is searched first.

**Relevant Context:**
- `src/liberty/devCommands.ts` — `attachDebugger`, lines 354–384 (current implementation)

---

### Sub-Task 5 — Add unit tests for build-file parsing and attach-debugger search order

**Status:** `[x] done`

**Intent:**
Provide focused unit-level coverage for the new parsing and search logic so regressions are caught without requiring the full E2E suite.

**Expected Outcomes:**
- Tests verify Maven `installDirectory` extraction from `<build>` and `<profiles>` blocks, and `undefined` when absent.
- Tests verify Gradle `installDir` regex extracts quoted strings and `file()` calls, ignores variable refs, and supports both name forms.
- Tests verify `attachDebugger` search order: install-dir first, fallback when unset.

**Relevant Context:**
- `src/test/unit/installDirectory.test.ts` — all test cases implemented

---

### Sub-Task 6 — Capture CLI `installDirectory` property from `Start…` parameters and store on `LibertyProject`

**Status:** `[ ] pending`

**Intent:**

This is the new work the mentor requested.

When a user runs **Start…** (custom dev mode) and provides a CLI property that overrides the install directory — for example `-DinstallDirectory=/opt/wlp` (Maven) or `-PinstallDirectory=/opt/wlp` (Gradle) — the currently running server's install directory differs from what was parsed from the build file. The `attachDebugger` command reads `targetProject.installDirectory`, which was only set at discovery time from the build file. It does not reflect runtime overrides passed in the terminal.

The fix is: when a `Start…` command is dispatched, parse the custom parameter string for any `-DinstallDirectory=…` (Maven) or `-PinstallDirectory=…` (Gradle) flag, and if found, update `targetProject.installDirectory` on the live project instance for the duration of that server session. When the server stops (terminal closed / `deleteTerminal`), the field reverts to the build-file value so the next attach attempt is not polluted.

This keeps `installDirectory` accurate for the entire lifespan of a running server, regardless of how it was started.

**Why this matters:**
- A user starts the server with `-DinstallDirectory=/opt/myWlp`. The build file has no `<installDirectory>` entry (or a different one).
- `attachDebugger` reads `targetProject.installDirectory`, which is `undefined` (or the wrong path).
- It falls back to `target/**/server.env`, which does not exist, so it fails.
- With this fix, `installDirectory` is updated when the terminal is spawned, so `attachDebugger` finds the right path.

**Expected Outcomes:**
- `customDevMode` (in `devCommands.ts`) — after building the custom parameter string — calls a helper that scans for `-DinstallDirectory=…` / `-PinstallDirectory=…` (Maven) or an equivalent Gradle pattern and updates `libProject.installDirectory` when found.
- The override is **in-memory only** — it sets the existing `installDirectory` field on the live `LibertyProject` instance and makes no writes to disk or persistent storage.
- When the terminal session ends (`deleteTerminal` / `LibertyProject.deleteTerminal`), `installDirectory` is reset to the value that was originally parsed from the build file (captured just before the override). This restores correctness for the next Start… cycle.
- Regular `startDevMode` (no custom params) does **not** modify `installDirectory`.
- `startContainerDevMode` follows the same pattern as `startDevMode` — no CLI params, no override.
- The CLI value takes precedence over the build-file value for the life of the session.

**Todo List:**
1. Write a pure helper function (e.g. `extractInstallDirFromParams(params: string, isMavenProject: boolean): string | undefined`) in a suitable util file that:
   - For Maven projects: looks for `-DinstallDirectory=<value>` in the params string (handles both `=value` adjacent and with spaces per Maven conventions).
   - For Gradle projects: looks for `-PinstallDirectory=<value>` (project property form) or `-PinstallDir=<value>`.
   - Returns the extracted path string, or `undefined` if not present.
2. Add a field `private _buildFileInstallDirectory?: string` (or similar) to `LibertyProject` to snapshot the pre-override value so the terminal-close handler can restore it.
   - Alternatively, store the snapshot in `customDevMode` at the call site right before updating — whichever is simpler and more localized.
3. In `customDevMode` (`devCommands.ts`), after `ensureTerminal` succeeds and before `sendDevModeCommand`:
   - Call `extractInstallDirFromParams(customParameters, isMaven(libProject.getContextValue()))`.
   - If a value is returned: snapshot `libProject.installDirectory`, then set `libProject.installDirectory = extractedValue`.
4. In `LibertyProject.deleteTerminal()`, after clearing the terminal: restore `installDirectory` to the snapshotted build-file value (or `undefined` if there was none), and clear the snapshot.
5. Add unit tests covering: extraction of `-DinstallDirectory`, `-PinstallDirectory`, `-PinstallDir`, no match, empty string.
6. Add a test (or extend existing) verifying that after a `Start…` with `-DinstallDirectory`, `attachDebugger` would find `server.env` at the CLI-specified path rather than the build-output path.

**Relevant Context:**
- `src/liberty/devCommands.ts` — `customDevMode` (lines 523–547), `sendDevModeCommand` (lines 167–212), `deleteTerminal` (lines 688–698)
- `src/liberty/libertyProject.ts` — `LibertyProject.deleteTerminal()` (lines 152–156), `public installDirectory?: string` (line 46)
- `src/test/unit/installDirectory.test.ts` — existing test structure to extend

---

### Sub-Task 7 — Validate and test end-to-end

**Status:** `[ ] pending`

**Intent:**
Run the existing unit test suite to confirm all prior sub-tasks pass, and manually verify (or add an integration-level note to the PR) that the CLI override path works against a real project.

**Todo List:**
1. Run `npm test` (unit tests) and confirm all pass with no new failures.
2. Review `src/test/unit/installDirectory.test.ts` to confirm Sub-Task 6 tests were added.
3. Update this plan file: mark Sub-Tasks 6 and 7 as done.
