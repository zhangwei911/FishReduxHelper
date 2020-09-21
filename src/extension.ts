// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SelectItem } from "./bean";
import * as path from "path";
import { stringToUint8Array } from "./utils";
import { find } from "./function/find";
import { randomBytes } from "crypto";

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
            if (rootPath !== undefined) {
                let selectActionType = await vscode.window.showQuickPick([
                    "Effect",
                    "Reducer",
                ]);
                if (selectActionType === undefined) {
                    return;
                }
                var actionType = selectActionType.toLowerCase();
                var fileList = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(
                        rootPath,
                        `**/{${actionType},action}.dart`
                    )
                );
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
                if (selectItem === undefined) {
                    return;
                }
                let actionNamePrefix = await vscode.window.showInputBox({
                    placeHolder: "请输入操作名,如test",
                });
                if (actionNamePrefix === undefined) {
                    return;
                }
                let selectIsAddParams = await vscode.window.showQuickPick([
                    "添加参数",
                    "不添加参数",
                ]);
                if (selectIsAddParams === undefined) {
                    return;
                }
                let isAddParams = selectIsAddParams === "添加参数";
                var params;
                var payload;
                var payloadList = new Array<string>();
                var payloadCode = "";
                if (isAddParams) {
                    params = await vscode.window.showInputBox({
                        placeHolder: "请输入参数,如String msg,int index",
                    });
                    if (params === undefined) {
                        return;
                    }
                    if (params.indexOf(",") === -1) {
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
                if (selectItem?.description !== undefined) {
                    let codeUri = vscode.Uri.parse(selectItem?.description);
                    let codePromise = vscode.workspace.openTextDocument(
                        codeUri
                    );
                    let actionUri = vscode.Uri.parse(
                        selectItem?.description.replace(
                            `${actionType}.dart`,
                            "action.dart"
                        )
                    );
                    let actionCodePromise = vscode.workspace.openTextDocument(
                        actionUri
                    );
                    //处理Action
                    let actionCodeDoc = await actionCodePromise;
                    let actionLineCount = actionCodeDoc.lineCount;
                    var actionEnumName = "";
                    var isStartCheckAction = false;
                    let wordspaceEditAction = new vscode.WorkspaceEdit();
                    for (
                        let indexAction = 0;
                        indexAction < actionLineCount;
                        indexAction++
                    ) {
                        var lineTextAction = actionCodeDoc.lineAt(indexAction)
                            .text;
                        const r = /enum ([a-zA-Z0-9]*)[\s]*[\{]{0,1}/g;
                        const m = r.exec(lineTextAction);
                        if (m !== null) {
                            actionEnumName = m[1];
                            if (lineTextAction.endsWith("}")) {
                                wordspaceEditAction.insert(
                                    actionUri,
                                    new vscode.Position(
                                        indexAction,
                                        actionCodeDoc.lineAt(indexAction).range
                                            .end.character - 1
                                    ),
                                    `, ${actionName}`
                                );
                            } else {
                                isStartCheckAction = true;
                            }
                        } else if (isStartCheckAction) {
                            if (lineTextAction.indexOf("}") !== -1) {
                                isStartCheckAction = false;
                                wordspaceEditAction.insert(
                                    actionUri,
                                    actionCodeDoc.lineAt(indexAction - 1).range
                                        .end,
                                    actionCodeDoc
                                        .lineAt(indexAction - 1)
                                        .text.indexOf(",") === -1
                                        ? ","
                                        : ""
                                );
                                wordspaceEditAction.insert(
                                    actionUri,
                                    new vscode.Position(
                                        indexAction,
                                        actionCodeDoc.lineAt(indexAction).range
                                            .end.character - 1
                                    ),
                                    `${
                                        lineTextAction.trim().length === 1
                                            ? ""
                                            : ","
                                    }    ${actionName}\n`
                                );
                            }
                        }
                    }
                    for (
                        let indexAction = actionLineCount - 1;
                        indexAction < actionLineCount;
                        indexAction--
                    ) {
                        let lineTextAction = actionCodeDoc.lineAt(indexAction)
                            .text;
                        if (lineTextAction.indexOf("}") !== -1) {
                            wordspaceEditAction.insert(
                                actionUri,
                                new vscode.Position(
                                    indexAction,
                                    lineTextAction.lastIndexOf("}")
                                ),
                                `\n  static Action ${actionNamePrefix}(${
                                    isAddParams ? params : ""
                                }) {\n    return Action(${actionEnumName}.${actionName}${
                                    isAddParams ? `, payload: ${payload}` : ""
                                });\n  }\n`
                            );
                            break;
                        }
                    }
                    vscode.workspace.applyEdit(wordspaceEditAction);
                    //处理Code
                    let codeDoc = await codePromise;
                    let lineCount = codeDoc.lineCount;
                    var isStartCheck = false;
                    var pageNamePrefix = "";
                    let wordspaceEditCode = new vscode.WorkspaceEdit();
                    for (let index = 0; index < lineCount; index++) {
                        const lineText = codeDoc.lineAt(index).text;
                        const r =
                            actionType === "effect"
                                ? /\<Object, Effect\<([a-zA-Z0-9]*)State\>\>[\s]*\{/g
                                : /\<Object, Reducer\<([a-zA-Z0-9]*)State\>\>[\s]*\{/g;
                        const m = r.exec(lineText);
                        if (m !== null) {
                            pageNamePrefix = m[1];
                            if (lineText.indexOf("}") !== -1) {
                                wordspaceEditCode.insert(
                                    codeUri,
                                    new vscode.Position(
                                        index,
                                        codeDoc.lineAt(index).range.end
                                            .character - 1
                                    ),
                                    `, ${pageNamePrefix}Action.${actionName}:_${actionName}`
                                );
                            } else {
                                isStartCheck = true;
                            }
                        } else if (isStartCheck) {
                            if (lineText.indexOf("}") !== -1) {
                                isStartCheck = false;
                                wordspaceEditCode.insert(
                                    codeUri,
                                    codeDoc.lineAt(index - 1).range.end,
                                    codeDoc
                                        .lineAt(index - 1)
                                        .text.indexOf(",") === -1
                                        ? ","
                                        : ""
                                );
                                wordspaceEditCode.insert(
                                    codeUri,
                                    new vscode.Position(
                                        index,
                                        lineText.indexOf("}")
                                    ),
                                    `${pageNamePrefix}Action.${actionName}:_${actionName}\n`
                                );
                            }
                        } else {
                        }
                        if (index === lineCount - 1) {
                            let stateName = `${pageNamePrefix}State`;
                            if (actionType === "effect") {
                                wordspaceEditCode.insert(
                                    codeUri,
                                    new vscode.Position(
                                        index,
                                        codeDoc.lineAt(
                                            index
                                        ).range.end.character
                                    ),
                                    `\n\nvoid _${actionName}(Action action, Context<${stateName}> ctx) {${
                                        isAddParams ? payloadCode : ""
                                    }}`
                                );
                            } else {
                                wordspaceEditCode.insert(
                                    codeUri,
                                    new vscode.Position(
                                        index,
                                        codeDoc.lineAt(
                                            index
                                        ).range.end.character
                                    ),
                                    `\n\n${stateName} _${actionName}(${stateName} state, Action action) {\n  ${stateName} newState = state.clone();${
                                        isAddParams ? payloadCode : ""
                                    }\n  return newState;\n}`
                                );
                            }
                        }
                    }
                    vscode.workspace.applyEdit(wordspaceEditCode);
                }
            }
            vscode.window.showInformationMessage("Add Action Success!");
        }
    );

    context.subscriptions.push(disposable);

    let disposableAddParam = vscode.commands.registerCommand(
        "fishreduxhelper.addParams",
        async () => {
            var rootPath = vscode.workspace.rootPath;
            if (rootPath !== undefined) {
                var fileList = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(rootPath, `**/state.dart`)
                );
                let fileListSize = fileList.length;
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
                if (selectItem === undefined) {
                    return;
                }
                if (selectItem?.description !== undefined) {
                    let codePromise = vscode.workspace.openTextDocument(
                        vscode.Uri.parse(selectItem?.description)
                    );
                    let codeDoc = await codePromise;
                    let codeState = codeDoc.getText();
                    var newCodeState = "";
                    let lineCount = codeDoc.lineCount;
                    var params = await vscode.window.showInputBox({
                        placeHolder: "请输入参数,如String msg,int index",
                    });
                    if (params === undefined) {
                        return;
                    }
                    var paramsCode = "";
                    var paramsCodeClone = "";
                    if (params.indexOf(",") === -1) {
                        let param = params.split(" ")[1];
                        paramsCode = `\n${params};`;
                        paramsCodeClone = `\n..${param} = ${param};`;
                    } else {
                        let paramList = params.split(",");
                        for (
                            let indexParam = 0;
                            indexParam < paramList.length;
                            indexParam++
                        ) {
                            const element = paramList[indexParam];
                            let param = element.split(" ")[1];
                            paramsCode += `\n${element};`;
                            paramsCodeClone += `\n..${param} = ${param}`;
                        }
                        paramsCodeClone += ";";
                    }
                    var isStartCheck = false;
                    var isStartCheckClone = false;
                    var canStartCheck = true;
                    for (var i = 0; i < lineCount; i++) {
                        var lineText = codeDoc.lineAt(i).text;
                        const r = /\{/g;
                        const m = r.exec(lineText);
                        if (m !== null && canStartCheck) {
                            isStartCheck = true;
                            canStartCheck = false;
                        } else if (
                            isStartCheck &&
                            lineText.indexOf(";") === -1
                        ) {
                            newCodeState += paramsCode;
                            isStartCheck = false;
                        } else {
                            const rClone = /[a-zA-Z0-9]*State clone\(\) \{/g;
                            const mClone = rClone.exec(lineText);
                            if (mClone !== null) {
                                isStartCheckClone = true;
                            } else if (
                                isStartCheckClone &&
                                lineText.indexOf(";") !== -1
                            ) {
                                lineText = lineText.replace(
                                    ";",
                                    paramsCodeClone
                                );
                                isStartCheckClone = false;
                            } else {
                            }
                        }
                        if (i > 0) {
                            newCodeState += "\n";
                        }
                        newCodeState += lineText;
                    }

                    vscode.workspace.fs.writeFile(
                        vscode.Uri.parse(selectItem?.description),
                        stringToUint8Array(newCodeState)
                    );
                }
            }
            vscode.window.showInformationMessage("Add Params Success!");
        }
    );

    context.subscriptions.push(disposableAddParam);

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(["dart"], {
            provideDefinition: providerDefinitionForFishReduxAction,
        })
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            "dart",
            {
                provideCompletionItems: provideCompletionItemsForFishReduxDispatch,
            },
            "("
        )
    );
    let findArr = [
        { command: "findView", fileType: "view" },
        { command: "findAction", fileType: "action" },
        { command: "findEffect", fileType: "effect" },
        { command: "findReducer", fileType: "reducer" },
        { command: "findComponent", fileType: "component" },
        { command: "findAdapter", fileType: "adapter" },
        { command: "findPage", fileType: "page" },
        { command: "findState", fileType: "state" },
    ];
    findArr.forEach((findInfo) => {
        context.subscriptions.push(find(findInfo.command, findInfo.fileType));
    });
}

/**
 * 自动提示实现，这里模拟一个很简单的操作
 * 当输入 this.dependencies.xxx时自动把package.json中的依赖带出来
 * 当然这个例子没啥实际意义，仅仅是为了演示如何实现功能
 * @param {*} document
 * @param {*} position
 * @param {*} token
 * @param {*} context
 */
async function provideCompletionItemsForFishReduxDispatch(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders !== undefined && workspaceFolders.length > 0) {
        const projectPath = workspaceFolders[0].uri.fsPath;
        const line = document.lineAt(position);
        // 只截取到光标位置为止，防止一些特殊情况
        const lineText = line.text.substring(0, position.character);
        // 简单匹配，只要当前光标前的字符串为`dispatch.`都自动带出所有的依赖
        if (/dispatch\($/g.test(lineText)) {
            var actionFileList = await vscode.workspace.findFiles(
                new vscode.RelativePattern(projectPath, `**/action.dart`)
            );
            let actionFileListSize = actionFileList.length;
            const list = new Array<ActionInfo>();
            for (let index = 0; index < actionFileListSize; index++) {
                const actionFile = actionFileList[index];
                const actionDoc = await vscode.workspace.openTextDocument(
                    actionFile
                );
                const actionCode = actionDoc.getText();
                const rAction = new RegExp(
                    `static[\\s].*Action[\\s]*([a-zA-Z0-9_].*)\\(.*\\)[\\s].*\\{[\\s].*return[const\\s].*Action\\(([a-zA-Z0-9]*Action.[a-zA-Z0-9_]*).*\\);[\\s].*\\}`,
                    "gm"
                );
                const mActionCode = actionCode.match(rAction);
                const mActionCreator = actionCode.match(
                    /[a-zA-Z0-9]*ActionCreator/
                );
                if (mActionCode !== null && mActionCreator !== null) {
                    for (
                        let indexAction = 0;
                        indexAction < mActionCode.length;
                        indexAction++
                    ) {
                        const actionCode = mActionCode[indexAction];
                        const rActionName = RegExp(
                            "static[\\s].*Action[\\s]*([a-zA-Z0-9_].*)\\(",
                            "gm"
                        );
                        const mActionName = rActionName.exec(actionCode);
                        if (mActionName !== null) {
                            list.push(
                                new ActionInfo(
                                    `${mActionCreator[0]}.${mActionName[1]}`,
                                    actionCode
                                )
                            );
                        }
                    }
                }
            }
            const ciArr = list.map((actionInfo) => {
                // vscode.CompletionItemKind 表示提示的类型
                const ci = new vscode.CompletionItem(
                    `${actionInfo.name}`,
                    vscode.CompletionItemKind.Method
                );
                ci.sortText = "0";
                ci.detail = `${actionInfo.actionCode}`;
                let ss = new vscode.SnippetString(`${actionInfo.name}($0));`);
                ci.insertText = ss;
                ci.documentation = `${actionInfo.name}`;
                ci.range = new vscode.Range(
                    new vscode.Position(position.line, position.character),
                    new vscode.Position(position.line, line.range.end.character)
                );
                return ci;
            });
            return ciArr;
        }
    }
}

class ActionInfo {
    name: string;
    actionCode: string;

    constructor(name: string, actionCode: string) {
        this.name = name;
        this.actionCode = actionCode;
    }
}

async function providerDefinitionForFishReduxAction(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
) {
    const fileName = document.fileName;
    const workDir = path.dirname(fileName);
    const word = document.getText(document.getWordRangeAtPosition(position));
    const line = document.lineAt(position);
    if (vscode.workspace.workspaceFolders !== undefined) {
        const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        console.log("====== 进入 provideDefinition 方法 ======");
        console.log("fileName: " + fileName); // 当前文件完整路径
        console.log("workDir: " + workDir); // 当前文件所在目录
        console.log("word: " + word); // 当前光标所在单词
        console.log("line: " + line.text); // 当前光标所在行
        console.log("projectPath: " + projectPath); // 当前工程目录
        var fileList = await vscode.workspace.findFiles(
            new vscode.RelativePattern(projectPath, `**/{effect,reducer}.dart`)
        );
        var actionFileList = await vscode.workspace.findFiles(
            new vscode.RelativePattern(projectPath, `**/action.dart`)
        );
        let actionFileListSize = actionFileList.length;
        var searchAction = "";
        actionLabel: for (var i = 0; i < actionFileListSize; i++) {
            const actionCodeDoc = await vscode.workspace.openTextDocument(
                actionFileList[i]
            );
            const actionCode = actionCodeDoc.getText();
            const r = new RegExp(
                `static[\\s]*Action[\\s]*${word}\\([\\s\\S]*\\)[\\s]*\\{[\\s]*return[const\\s]*Action\\(([a-zA-Z0-9]*Action.[a-zA-Z0-9_]*)`,
                "gm"
            );
            const m = r.exec(actionCode);
            if (m !== null) {
                var isStartCheckAction = false;
                actionInnerLabel: for (
                    var j = 0;
                    j < actionCodeDoc.lineCount;
                    j++
                ) {
                    let lineText = actionCodeDoc.lineAt(j).text;
                    const rInner = new RegExp(
                        `static[\\s]*Action[\\s]*${word}\\(`
                    );
                    const mInner = rInner.exec(lineText);
                    if (mInner != null) {
                        isStartCheckAction = true;
                    } else if (isStartCheckAction) {
                        const rInner2 = new RegExp(
                            `return[const\\s]*Action\\(([a-zA-Z0-9]*Action.[a-zA-Z0-9_]*)`
                        );
                        const mInner2 = rInner2.exec(lineText);
                        if (mInner2 != null) {
                            searchAction = mInner2[1];
                            console.log(`searchAction ${searchAction}`);
                            isStartCheckAction = false;
                            break actionInnerLabel;
                        }
                    }
                }
                break actionLabel;
            }
        }
        if (searchAction.length > 0) {
            let fileListSize = fileList.length;
            for (var i = 0; i < fileListSize; i++) {
                const jumpCodeDoc = await vscode.workspace.openTextDocument(
                    fileList[i]
                );
                const jumpCode = jumpCodeDoc.getText();
                const r1 = new RegExp(
                    `${searchAction}[\\s]*:[\\s]*([a-zA-Z0-9_]*)`,
                    "gm"
                );
                const m1 = r1.exec(jumpCode);
                if (m1 !== null) {
                    const action = m1[1];
                    console.log(`action ${action}`);
                    const lineCount = jumpCodeDoc.lineCount;
                    var actionLine = 0;
                    var actionIndex = 0;
                    getLineLabel: for (var j = 0; j < lineCount; j++) {
                        const lineText = jumpCodeDoc.lineAt(j).text;
                        const r = new RegExp(
                            `[\\S ].*${action}[\\s]*\\(.*\\)[async\\s].*\\{`
                        );
                        const m = r.exec(lineText);
                        if (m !== null) {
                            actionLine = j;
                            actionIndex = lineText.indexOf(`${action}`);
                            break getLineLabel;
                        }
                    }
                    console.log(
                        `actionLine ${actionLine} actionIndex ${actionIndex}`
                    );
                    return new vscode.Location(
                        fileList[i],
                        new vscode.Position(actionLine, actionIndex)
                    );
                }
            }
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {}
