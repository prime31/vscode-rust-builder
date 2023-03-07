import * as vscode from 'vscode';
import * as subprocess from 'child_process';
import * as fs from 'fs';
import { QuickPickItem } from 'vscode';

enum CargoRunItemType {
    bin,
    example
}

export class CargoRunItem implements QuickPickItem {
	label: string;
    type: CargoRunItemType;

	constructor(public command: string, type: CargoRunItemType) {
		this.label = command;
        this.type = type
	}

    getCargoRunCommand() {
        if (this.type == CargoRunItemType.bin) return "cargo run --bin " + this.label;
        return "cargo run --example " + this.label;
    }
}

export class CargoBuild {
    protected EOL: RegExp = /\r\n|\r|\n/;
    protected inputOptions: vscode.QuickPickOptions = {
        canPickMany: false
    };

    constructor() {}

    handle() {
        return vscode.window.showQuickPick(this.getAvailableTargets(), { "placeHolder": "Select the cargo target to run" });
    }

    getAvailableTargets() {
        let result = this.runCommand("cargo run --bin");
        let bin_results = this.parseResult(result);

        result = this.runCommand("cargo run --example");
        let example_results = this.parseResult(result);

        let quick_pick_items = []
        for (var item of bin_results) quick_pick_items.push(new CargoRunItem(item, CargoRunItemType.bin))
        for (var item of example_results) quick_pick_items.push(new CargoRunItem(item, CargoRunItemType.example))

        return quick_pick_items;
    }

    protected runCommand(cmd: string) {
        if (vscode.workspace.workspaceFolders == undefined)
            throw Error("Aborting build target fetch. No workspace folders found");

        if (!fs.existsSync(vscode.workspace.workspaceFolders![0].uri.fsPath + "/Cargo.toml"))
            throw Error("Aborting build target fetch. No Cargo.toml file found in workspace root.");

        const options: subprocess.ExecSyncOptionsWithStringEncoding = {
            encoding: 'utf8',
            cwd: vscode.workspace.workspaceFolders![0].uri.fsPath,
            shell: vscode.env.shell
        };

        try {
            return subprocess.execSync(cmd, options);
        } catch (err: any) {
            return err.toString()
        }
    }

    protected parseResult(result: string) {
        let lines = result.split(this.EOL);
        var results = [];

        var inSteps = false;
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].includes("Available binaries:") || lines[i].includes("Available examples:")) {
                inSteps = true;
                continue;
            }

            if (inSteps && lines[i] == "") {
                break;
            }

            if (inSteps) {
                let match = lines[i].trim().match(/^([\w-]+)/);
                if (match)
                    results.push(match[0]);
            }
        }

        return results.filter((value: string) => value && value.trim().length > 0);
    }

    protected quickPick(input: string[]) {
        return vscode.window.showQuickPick(input, this.inputOptions);
    }
}