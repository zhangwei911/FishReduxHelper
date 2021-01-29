import path = require("path");
import * as vscode from "vscode";
import { SelectItem } from "../bean";

export function add_languages() {
    return vscode.commands.registerCommand(`fishreduxhelper.addLanguages`, async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders !== undefined && workspaceFolders.length > 0) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            var fileList = await vscode.workspace.findFiles(new vscode.RelativePattern(projectPath, `**/l10n/*.arb`));
            let wordspaceEditCode = new vscode.WorkspaceEdit();
            var languages = await vscode.window.showInputBox({
                placeHolder: `请输入翻译内容,如tips=["Tips","提示","提示"]`,
            });
            let languageField = languages?.split("=")[0];
            let languagesStr = languages?.split("=")[1] ?? "[]";
            let languageArr = JSON.parse(languagesStr);
            for (let index = 0; index < fileList.length; index++) {
                const element = fileList[index];

                let arbUri = vscode.Uri.parse(element?.path);

                let arbCodePromise = vscode.workspace.openTextDocument(arbUri);
                let arbCode = await arbCodePromise;
                let language = languageArr[index]??languageArr[0];
                wordspaceEditCode.insert(
                    arbUri,
                    new vscode.Position(arbCode.lineCount - 2, arbCode.lineAt(arbCode.lineCount - 2).range.end.character),
                    `,\n    "${languageField}": "${language}"`
                );
            }
            vscode.workspace.applyEdit(wordspaceEditCode);
            vscode.window.showInformationMessage(`Add ${languageField} ${languagesStr} Success!`);
        }
    });
}