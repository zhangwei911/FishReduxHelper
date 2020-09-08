// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SelectItem } from './bean';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fishreduxhelper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('fishreduxhelper.addEffectAction', async () => {
		// The code you place here will be executed every time your command is executed
		var rootPath = vscode.workspace.rootPath;
		if (rootPath != undefined) {
			var effectList = await vscode.workspace.findFiles(new vscode.RelativePattern(rootPath, '**/{effect,action}.dart'));
			let effectListSize = effectList.length;
			let effectSelectList = new Array<SelectItem>();
			effectList.forEach(element => {
				let selectItem = new SelectItem(path.dirname(element.path));
				selectItem.description = element.path;
				effectSelectList.push(selectItem);
			});
			let selectItem = await vscode.window.showQuickPick(effectSelectList);
			if (selectItem?.description != undefined) {
				let effectCodePromise = vscode.workspace.openTextDocument(vscode.Uri.parse(selectItem?.description));
				let actionCodePromise = vscode.workspace.openTextDocument(vscode.Uri.parse(selectItem?.description.replace('effect.dart', 'action.dart')));
				let effectCodeDoc = await effectCodePromise;
				var effectCode = effectCodeDoc.getText();
				let lineCount = effectCodeDoc.lineCount;
				var isStartCheck = false;
				var newEffectCode = '';
				for (let index = 0; index < lineCount; index++) {
					const lineText = effectCodeDoc.lineAt(index).text;
					if (lineText.match(RegExp('return combineEffects\(<Object, Effect<[a-zA-Z0-9]>>\{'))) {
						isStartCheck = true;
					} else if (isStartCheck) {
						if(lineText.indexOf(':') == -1){
							newEffectCode += 
						}
					}else{
					}
					newEffectCode += lineText;
				}

				let actionCodeDoc = await actionCodePromise;

			}
		}
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from FishReduxHelper!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
