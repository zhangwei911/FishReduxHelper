import * as vscode from 'vscode';

export class SelectItem implements vscode.QuickPickItem {
    constructor(label:string ,description?:string){
        this.label = label;
        this.description = description;
    }
    label: string;
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;

    toString():string {
        return `{label:${this.label},description:${this.description},detail:${this.detail},picked:${this.picked},alwaysShow:${this.alwaysShow}}`;
    }
}
