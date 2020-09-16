import * as vscode from "vscode";

export function stringToUint8Array(str: String) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }

    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}

export function showError(info: string) {
    vscode.window.showErrorMessage(info);
}
/**
 * 弹出提示信息
 */
export function showInfo(info: string) {
    vscode.window.showInformationMessage(info);
}