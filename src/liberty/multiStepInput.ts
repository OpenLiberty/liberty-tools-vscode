import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons } from 'vscode';
import * as devCommands from "./devCommands";
import { getProjectOptions } from '../definitions/starterOptions';
import * as vscode from "vscode";
import * as fs from "fs";

export async function multiStepInput(context: ExtensionContext) {

	const projectOptions = await getProjectOptions();
	const buildTools: QuickPickItem[] = projectOptions.b.options
		.map(label => ({ label }));

	const javaSEVersions: QuickPickItem[] = projectOptions.j.options
		.map(label => ({ label }));

	const javaEEVersions: QuickPickItem[] = projectOptions.e.options
		.map(label => ({ label }));

	const projectDir: QuickPickItem[] = ["Yes", "No"]
		.map(label => ({ label }));

	interface State {
		a: string,
        b: QuickPickItem | string,
        e: QuickPickItem | string,
        g: string,
        j: QuickPickItem | string,
        m: QuickPickItem | string,
		step: number;
		totalSteps: number;
		dir: string;
	}

	async function collectInputs() {
		const state = {} as Partial<State>;
		await MultiStepInput.run(input => pickDir(input, state));
		return state as State;
	}

	const title = 'Create Open Liberty Starter Code';

	async function pickDir(input: MultiStepInput, state: Partial<State>) {
		state.dir = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 7,
			placeholder: "Create project in current directory?",
			items: projectDir,
			value: state.dir,
			shouldResume: shouldResume
		});
		state.dir = state.dir.label;
		if (state.dir != "Yes") {
			const folder = await window.showOpenDialog({
				canSelectMany: false,
				openLabel: 'Select',
				canSelectFiles: false,
				canSelectFolders: true
				});
			state.dir = folder[0].path
			return (input: MultiStepInput) => inputGroupName(input, state);
		} else {
			state.dir = vscode.workspace.workspaceFolders[0].uri.fsPath; 
			return (input: MultiStepInput) => inputGroupName(input, state);
		}
		
	}

	async function inputGroupName(input: MultiStepInput, state: Partial<State>) {
		state.g = await input.showInputBox({
			title,
			step: 2,
			totalSteps: 7,
			value: state.g || projectOptions.g.default,
			prompt: projectOptions.g.name,
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		const regexp = new RegExp("^([a-z]+\\.)*[a-z]+$", "i");
		if (! regexp.test(state.g) ) {
			window.showErrorMessage("Group name must be a-z separated by periods");
			return (input: MultiStepInput) => inputGroupName(input, state);
		} else {
			return (input: MultiStepInput) => inputArtifactName(input, state);
		}
	}

	async function inputArtifactName(input: MultiStepInput, state: Partial<State>) {
		state.a = await input.showInputBox({
			title,
			step: 3,
			totalSteps: 7,
			value: state.a || projectOptions.a.default,
			prompt: projectOptions.a.name,
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		if (fs.existsSync(`${state.dir}/${state.a}`)) {
			window.showErrorMessage("App name must be unique in the directory");
			return (input: MultiStepInput) => inputArtifactName(input, state);
		}
		const regexp = new RegExp("^([a-z]+-)*[a-z]+$", "i");
		if (! regexp.test(state.a) ) {
			window.showErrorMessage("App name must be a-z characters separated by dashes");
			return (input: MultiStepInput) => inputArtifactName(input, state);
		} else {
			return (input: MultiStepInput) => pickResourceGroup(input, state);
		}
	}

	async function pickResourceGroup(input: MultiStepInput, state: Partial<State>) {
		state.b = await input.showQuickPick({
			title,
			step: 4,
			totalSteps: 7,
			placeholder: projectOptions.b.name,
			items: buildTools,
			value: state.b,
			shouldResume: shouldResume
		});
		state.b = state.b.label;
		return (input: MultiStepInput) => pickJavaSE(input, state);
	}

	async function pickJavaSE(input: MultiStepInput, state: Partial<State>) {
		state.j = await input.showQuickPick({
			title,
			step: 5,
			totalSteps: 7,
			placeholder: projectOptions.j.name,
			items: javaSEVersions,
			value: state.j,
			shouldResume: shouldResume
		});
		state.j = state.j.label;
		return (input: MultiStepInput) => pickJavaEE(input, state);
	}

	async function pickJavaEE(input: MultiStepInput, state: Partial<State>) {
		state.e = await input.showQuickPick({
			title,
			step: 6,
			totalSteps: 7,
			placeholder: projectOptions.e.name,
			items: javaEEVersions,
			value: state.e,
			shouldResume: shouldResume
		});
		state.e = state.e.label;
		var MPVersions: QuickPickItem[] = projectOptions.e.constraints[state.e].m
		.map(label => ({ label }));
		return (input: MultiStepInput) => pickMP(input, state, MPVersions);
	}

	async function pickMP(input: MultiStepInput, state: Partial<State>, MPVersions: QuickPickItem) {
		state.m = await input.showQuickPick({
			title,
			step: 7,
			totalSteps: 7,
			placeholder: projectOptions.m.name,
			items: MPVersions,
			value: state.m,
			shouldResume: shouldResume
		});
		state.m = state.m.label;
	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {
			// noop
		});
	}

	async function validateNameIsUnique(name: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return name === 'vscode' ? 'Name not unique' : undefined;
	}

	const state = await collectInputs();
	window.showInformationMessage(`Creating starter code for '${state.a}'`);
	devCommands.buildStarterProject(state);
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
