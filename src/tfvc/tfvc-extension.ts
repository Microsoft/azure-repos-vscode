/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as path from "path";
import url = require("url");
import { commands, Uri, window, workspace } from "vscode";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcContext } from "../contexts/tfvccontext";
import { ExtensionManager } from "../extensionmanager";
import { TfvcCommandNames, TfvcTelemetryEvents } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { ButtonMessageItem, VsCodeUtils } from "../helpers/vscodeutils";
import { Telemetry } from "../services/telemetry";
import { Resource } from "./scm/resource";
import { TfvcSCMProvider } from "./tfvcscmprovider";
import { TfvcErrorCodes } from "./tfvcerror";
import { TfvcRepository } from "./tfvcrepository";
import { UIHelper } from "./uihelper";
import { AutoResolveType, ICheckinInfo, IItemInfo, IPendingChange, ISyncResults } from "./interfaces";
import { TfvcOutput } from "./tfvcoutput";

export class TfvcExtension  {
    private _repo: TfvcRepository;
    private _manager: ExtensionManager;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
    }

    public async Checkin(): Promise<void> {
        this.displayErrors(
            async () => {
                // get the checkin info from the SCM viewlet
                const checkinInfo: ICheckinInfo = TfvcSCMProvider.GetCheckinInfo();
                if (!checkinInfo) {
                    window.showInformationMessage(Strings.NoChangesToCheckin);
                    return;
                }

                Telemetry.SendEvent(TfvcTelemetryEvents.Checkin);
                const changeset: string =
                    await this._repo.Checkin(checkinInfo.files, checkinInfo.comment, checkinInfo.workItemIds);
                TfvcOutput.AppendLine("Changeset " + changeset + " checked in.");
                TfvcSCMProvider.ClearCheckinMessage();
                TfvcSCMProvider.Refresh();
            },
            "Checkin");
    }

    public async Exclude(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    //Keep an in-memory list of items that were explicitly excluded. The list is not persisted at this time.
                    await TfvcSCMProvider.Exclude(TfvcSCMProvider.GetPathFromUri(uri));
                }
            },
            "Exclude");
    }

    public async Include(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    let resource: Resource = TfvcSCMProvider.ResolveTfvcResource(uri);
                    let path: string = TfvcSCMProvider.GetPathFromUri(uri);

                    //At this point, an unversioned file could be a candidate file, so call Add.  Once it is added, it should be a Pending change.
                    if (!resource.IsVersioned) {
                        //We decided not to send telemetry on file operations
                        await this._repo.Add([path]);
                        //Don't return after adding, we may still need to unexclude it (it may have been excluded previously)
                    }

                    //Otherwise, ensure its not in the explicitly excluded list (if it's already there)
                    //Unexclude doesn't explicitly INclude.  It defers to the status of the individual item.
                    await TfvcSCMProvider.Unexclude(path);
                }
            },
            "Include");
    }

    public async OpenDiff(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    let resource: Resource = TfvcSCMProvider.ResolveTfvcResource(uri);
                    TfvcSCMProvider.OpenDiff(resource);
                }
            },
            "OpenDiff");
    }

    public async OpenFile(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    let path: string = TfvcSCMProvider.GetPathFromUri(uri);
                    await window.showTextDocument(await workspace.openTextDocument(path));
                }
            },
            "OpenFile");
    }

    public async Refresh(): Promise<void> {
        this.displayErrors(
            async () => {
                TfvcSCMProvider.Refresh();
            },
            "Refresh");
    }

    /**
     * This command runs a rename command on the selected file.
     */
    public async Rename(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    let basename: string = path.basename(uri.fsPath);
                    let newFilename: string = await window.showInputBox({ value: basename, prompt: Strings.RenamePrompt, placeHolder: undefined, password: false });
                    if (newFilename && newFilename !== basename) {
                        let dirName: string = path.dirname(uri.fsPath);
                        let destination: string = path.join(dirName, newFilename);

                        try {
                            //We decided not to send telemetry on file operations
                            await this._repo.Rename(uri.fsPath, destination);
                        } catch (err) {
                            //Provide a better error message if the file to be renamed isn't in the workspace (e.g., it's a new file)
                            if (err.tfvcErrorCode && err.tfvcErrorCode === TfvcErrorCodes.FileNotInWorkspace) {
                                this._manager.DisplayErrorMessage(`Cannot rename ${basename} as it is not in your workspace.`);
                            } else {
                                throw err;
                            }
                        }
                    }
                } else {
                    this._manager.DisplayWarningMessage(Strings.CommandRequiresExplorerContext);
                }
            },
            "Rename");
    }

    public async Resolve(uri: Uri, autoResolveType: AutoResolveType): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    let localPath: string = TfvcSCMProvider.GetPathFromUri(uri);
                    const resolveTypeString: string = UIHelper.GetDisplayTextForAutoResolveType(autoResolveType);
                    const basename: string = path.basename(localPath);
                    const message: string = `Are you sure you want to resolve changes in ${basename} as ${resolveTypeString}?`;
                    if (await UIHelper.PromptForConfirmation(message, resolveTypeString)) {
                        await this._repo.ResolveConflicts([localPath], autoResolveType);
                        TfvcSCMProvider.Refresh();
                    }
                } else {
                    this._manager.DisplayWarningMessage(Strings.CommandRequiresFileContext);
                }
            },
            "Resolve");
    }

    public async ShowOutput(): Promise<void> {
        TfvcOutput.Show();
    }

    /**
     * This command runs a status command on the VSCode workspace folder and 
     * displays the results to the user. Selecting one of the files in the list will 
     * open the file in the editor.
     */
    public async Status(): Promise<void> {
        this.displayErrors(
            async () => {
                Telemetry.SendEvent(TfvcTelemetryEvents.Status);
                const chosenItem: IPendingChange = await UIHelper.ChoosePendingChange(await this._repo.GetStatus());
                if (chosenItem) {
                    window.showTextDocument(await workspace.openTextDocument(chosenItem.localItem));
                }
            },
            "Status");
    }

    /**
     * This command runs a 'tf get' command on the VSCode workspace folder and 
     * displays the results to the user.
     */
    public async Sync(): Promise<void> {
        this.displayErrors(
            async () => {
                Telemetry.SendEvent(TfvcTelemetryEvents.Sync);
                const results: ISyncResults = await this._repo.Sync([this._repo.Path], true);
                await UIHelper.ShowSyncResults(results, results.hasConflicts || results.hasErrors, true);
            },
            "Sync");
    }

    /**
     * This command runs an undo command on the currently open file in the VSCode workspace folder and 
     * editor.  If the undo command applies to the file, the pending changes will be undone.  The 
     * file system watcher will update the UI soon thereafter.  No results are displayed to the user.
     */
    public async Undo(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                //When calling from UI, we have the uri of the resource from which the command was invoked
                let pathToUndo: string = TfvcSCMProvider.GetPathFromUri(uri);
                if (pathToUndo) {
                    const basename: string = path.basename(pathToUndo);
                    const message: string = `Are you sure you want to undo changes to ${basename}?`;
                    if (await UIHelper.PromptForConfirmation(message, Strings.UndoChanges)) {
                        //We decided not to send telemetry on file operations
                        await this._repo.Undo([pathToUndo]);
                    }
                }
            },
            "Undo");
    }

    /**
     * This command runs the info command on the passed in itemPath and
     * opens a web browser to the appropriate history page.
     */
    public async ViewHistory(): Promise<void> {
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
                Telemetry.SendEvent(TfvcTelemetryEvents.OpenFileHistory);
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

    private async displayErrors(funcToTry: (prefix) => Promise<void>, prefix: string): Promise<void> {
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            await funcToTry(prefix);
        } catch (err) {
            TfvcOutput.AppendLine(VsCodeUtils.FormatMessage(`[${prefix}] ${err.message}`));
            //If we also have text in err.stdout, provide that to the output channel
            if (err.stdout) { //TODO: perhaps just for 'Checkin'? Or the CLC?
                TfvcOutput.AppendLine(VsCodeUtils.FormatMessage(`[${prefix}] ${err.stdout}`));
            }
            let messageItem : ButtonMessageItem = { title : Strings.ShowTfvcOutput, command: TfvcCommandNames.ShowOutput };
            VsCodeUtils.ShowErrorMessageWithOptions(err.message, messageItem).then((item) => {
                if (item) {
                    commands.executeCommand<void>(item.command);
                }
            });
        }
    }

    public async InitializeClients(repoType: RepositoryType): Promise<void> {
        //We only need to initialize for Tfvc repositories
        if (repoType !== RepositoryType.TFVC) {
            return;
        }

        const tfvcContext: TfvcContext = <TfvcContext>this._manager.RepoContext;
        this._repo = tfvcContext.TfvcRepository;
    }

    private showRepositoryHistory(): void {
        Telemetry.SendEvent(TfvcTelemetryEvents.OpenRepositoryHistory);
        Utils.OpenUrl(url.resolve(this._manager.RepoContext.RemoteUrl, "_versionControl?_a=history"));
    }

    dispose() {
        // nothing to dispose
    }
}
