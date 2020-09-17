import path = require("path");
import * as vscode from "vscode";
import { SelectItem } from "../bean";

export function find(command: string, fileType: string) {
    return vscode.commands.registerCommand(
        `fishreduxhelper.${command}`,
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders != undefined && workspaceFolders.length > 0) {
                const projectPath = workspaceFolders[0].uri.fsPath;
                var fileList = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(
                        projectPath,
                        `**/${fileType}.dart`
                    )
                );
                let fileSelectList = new Array<SelectItem>();
                fileList.forEach((element: vscode.Uri) => {
                    let selectItem = new SelectItem(
                        path.basename(path.dirname(element.path))
                    );
                    selectItem.description = element.path;
                    fileSelectList.push(selectItem);
                });
                let selectItem = await vscode.window.showQuickPick(
                    fileSelectList
                );
                if (selectItem == undefined) {
                    return;
                }
                if (selectItem?.description != undefined) {
                    let doc = await vscode.workspace.openTextDocument(
                        vscode.Uri.parse(selectItem?.description)
                    );
                    vscode.window.showTextDocument(doc);
                }
            }
        }
    );
}
