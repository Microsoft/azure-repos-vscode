/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { workspace, window, languages, Disposable, Uri, HoverProvider, Hover, TextEditor, Position, TextDocument, Range, TextEditorDecorationType, WorkspaceEdit } from "vscode";
import { filterEvent } from "../util";

const scmInputUri = Uri.parse("scm:input");

function isSCMInput(uri: Uri) {
    return uri.toString() === scmInputUri.toString();
}

interface Diagnostic {
    range: Range;
    message: string;
}

export class CommitHoverProvider implements HoverProvider {

    private decorationType: TextEditorDecorationType;
    private diagnostics: Diagnostic[] = [];
    private disposables: Disposable[] = [];
    private editor: TextEditor;
    private visibleTextEditorsDisposable: Disposable;

    constructor() {
        this.visibleTextEditorsDisposable = window.onDidChangeVisibleTextEditors(this.onVisibleTextEditors, this);
        this.onVisibleTextEditors(window.visibleTextEditors);

        this.decorationType = window.createTextEditorDecorationType({
            isWholeLine: true,
            color: "rgb(228, 157, 43)",
            dark: {
                color: "rgb(220, 211, 71)"
            }
        });
    }

    public get message(): string | undefined {
        if (!this.editor) {
            return;
        }

        return this.editor.document.getText();
    }

    public set message(message: string | undefined) {
        if (!this.editor || message === undefined) {
            return;
        }

        const document = this.editor.document;
        const start = document.lineAt(0).range.start;
        const end = document.lineAt(document.lineCount - 1).range.end;
        const range = new Range(start, end);
        const edit = new WorkspaceEdit();
        edit.replace(scmInputUri, range, message);
        workspace.applyEdit(edit);
    }

    private onVisibleTextEditors(editors: TextEditor[]): void {
        const [editor] = editors.filter(e => isSCMInput(e.document.uri));

        if (!editor) {
            return;
        }

        this.visibleTextEditorsDisposable.dispose();
        this.editor = editor;

        const onDidChange = filterEvent(workspace.onDidChangeTextDocument, e => e.document && isSCMInput(e.document.uri));
        onDidChange(this.update, this, this.disposables);

        workspace.onDidChangeConfiguration(this.update, this, this.disposables);
        languages.registerHoverProvider({ scheme: "scm" }, this);
    }

    private update(): void {
        this.diagnostics = [];
        //TODO provide any diagnostic info based on the message here (see git commitcontroller)
        this.editor.setDecorations(this.decorationType, this.diagnostics.map(d => d.range));
    }

    /* Implement HoverProvider */
    provideHover(document: TextDocument, position: Position): Hover | undefined {
        const [decoration] = this.diagnostics.filter(d => d.range.contains(position));

        if (!decoration || !document) {
            return;
        }

        return new Hover(decoration.message, decoration.range);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
