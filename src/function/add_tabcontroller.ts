import path = require("path");
import * as vscode from "vscode";
import { SelectItem } from "../bean";

export function add_tabcontroller() {
    return vscode.commands.registerCommand(
        `fishreduxhelper.addTabController`,
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders !== undefined && workspaceFolders.length > 0) {
                const projectPath = workspaceFolders[0].uri.fsPath;
                var fileList = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(
                        projectPath,
                        `**/state.dart`
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
                if (selectItem === undefined) {
                    return;
                }

                if (selectItem?.description === undefined) {
                    return;
                }
                let pageUri = vscode.Uri.parse(
                    selectItem?.description.replace(
                        `state.dart`,
                        "page.dart"
                    )
                );

                let pageCodePromise = vscode.workspace.openTextDocument(
                    pageUri
                );
                let pageCode = await pageCodePromise;
                let pageStr = pageCode.getText();
                if (pageStr.indexOf('createState()') === -1) {
                    let wordspaceEditCode = new vscode.WorkspaceEdit();
                    let index = pageCode.lineCount - 1;
                    let start = 0;
                    for (let indexLine = pageCode.lineCount - 1; indexLine < pageCode.lineCount; indexLine--) {
                        let lineText = pageCode.lineAt(indexLine).text;
                        if (lineText.indexOf('}') !== -1) {
                            start = 0;
                            index = indexLine;
                            break;
                        }
                    }
                    wordspaceEditCode.insert(pageUri, new vscode.Position(index, start), '    @override\n    StateWithTickerProvider  createState() => StateWithTickerProvider();\n');
                    const r = /\<([a-zA-Z0-9]*State)\>/g;
                    const m = r.exec(pageStr);
                    if (m !== null) {
                        wordspaceEditCode.insert(pageUri, new vscode.Position(pageCode.lineCount - 1, 0), '\nclass StateWithTickerProvider extends ComponentState<' + m[1] + '> with TickerProviderStateMixin{}');
                    }

                    let stateUri = vscode.Uri.parse(
                        selectItem?.description
                    );
                    let stateCodePromise = vscode.workspace.openTextDocument(
                        stateUri
                    );
                    let stateCode = await stateCodePromise;
                    wordspaceEditCode.insert(stateUri, new vscode.Position(0, 0), "import 'package:flutter/material.dart';\n");

                    let isStartCheckParams = false;
                    let paramsCheckCount = 0;
                    let isStartCheckClone = false;
                    for (let indexState = 0; indexState < stateCode.lineCount; indexState++) {
                        let lineText = stateCode.lineAt(indexState).text;
                        if (lineText.indexOf('{') !== -1 && paramsCheckCount === 0) {
                            isStartCheckParams = true;
                            paramsCheckCount++;
                        } else if (isStartCheckParams) {
                            if (lineText.indexOf(';') === -1) {
                                wordspaceEditCode.insert(stateUri, new vscode.Position(indexState, 0), '    TabController tabController;\n    List<String> tabs=["Tab1","Tab2","Tab3"];\n');
                                isStartCheckParams = false;
                                isStartCheckClone = true;
                            }
                        } else if (isStartCheckClone) {
                            if (lineText.indexOf(';') !== -1) {
                                wordspaceEditCode.insert(stateUri, new vscode.Position(indexState, stateCode.lineAt(indexState).range.end.character - 1), '\n    ..tabController = tabController\n    ..tabs = tabs');
                                isStartCheckClone = false;
                                break;
                            }
                        }
                    }

                    let effectUri = vscode.Uri.parse(
                        selectItem?.description.replace('state.dart', 'effect.dart')
                    );
                    let effectCodePromise = vscode.workspace.openTextDocument(
                        effectUri
                    );
                    let effectCode = await effectCodePromise;
                    let isStartCheckCombineEffects = false;
                    let combineEffectsCount = 0;
                    wordspaceEditCode.insert(effectUri, new vscode.Position(0, 0), "import 'package:flutter/material.dart' hide Action;\nimport 'page.dart';\n");
                    for (let indexEffect = 0; indexEffect < effectCode.lineCount; indexEffect++) {
                        let lineText = effectCode.lineAt(indexEffect).text;
                        if (lineText.indexOf('combineEffects') !== -1 && combineEffectsCount === 0) {
                            if (lineText.indexOf('{') !== -1) {
                                wordspaceEditCode.insert(effectUri, new vscode.Position(indexEffect, effectCode.lineAt(indexEffect).range.end.character), '\n    Lifecycle.initState : _init,');
                            } else {
                                isStartCheckCombineEffects = true;
                            }
                            combineEffectsCount++;
                        } else if (isStartCheckCombineEffects) {
                            if (lineText.indexOf('{') !== -1) {
                                wordspaceEditCode.insert(effectUri, new vscode.Position(indexEffect, effectCode.lineAt(indexEffect).range.end.character), '\n    Lifecycle.initState : _init,');
                                isStartCheckCombineEffects = false;
                            }
                        }
                    }
                    let effectEnd = effectCode.lineAt(effectCode.lineCount - 1).range.end.character;
                    if (m !== null) {
                        wordspaceEditCode.insert(effectUri, new vscode.Position(effectCode.lineCount - 1, effectEnd), '\nvoid _init(Action action, Context<' + m[1] + '> ctx) {\n    final TickerProvider tickerProvider = ctx.stfState as StateWithTickerProvider;\n    ctx.state.tabController = TabController(length: ctx.state.tabs.length, vsync: tickerProvider);\n}');
                    }
                    vscode.workspace.applyEdit(wordspaceEditCode);

                }
            }
        });
}