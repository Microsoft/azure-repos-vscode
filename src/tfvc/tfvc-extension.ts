/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as path from "path";
import url = require("url");
import { Uri, window, workspace } from "vscode";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcContext } from "../contexts/tfvccontext";
import { ExtensionManager } from "../extensionmanager";
import { TfvcTelemetryEvents } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { Tfvc } from "./tfvc";
import { Resource } from "./scm/resource";
import { TfvcSCMProvider } from "./tfvcscmprovider";
import { TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { UIHelper } from "./uihelper";
import { ICheckinInfo, IItemInfo, IPendingChange, ISyncResults } from "./interfaces";
import { TfvcOutput } from "./tfvcoutput";

export class TfvcExtension  {
    private _tfvc: Tfvc;
    private _repo: Repository;
    private _manager: ExtensionManager;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
    }

    public async TfvcCheckin(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            // get the checkin info from the SCM viewlet
            const checkinInfo: ICheckinInfo = TfvcSCMProvider.GetCheckinInfo();
            if (!checkinInfo) {
                window.showInformationMessage(Strings.NoChangesToCheckin);
                return;
            }

            this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.Checkin);
            const changeset: string =
                await this._repo.Checkin(checkinInfo.files, checkinInfo.comment, checkinInfo.workItemIds);
            TfvcOutput.AppendLine("Changeset " + changeset + " checked in.");
            TfvcSCMProvider.ClearCheckinMessage();
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    public async TfvcExclude(uri?: Uri): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        if (uri) {
            //Keep an in-memory list of items that were explicitly excluded. The list is not persisted at this time.
            await TfvcSCMProvider.Exclude(TfvcSCMProvider.GetPathFromUri(uri));
        }
    }

    public async TfvcInclude(uri?: Uri): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        if (uri) {
            let resource: Resource = TfvcSCMProvider.ResolveTfvcResource(uri);
            let path: string = TfvcSCMProvider.GetPathFromUri(uri);

            //At this point, an unversioned file could be a candidate file, so call Add.  Once it is added, it should be a Pending change.
            if (!resource.IsVersioned) {
                await this._repo.Add([path]);
                //Don't return after adding, we may still need to unexclude it (it may have been excluded previously)
            }

            //Otherwise, ensure its not in the explicitly excluded list (if it's already there)
            //Unexclude doesn't explicitly INclude.  It defers to the status of the individual item.
            await TfvcSCMProvider.Unexclude(path);
        }
    }

    public async TfvcOpenDiff(uri?: Uri): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            if (uri) {
                let resource: Resource = TfvcSCMProvider.ResolveTfvcResource(uri);
                TfvcSCMProvider.OpenDiff(resource);
            }
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    public async TfvcOpenFile(uri?: Uri): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            if (uri) {
                let path: string = TfvcSCMProvider.GetPathFromUri(uri);
                await window.showTextDocument(await workspace.openTextDocument(path));
            }
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    public async TfvcRefresh(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            TfvcSCMProvider.Refresh();
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
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
     * This command runs a 'tf get' command on the VSCode workspace folder and 
     * displays the results to the user.
     */
    public async TfvcSync(): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.Sync);
            const results: ISyncResults = await this._repo.Sync([this._repo.Path], true);
            await UIHelper.ShowSyncResults(results, results.hasConflicts || results.hasErrors, true);
        } catch (err) {
            this._manager.DisplayErrorMessage(err.message);
        }
    }

    /**
     * This command runs an undo command on the currently open file in the VSCode workspace folder and 
     * editor.  If the undo command applies to the file, the pending changes will be undone.  The 
     * file system watcher will update the UI soon thereafter.  No results are displayed to the user.
     */
    public async TfvcUndo(uri?: Uri): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            //When calling from UI, we have the uri of the resource from which the command was invoked
            let pathToUndo: string = TfvcSCMProvider.GetPathFromUri(uri);
            if (!pathToUndo) {
                //This is called from the command palette, so check for an open file in the editor
                if (window.activeTextEditor) {
                    pathToUndo = window.activeTextEditor.document.fileName;
                }
            }
            if (pathToUndo) {
                const basename: string = path.basename(pathToUndo);
                const message: string = `Are you sure you want to undo changes in ${basename}?`;
                //TODO: use Modal api once vscode.d.ts exposes it (currently proposed)
                const pick: string = await window.showWarningMessage(message, /*{ modal: true },*/ Strings.UndoChanges);
                if (pick !== Strings.UndoChanges) {
                    return;
                }

                this._manager.Telemetry.SendEvent(TfvcTelemetryEvents.Undo);
                await this._repo.Undo([pathToUndo]);
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
