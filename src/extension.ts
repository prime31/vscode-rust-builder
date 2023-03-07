import * as vscode from 'vscode';
import { CargoBuild, CargoRunItem } from './CargoBuild';

var last_command: CargoRunItem | undefined;

export function activate(context: vscode.ExtensionContext) {
    // Provider for all the available runnable rust-builder tasks
    context.subscriptions.push(vscode.commands.registerCommand('rust-builder.build.getTargets', chooseBuildTarget));

    // Shortcut to run the last ran target or prompt if there was no last ran
    context.subscriptions.push(vscode.commands.registerCommand('rust-builder.build.getLastTargetOrPrompt', () => {
        if (last_command != null) return last_command;
        return chooseBuildTarget();
    }));

    // builds the last chosen target
    context.subscriptions.push(
        vscode.commands.registerCommand('rust-builder.buildLastTarget', async () => {
            vscode.commands.executeCommand('workbench.action.terminal.clear');
            vscode.tasks.executeTask(await getBuildTask("Build", "rust-builder build last target"));
        })
    );

    // same as above but forces a prompt for the target
    context.subscriptions.push(
        vscode.commands.registerCommand('rust-builder.buildTarget', async () => {
            vscode.tasks.executeTask(await getBuildTask("Build", "rust-builder build force choose target", true));
        })
    );

    // provides a build last target task that appears in the command palatte
    vscode.tasks.registerTaskProvider("rust-builder.buildLastTarget", {
        async provideTasks(token?: vscode.CancellationToken) {
            return [await getBuildTask("Build", "rust-builder build last target", false)];
        },

        resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
            return task;
        }
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}

// uses showQuickPick to let you choose a rust-builder build target
async function chooseBuildTarget() {
    try {
        const handler = new CargoBuild();
        let target = handler.handle();
        target.then(value => last_command = value ?? undefined);
        return target;
    } catch (error) {
        const message = (error instanceof Error) ? error.message : 'Error executing shell command: ' + error;
        console.error(error);
        vscode.window.showErrorMessage(message);
    }
}

// fetches a Task that optionally prompts for a build target that can be run
async function getBuildTask(name: string, source: string, force_target_prompt: boolean = false) : Promise<vscode.Task> {
	var command: CargoRunItem | undefined = undefined;
	if (!force_target_prompt) {
		if (last_command instanceof CargoRunItem) command = last_command;
	}

	command = command ?? await chooseBuildTarget();
    if (command !== undefined) {
        var execution = new vscode.ShellExecution(command.getCargoRunCommand(), {});
        return new vscode.Task({ type: "rust-builder.buildLastTarget" }, vscode.TaskScope.Workspace, name, source, execution, ["$gcc"]);
    }
    return new vscode.Task({ type: "rust-builder.buildLastTarget" }, name, source);
}