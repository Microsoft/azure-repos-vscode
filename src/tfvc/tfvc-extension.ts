/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { window, workspace } from "vscode";
import { RepositoryType } from "../contexts/repositorycontext";
import { ExtensionManager } from "../extensionmanager";
import { TfvcTelemetryEvents } from "../helpers/constants";
import { Tfvc } from "./tfvc";
import { Repository } from "./repository";
import { UIHelper } from "./uihelper";
import { IPendingChange } from "./interfaces";

export class TfvcExtension  {
    private _tfvc: Tfvc;
    private _repo: Repository;
    private _manager: ExtensionManager;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
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

    public async InitializeClients(repoType: RepositoryType): Promise<void> {
        //We only need to initialize for Tfvc repositories
        if (repoType !== RepositoryType.TFVC) {
            return;
        }

        this._tfvc = new Tfvc();
        this._repo = this._tfvc.Open(this._manager.ServerContext, workspace.rootPath);

        let version: string = "unknown";
        try {
            version = await this._repo.CheckVersion();
        } catch (err) {
            this._manager.DisplayWarningMessage(err.message);
        }

        const outputChannel = window.createOutputChannel("TFVC");
        outputChannel.appendLine("Using TFVC command line: " + this._tfvc.Location + " (" + version + ")");
        this._tfvc.onOutput(line => outputChannel.append(line)); //TODO add disposable to unhook event
    }

    dispose() {
        // nothing to dispose
    }
}
