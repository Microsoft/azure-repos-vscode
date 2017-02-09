/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import url = require("url");
import { TextEditor, window, workspace } from "vscode";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcContext } from "../contexts/tfvccontext";
import { ExtensionManager } from "../extensionmanager";
import { TfvcTelemetryEvents } from "../helpers/constants";
import { Utils } from "../helpers/utils";
import { Tfvc } from "./tfvc";
import { TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { UIHelper } from "./uihelper";
import { IItemInfo, IPendingChange } from "./interfaces";
import { TfvcOutput } from "./tfvcoutput";

export class TfvcExtension  {
    private _tfvc: Tfvc;
    private _repo: Repository;
    private _manager: ExtensionManager;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
    }

    public async TfvcCheckin(): Promise<void> {
        //
    }

    public async TfvcExclude(): Promise<void> {
        //
    }

    public async TfvcExcludeAll(): Promise<void> {
        //
    }

    public async TfvcInclude(): Promise<void> {
        //
    }

    public async TfvcIncludeAll(): Promise<void> {
        //
    }

    public async TfvcShowOutput(): Promise<void> {
        TfvcOutput.Show();
    }

    /**
     * This command runs a status command on the VSCode workspace folder and 
     * displays the results to the user. Selecting one of the files in the list will 
     * open the file in the editor.
     */
    public async TfvcStatus(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.Status);
            const chosenItem: IPendingChange = await UIHelper.ChoosePendingChange(await this._repo.GetStatus());
            if (chosenItem) {
                window.showTextDocument(await workspace.openTextDocument(chosenItem.localItem));
            }
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    /**
     * This command runs an undo command on the currently open file in the VSCode workspace folder and 
     * editor.  If the undo command applies to the file, the pending changes will be undone.  The 
     * file system watcher will update the UI soon thereafter.  No results are displayed to the user.
     */
    public async TfvcUndo(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.Undo);
            //TODO: When calling from UI, UI will need to call repository.Undo([filePath]);
            let editor: TextEditor = window.activeTextEditor;
            if (editor) {
                await this._repo.Undo([editor.document.fileName]);
            }
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    /**
     * This command runs the info command on the passed in itemPath and
     * opens a web browser to the appropriate history page.
     */
    public async TfvcViewHistory(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            let itemPath: string;
            let editor = window.activeTextEditor;
            //Get the path to the file open in the VSCode editor (if any)
            if (editor) {
                itemPath = editor.document.fileName;
            }
            if (!itemPath) {
                //If no file open in editor, just display the history url of the entire repo
                this.showRepositoryHistory();
                return;
            }

            let itemInfos: IItemInfo[] = await this._repo.GetInfo([itemPath]);
            //With a single file, show that file's history
            if (itemInfos && itemInfos.length === 1) {
                this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.OpenFileHistory);
                let serverPath: string = itemInfos[0].serverItem;
                let file: string = encodeURIComponent(serverPath);
                Utils.OpenUrl(url.resolve(this._manager.RepoContext.RemoteUrl, "_versionControl?path=" + file + "&_a=history"));
                return;
            } else {
                //If the file is in the workspace folder (but not mapped), just display the history url of the entire repo
                this.showRepositoryHistory();
            }
        } catch (err) {
            if (err.tfvcErrorCode && err.tfvcErrorCode === TfvcErrorCodes.FileNotInMappings) {
                //If file open in editor is not in the mappings, just display the history url of the entire repo
                this.showRepositoryHistory();
            } else {
                this._manager.DisplayErrorMessage(err.message);
            }
        }
    }

    public async InitializeClients(repoType: RepositoryType): Promise<void> {
        //We only need to initialize for Tfvc repositories
        if (repoType !== RepositoryType.TFVC) {
            return;
        }

        const tfvcContext: TfvcContext = <TfvcContext>this._manager.RepoContext;
        this._tfvc = tfvcContext.Tfvc;
        this._repo = tfvcContext.TfvcRepository;
    }

    private showRepositoryHistory(): void {
        this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.OpenRepositoryHistory);
        Utils.OpenUrl(url.resolve(this._manager.RepoContext.RemoteUrl, "_versionControl?_a=history"));
    }

    dispose() {
        // nothing to dispose
    }
}
