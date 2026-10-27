/**
 * Copyright IBM Corp. 2026
 *
 * Detects all Java installations on the machine by running
 * 3 strategies, pools and de-duplicates the results, sorts them
 * by source priority, then exposes findFirstValid(minVersion) to
 * get the best available Java that meets their minimum requirement.
 *
 * Two callers:
 *   - requirements.ts  → findFirstValid(21)  (language server startup, global)
 *   - libertyProject.ts createTerminal() → findForProject(scope)  (per-project terminal)
 */

import { Disposable, Uri, workspace } from "vscode";
import { redhatExtensionStrategy } from "./java-detection/strategies/redhat-extension-strategy";
import { vscodeSettingsStrategy } from "./java-detection/strategies/vscode-settings-strategy";
import { systemPathStrategy } from "./java-detection/strategies/system-path-strategy";


export interface IJavaInstallation {
    name?: string;
    path: string;
    version: string;
    majorVersion: number;
    sources: string[];
    isDefault?: boolean;
    isJdk?: boolean;
}

export interface IJavaDetectStrategy {
    name: string;
    detect(scope?: Uri): Promise<IJavaInstallation[]>;
}

export class JavaSelector {
    private static instance: JavaSelector;
    private cache: IJavaInstallation[] | null = null;

    // Global strategies (all 3) — used by findFirstValid for language server startup
    private readonly strategies: IJavaDetectStrategy[] = [
        redhatExtensionStrategy,
        vscodeSettingsStrategy,
        systemPathStrategy,
    ];

    // Per-project strategies — used by findForProject for dev mode terminals.
    // Red Hat strategy intentionally excluded.
    private perProjectStrategies: IJavaDetectStrategy[] = [
        vscodeSettingsStrategy,
        systemPathStrategy,
    ];

    private constructor() {}

    static getInstance(): JavaSelector {
        if (!JavaSelector.instance) {
            JavaSelector.instance = new JavaSelector();
        }
        return JavaSelector.instance;
    }

    /**
     * Global layer: language server startup.
     * Walks the cached candidate pool (all 3 strategies, sorted by priority),
     * skips anything below minVersion, returns the first one that passes.
     * Only throws after all candidates are exhausted.
     *
     * @param minVersion Minimum major Java version required (default: 21)
     */
    async findFirstValid(minVersion: number = 21): Promise<IJavaInstallation> {
        if (this.cache === null) {
            this.cache = await this.detectAllJavaInstallations();
        }

        for (const java of this.cache) {
            if (java.majorVersion < minVersion) {
                console.log(`[JavaSelector] Skipping ${java.path} (Java ${java.majorVersion} < ${minVersion})`);
                continue;
            }
            console.log(`[JavaSelector] Selected ${java.path} (Java ${java.majorVersion})`);
            return java;
        }

        throw new Error(`No Java installation found meeting the minimum version requirement of Java ${minVersion}.`);
    }

    /**
     * Per-project layer: dev mode terminal.
     * Runs a fresh (uncached) scoped detection against vscode-settings and
     * system-path only. The Red Hat extension's embedded JRE is intentionally
     * excluded: it is only relevant for launching language server JARs, not
     * for running mvn/gradle in the user's terminal.
     *
     * Reading vscode-settings with the project's URI means each project in a
     * multi-root workspace resolves its own .vscode/settings.json independently.
     *
     * Falls back to an empty string (system PATH) if nothing is found — never throws.
     *
     * @param projectUri  URI of the project's build file (e.g. Uri.file(this.path))
     */
    async findForProject(projectUri: Uri): Promise<string> {
        const scope = projectUri;
        // Use overrideable per-project strategies so tests can inject fakes.
        // In production these are always vscodeSettingsStrategy + systemPathStrategy.
        const perProjectStrategies: IJavaDetectStrategy[] = this.perProjectStrategies;

        const candidates = await this.detectInstallations(perProjectStrategies, scope);

        for (const java of candidates) {
            console.log(`[JavaSelector] Per-project selected ${java.path} (Java ${java.majorVersion}) via ${java.sources.join(", ")}`);
            return java.path;
        }

        console.log("[JavaSelector] Per-project: no Java found, falling back to system PATH");
        return "";
    }

    /**
     * Clear the cached list of Java installations.
     * Called by watchConfigChanges() when VS Code settings change.
     */
    clearCache(): void {
        this.cache = null;
    }

    /**
     * Watch the VS Code settings keys used by vscodeSettingsStrategy.
     * Invalidates the cache after 1 second of inactivity following a change.
     * The returned Disposable should be pushed to context.subscriptions in extension.ts.
     */
    watchConfigChanges(): Disposable {
        const WATCHED_KEYS = [
            "xml.java.home",
            "java.configuration.runtimes",
            "java.jdt.ls.java.home",
            "java.import.gradle.java.home",
            "java.import.maven.java.home",
            "java.home",
        ];

        let debounceTimer: ReturnType<typeof setTimeout> | undefined;

        return workspace.onDidChangeConfiguration((e) => {
            const affected = WATCHED_KEYS.some((key) => e.affectsConfiguration(key));
            if (!affected) {
                return;
            }
            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                debounceTimer = undefined;
                console.log("[JavaSelector] VS Code Java settings changed — invalidating cache");
                this.clearCache();
            }, 1000);
        });
    }

    /**
     * Run all 3 strategies (global cache path).
     */
    private async detectAllJavaInstallations(): Promise<IJavaInstallation[]> {
        return this.detectInstallations(this.strategies);
    }

    /**
     * Core detection: run the given strategies with an optional scope, merge
     * by path, and sort by sourcePriority.
     */
    private async detectInstallations(strategies: IJavaDetectStrategy[], scope?: Uri): Promise<IJavaInstallation[]> {
        const all: IJavaInstallation[] = [];

        for (const strategy of strategies) {
            try {
                const results = await strategy.detect(scope);
                all.push(...results);
            } catch {
                // A strategy failure never blocks the others
            }
        }

        // Merge sources arrays so a JDK found by
        // multiple strategies keeps all its source tags
        const mergeMap = new Map<string, IJavaInstallation>();
        for (const installation of all) {
            const existing = mergeMap.get(installation.path);
            if (existing) {
                mergeMap.set(installation.path, {
                    ...existing,
                    sources: [...new Set([...existing.sources, ...installation.sources])],
                    isDefault: existing.isDefault || installation.isDefault,
                    name: existing.name || installation.name,
                });
            } else {
                mergeMap.set(installation.path, installation);
            }
        }

        // sorts by sourcePriority: vscode-settings default first, then
        // vscode-settings, then JAVA_HOME, JDK_HOME, system scan
        return Array.from(mergeMap.values()).sort(
            (a, b) => this.sourcePriority(a) - this.sourcePriority(b)
        );
    }

    /**
     * Precedence: 
     *   0 — Red Hat extension JRE       (for language server)
     *   1 — vscode-settings (default)   (user explicitly marked as default)
     *   2 — vscode-settings             (user configured but not default)
     *   3 — JAVA_HOME env var
     *   4 — JDK_HOME env var
     *   5 — system scan                 (lowest, OS auto-detected)
     */
    private sourcePriority(installation: IJavaInstallation): number {
        if (installation.sources.includes("redhat.java")) { return 0; }
        if (installation.sources.includes("vscode-settings")) {
            return installation.isDefault ? 1 : 2;
        }
        if (installation.sources.includes("JAVA_HOME")) { return 3; }
        if (installation.sources.includes("JDK_HOME"))  { return 4; }
        return 5;
    }

    /** FOR TESTING ONLY: inject a fake candidate list directly */
    _setCacheForTesting(installations: IJavaInstallation[]): void {
        this.cache = installations;
    }

    /** FOR TESTING ONLY: replace global strategies with test doubles */
    _setStrategiesForTesting(strategies: IJavaDetectStrategy[]): void {
        (this as any).strategies = strategies;
    }

    /** FOR TESTING ONLY: replace per-project strategies with test doubles */
    _setPerProjectStrategiesForTesting(strategies: IJavaDetectStrategy[]): void {
        this.perProjectStrategies = strategies;
    }
}
