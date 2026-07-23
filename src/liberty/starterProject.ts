import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons } from 'vscode';
import * as devCommands from "./devCommands";
import { getProjectOptions } from '../definitions/starterOptions';
import * as vscode from "vscode";
import * as fs from "fs";
import { localize } from '../util/i18nUtil';
import path from 'path';

export interface State {
	a: string,
	b: string,
	e: string,
	g: string,
	j: string,
	m: string,
	dir: string;
}

export async function starterProject(context: ExtensionContext) {

    const projectOptions = await getProjectOptions();

    const buildTools: QuickPickItem[] = projectOptions.b.options!.map(label => ({ label }));
    const javaSEVersions: QuickPickItem[] = projectOptions.j.options!.map(label => ({ label }));
    const javaEEVersions: QuickPickItem[] = projectOptions.e.options!.map(label => ({ label }));

    const title = localize("starter.label.flow");

    async function inputGroupName(input: MultiStepInput, state: Partial<State>) {
        state.g = await input.showInputBox({
            title,
            step: 1,
            totalSteps: 6,
            value: state.g || projectOptions.g.default,
            prompt: localize("starter.prompt.group"),
            validate: validGroupName,
            shouldResume: shouldResume
        });
        return (input: MultiStepInput) => inputArtifactName(input, state);
    }

    async function inputArtifactName(input: MultiStepInput, state: Partial<State>) {
        state.a = await input.showInputBox({
            title,
            step: 2,
            totalSteps: 6,
            value: state.a || projectOptions.a.default,
            prompt: localize("starter.prompt.artifact"),
            validate: validArtifactName,
            shouldResume: shouldResume
        });
        return (input: MultiStepInput) => pickResourceGroup(input, state);
    }

    async function pickResourceGroup(input: MultiStepInput, state: Partial<State>) {
        state.b = (await input.showQuickPick({
            title,
            step: 3,
            totalSteps: 6,
            placeholder: localize("starter.prompt.build.tool"),
            activeItem: buildTools.find(item => item.label === (state.b || projectOptions.b.default)),
            items: buildTools,
            shouldResume: shouldResume
        })).label;
        return (input: MultiStepInput) => pickJavaSE(input, state);
    }

    async function pickJavaSE(input: MultiStepInput, state: Partial<State>) {
        state.j = (await input.showQuickPick({
            title,
            step: 4,
            totalSteps: 6,
            placeholder: localize("starter.prompt.java"),
            activeItem: javaSEVersions.find(item => item.label === (state.j || projectOptions.j.default)),
            items: javaSEVersions,
            shouldResume: shouldResume,
        })).label;
        return (input: MultiStepInput) => pickJavaEE(input, state);
    }

    async function pickJavaEE(input: MultiStepInput, state: Partial<State>) {
        state.e = (await input.showQuickPick({
            title,
            step: 5,
            totalSteps: 6,
            placeholder: localize("starter.prompt.jakarta"),
            activeItem: javaEEVersions.find(item => item.label === (state.e || projectOptions.e.default)),
            items: javaEEVersions,
            shouldResume: shouldResume
        })).label;
        var MPVersions: QuickPickItem[] = projectOptions.e.constraints![state.e].m
            .map(label => ({ label }));
        return (input: MultiStepInput) => pickMP(input, state, MPVersions);
    }

    async function pickMP(input: MultiStepInput, state: Partial<State>, MPVersions: QuickPickItem[]) {
        state.m = (await input.showQuickPick({
            title,
            step: 6,
            totalSteps: 6,
            placeholder: localize("starter.prompt.microprofile"),
            activeItem: MPVersions.find(item => item.label === (state.m || projectOptions.m.default)),
            items: MPVersions,
            shouldResume: shouldResume
        })).label;
        return (input: MultiStepInput) => pickDirectory(input, state);
    }

    async function pickDirectory(input: MultiStepInput, state: Partial<State>) {
        while (true) {
            const response = await window.showOpenDialog({
                canSelectMany: false,
                openLabel: localize("starter.prompt.directory"),
                canSelectFiles: false,
                canSelectFolders: true
            })
            if (!response) {
                if (!await shouldResume()) {
                    return;
                }
                continue;
            }
            const dir = path.join(response[0].fsPath, state.a!);
            // TODO: do we need to make this async?
            if (fs.existsSync(dir)) {
                const overwrite = localize("starter.button.overwrite");
                const reselect = localize("starter.button.reselect");
                const selection = await window.showWarningMessage(localize("starter.invalid.directory", state.a), overwrite, reselect)
                if (!selection) {
                    if (!await shouldResume()) {
                        return;
                    }
                    continue;
                }
                if (selection === reselect) {
                    continue;
                }
                fs.rmdirSync(dir, { recursive: true });
            }
            state.dir = dir;
            return;
        }
    }

    async function shouldResume() {
        const yes = localize("confirmation.button.label.yes");
        const no = localize("confirmation.button.label.no");
        const selection = await window.showInformationMessage(localize("starter.message.resume"), yes, no) 
        return selection === yes;
    }

    async function validArtifactName(name: string) {
        const regexp = new RegExp("^([a-z]+-)*[a-z]+$", "i");
        if (! regexp.test(name) ) {
            return localize("starter.invalid.artifact");
        } else {
            return undefined;
        }
    }

    async function validGroupName(name: string) {
        const regexp = new RegExp("^([a-z]+\\.)*[a-z]+$", "i");
        if (! regexp.test(name) ) {
            return localize("starter.invalid.group");
        } else {
            return undefined;
        }
    }

    const state = {} as Partial<State>;
    await MultiStepInput.run(input => inputGroupName(input, state));

    if (state.dir != null) {
        await devCommands.buildStarterProject(state as State);
    }
}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
    static back = new InputFlowAction();
    static cancel = new InputFlowAction();
    static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
    title: string;
    step: number;
    totalSteps: number;
    items: T[];
    activeItem?: T;
    placeholder: string;
    buttons?: QuickInputButton[];
    shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
    title: string;
    step: number;
    totalSteps: number;
    value: string;
    prompt: string;
    validate: (value: string) => Promise<string | undefined>;
    buttons?: QuickInputButton[];
    shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

    static async run<T>(start: InputStep) {
        const input = new MultiStepInput();
        return input.stepThrough(start);
    }

    private current?: QuickInput;
    private steps: InputStep[] = [];

    private async stepThrough<T>(start: InputStep) {
        let step: InputStep | void = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else if (err === InputFlowAction.resume) {
                    step = this.steps.pop();
                } else if (err === InputFlowAction.cancel) {
                    step = undefined;
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }

    async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createQuickPick<T>();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.placeholder = placeholder;
                input.items = items;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidChangeSelection(items => resolve(items[0])),
                    input.onDidHide(() => {
                        (async () => {
                            reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                let validating = validate('');
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidAccept(async () => {
                        const value = input.value;
                        input.enabled = false;
                        input.busy = true;
                        if (!(await validate(value))) {
                            resolve(value);
                        }
                        input.enabled = true;
                        input.busy = false;
                    }),
                    input.onDidChangeValue(async text => {
                        const current = validate(text);
                        validating = current;
                        const validationMessage = await current;
                        if (current === validating) {
                            input.validationMessage = validationMessage;
                        }
                    }),
                    input.onDidHide(() => {
                        (async () => {
                            reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
