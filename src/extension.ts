// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SelectItem } from "./bean";
import * as path from "path";
import { stringToUint8Array } from "./utils";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "fishreduxhelper" is now active!'
    );

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand(
        "fishreduxhelper.addAction",
        async () => {
            // The code you place here will be executed every time your command is executed
            var rootPath = vscode.workspace.rootPath;
            if (rootPath != undefined) {
                let selectActionType = await vscode.window.showQuickPick([
                    "Effect",
                    "Reducer",
                ]);
                if (selectActionType == undefined) {
                    return;
                }
                var actionType = selectActionType.toLowerCase();
                var fileList = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(
                        rootPath,
                        `**/{${actionType},action}.dart`
                    )
                );
                let fileListSize = fileList.length;
                let fileSelectList = new Array<SelectItem>();
                fileList.forEach((element: vscode.Uri) => {
                    if (element.path.endsWith(`${actionType}.dart`)) {
                        let selectItem = new SelectItem(
                            path.basename(path.dirname(element.path))
                        );
                        selectItem.description = element.path;
                        fileSelectList.push(selectItem);
                    }
                });
                let selectItem = await vscode.window.showQuickPick(
                    fileSelectList
                );
                if (selectItem == undefined) {
                    return;
                }
                let actionNamePrefix = await vscode.window.showInputBox({
                    placeHolder: "请输入操作名,如test",
                });
                if (actionNamePrefix == undefined) {
                    return;
                }
                let selectIsAddParams = await vscode.window.showQuickPick([
                    "添加参数",
                    "不添加参数",
                ]);
                if (selectIsAddParams == undefined) {
                    return;
                }
                let isAddParams = selectIsAddParams == "添加参数";
                var params;
                var payload;
                var payloadList = new Array<string>();
                var payloadCode = "";
                if (isAddParams) {
                    params = await vscode.window.showInputBox({
                        placeHolder: "请输入参数,如String msg,int index",
                    });
                    if (params == undefined) {
                        return;
                    }
                    if (params.indexOf(",") == -1) {
                        let param = params.split(" ")[1];
                        payload = param;
                        payloadList.push(`\n${params} = action.payload;`);
                    } else {
                        let paramList = params.split(",");
                        payload = "{";
                        for (
                            let indexParam = 0;
                            indexParam < paramList.length;
                            indexParam++
                        ) {
                            const element = paramList[indexParam];
                            let param = element.split(" ")[1];
                            payload += `'${param}':${param},`;
                            payloadList.push(
                                `${element} = action.payload['${param}'];`
                            );
                        }
                        payload += "}";
                    }
                    for (
                        let indexPayload = 0;
                        indexPayload < payloadList.length;
                        indexPayload++
                    ) {
                        const element = payloadList[indexPayload];
                        payloadCode += `\n  ${element}`;
                    }
                    payloadCode += "\n";
                }

                let actionName = `${actionNamePrefix}${selectActionType}Action`;
                if (selectItem?.description != undefined) {
                    let codePromise = vscode.workspace.openTextDocument(
                        vscode.Uri.parse(selectItem?.description)
                    );
                    let actionCodePromise = vscode.workspace.openTextDocument(
                        vscode.Uri.parse(
                            selectItem?.description.replace(
                                `${actionType}.dart`,
                                "action.dart"
                            )
                        )
                    );
                    //处理Action
                    let actionCodeDoc = await actionCodePromise;
                    let actionCode = actionCodeDoc.getText();
                    let actionLineCount = actionCodeDoc.lineCount;
                    var actionEnumName = "";
                    var newActionCode = "";
                    for (
                        let indexAction = 0;
                        indexAction < actionLineCount;
                        indexAction++
                    ) {
                        var lineTextAction = actionCodeDoc.lineAt(indexAction)
                            .text;
                        const r = /enum ([a-zA-Z0-9].*)[ ].*{.*/g;
                        const m = r.exec(lineTextAction);
                        if (m != null) {
                            actionEnumName = m[1];
                            lineTextAction = lineTextAction.replace(
                                "}",
                                `,${actionName}}`
                            );
                        }
                        if (indexAction > 0) {
                            newActionCode += "\n";
                        }
                        newActionCode += `${lineTextAction}`;
                    }

                    newActionCode =
                        newActionCode.substring(
                            0,
                            newActionCode.lastIndexOf("}")
                        ) +
                        `\n  static Action ${actionNamePrefix}(${
                            isAddParams ? params : ""
                        }) {\n    return Action(${actionEnumName}.${actionName}${
                            isAddParams ? `, payload: ${payload}` : ""
                        });\n  }\n}`;

                    vscode.workspace.fs.writeFile(
                        vscode.Uri.parse(
                            selectItem?.description.replace(
                                `${actionType}.dart`,
                                "action.dart"
                            )
                        ),
                        stringToUint8Array(newActionCode)
                    );
                    //处理Code
                    let codeDoc = await codePromise;
                    var code = codeDoc.getText();
                    let lineCount = codeDoc.lineCount;
                    var isStartCheck = false;
                    var newCode = "";
                    var pageNamePrefix = "";
                    for (let index = 0; index < lineCount; index++) {
                        const lineText = codeDoc.lineAt(index).text;
                        const r =
                            actionType == "effect"
                                ? /\<Object, Effect\<([a-zA-Z0-9].*)State\>\>\{/g
                                : /\<Object, Reducer\<([a-zA-Z0-9].*)State\>\>\{/g;
                        const m = r.exec(lineText);
                        if (m != null) {
                            isStartCheck = true;
                            pageNamePrefix = m[1];
                        } else if (isStartCheck) {
                            if (lineText.indexOf(":") == -1) {
                                const lineTextPre = codeDoc.lineAt(
                                    index - 1
                                ).text;
                                const addComma = lineTextPre.indexOf(",") == -1;
                                if (addComma) {
                                    newCode += ",";
                                }
                                newCode += `\n${pageNamePrefix}Action.${actionName}:_${actionName}`;
                                isStartCheck = false;
                            }
                        } else {
                        }
                        if (index == lineCount - 1) {
							let stateName = `${pageNamePrefix}State`;
                            if (actionType == "effect") {
                                newCode += `\n\nvoid _${actionName}(Action action, Context<${stateName}> ctx) {${
                                    isAddParams ? payloadCode : ""
                                }}`;
                            } else {
								newCode += `\n\n${stateName} _${actionName}(${stateName} state, Action action) {\n  ${stateName} newState = state.clone();${
                                    isAddParams ? payloadCode : ""
                                }\n  return newState;\n}`;
                            }
                        }
                        if (index > 0) {
                            newCode += "\n";
                        }
                        newCode += `${lineText}`;
                    }

                    vscode.workspace.fs.writeFile(
                        vscode.Uri.parse(selectItem?.description),
                        stringToUint8Array(newCode)
                    );
                }
            }
            // Display a message box to the user
            vscode.window.showInformationMessage(
                "Hello World from FishReduxHelper!"
            );
        }
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
