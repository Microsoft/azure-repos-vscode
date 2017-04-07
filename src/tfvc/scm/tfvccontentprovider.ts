/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import { workspace, Uri, Disposable, Event, EventEmitter } from "vscode";
import { TfvcSCMProvider } from "../tfvcscmprovider";
import { TfvcRepository } from "../tfvcrepository";

export class TfvcContentProvider {
    private _tfvcRepository: TfvcRepository;
    private _rootPath: string;
    private _disposables: Disposable[] = [];

    private _onDidChangeEmitter = new EventEmitter<Uri>();
    get onDidChange(): Event<Uri> { return this._onDidChangeEmitter.event; }

    constructor(repository: TfvcRepository, rootPath: string, onTfvcChange: Event<Uri>) {
        this._tfvcRepository = repository;
        this._rootPath = rootPath;
        this._disposables.push(
            onTfvcChange(this.fireChangeEvents, this),
            workspace.registerTextDocumentContentProvider(TfvcSCMProvider.scmScheme, this)
        );
    }

    private fireChangeEvents(): void {
        //TODO need to understand why these events are needed and how the list of uris should be purged
        //     Currently firing these events creates an infinite loop
        //for (let uri of this.uris) {
        //    this.onDidChangeEmitter.fire(uri);
        //}
    }

    async provideTextDocumentContent(uri: Uri): Promise<string> {
        let path: string = uri.fsPath;
        const versionSpec: string = uri.query;

        if (versionSpec.toLowerCase() === "c0") {
            // Changeset 0 does not exist. This is most likely an Add, so just return empty contents
            return "";
        }

        // If path is a server path, we need to fix the format
        // First option is Windows, second is Mac
        if (path && (path.startsWith("\\$\\") || path.startsWith("/$/"))) {
            // convert "/$/proj/folder/file" to "$/proj/folder/file";
            path = uri.path.slice(1);
        }

        try {
            const contents: string = await this._tfvcRepository.GetFileContent(path, versionSpec);
            return contents;
        } catch (err) {
            return "";
        }
    }

    dispose(): void {
        if (this._disposables) {
            this._disposables.forEach((d) => d.dispose());
            this._disposables = [];
        }
    }
}
