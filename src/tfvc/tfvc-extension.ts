/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as path from "path";
import { commands, Uri, window } from "vscode";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcContext } from "../contexts/tfvccontext";
import { ExtensionManager } from "../extensionmanager";
import { TfvcCommandNames, TfvcTelemetryEvents } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { UrlBuilder } from "../helpers/urlbuilder";
import { Utils } from "../helpers/utils";
import { VsCodeUtils } from "../helpers/vscodeutils";
import { IButtonMessageItem } from "../helpers/vscodeutils.interfaces";
import { Telemetry } from "../services/telemetry";
import { Resource } from "./scm/resource";
import { Status } from "./scm/status";
import { TfvcSCMProvider } from "./tfvcscmprovider";
import { TfvcErrorCodes } from "./tfvcerror";
import { TfvcRepository } from "./tfvcrepository";
import { UIHelper } from "./uihelper";
import { AutoResolveType, ICheckinInfo, IItemInfo, ISyncResults } from "./interfaces";
import { TfvcOutput } from "./tfvcoutput";

export class TfvcExtension  {
    private _repo: TfvcRepository;
    private _manager: ExtensionManager;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
    }

    public async Checkin(optionalCheckinInfo?: ICheckinInfo): Promise<void> {
        this.displayErrors(
            async () => {
                // get the checkin info from arguments or the SCM viewlet
                const checkinInfo: ICheckinInfo = optionalCheckinInfo || TfvcSCMProvider.GetCheckinInfo();
                if (!checkinInfo) {
                    window.showInformationMessage(Strings.NoChangesToCheckin);
                    return;
                }

                Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.CheckinExe : TfvcTelemetryEvents.CheckinClc);
                const changeset: string =
                    await this._repo.Checkin(checkinInfo.files, checkinInfo.comment, checkinInfo.workItemIds);
                TfvcOutput.AppendLine(`Changeset ${changeset} checked in.`);
                if (!optionalCheckinInfo) {
                    TfvcSCMProvider.ClearCheckinMessage();
                }
                TfvcSCMProvider.Refresh();
            },
            "Checkin");
    }

    /**
     * This command runs a delete command on the selected file.  It gets a Uri object from vscode.
     */
    public async Delete(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    const basename: string = path.basename(uri.fsPath);
                    try {
                        const message: string = `Are you sure you want to delete '${basename}'?`;
                        if (await UIHelper.PromptForConfirmation(message, Strings.DeleteFile)) {
                            Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.DeleteExe : TfvcTelemetryEvents.DeleteClc);
                            await this._repo.Delete([uri.fsPath]);
                        }
                    } catch (err) {
                        //Provide a better error message if the file to be deleted isn't in the workspace (e.g., it's a new file)
                        if (err.tfvcErrorCode && err.tfvcErrorCode === TfvcErrorCodes.FileNotInWorkspace) {
                            this._manager.DisplayErrorMessage(`Cannot delete '${basename}' as it is not in your workspace.`);
                        } else {
                            throw err;
                        }
                    }
                } else {
                    this._manager.DisplayWarningMessage(Strings.CommandRequiresExplorerContext);
                }
            },
            "Delete");
    }

    public async Exclude(resources?: Resource[]): Promise<void> {
        this.displayErrors(
            async () => {
                if (resources && resources.length > 0) {
                    //Keep an in-memory list of items that were explicitly excluded. The list is not persisted at this time.
                    const paths: string[] = [];
                    resources.forEach((resource) => {
                        paths.push(resource.resourceUri.fsPath);
                    });
                    await TfvcSCMProvider.Exclude(paths);
                }
            },
            "Exclude");
    }

    public async Include(resources?: Resource[]): Promise<void> {
        this.displayErrors(
            async () => {
                if (resources && resources.length > 0) {
                    const pathsToUnexclude: string[] = [];
                    const pathsToAdd: string[] = [];
                    const pathsToDelete: string[] = [];
                    resources.forEach((resource) => {
                        const path: string = resource.resourceUri.fsPath;
                        //Unexclude each file passed in
                        pathsToUnexclude.push(path);
                        //At this point, an unversioned file could be a candidate file, so call Add.
                        //Once it is added, it should be a Pending change.
                        if (!resource.IsVersioned) {
                            pathsToAdd.push(path);
                        }
                        //If a file is a candidate change and has been deleted (e.g., outside of
                        //the TFVC command), we need to ensure that it gets 'tf delete' run on it.
                        if (resource.PendingChange.isCandidate && resource.HasStatus(Status.DELETE)) {
                            pathsToDelete.push(path);
                        }
                    });

                    //If we need to add files, run a single Add with those files
                    if (pathsToAdd.length > 0) {
                        Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.AddExe : TfvcTelemetryEvents.AddClc);
                        await this._repo.Add(pathsToAdd);
                    }
                    //If we need to delete files, run a single Delete with those files
                    if (pathsToDelete.length > 0) {
                        Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.DeleteExe : TfvcTelemetryEvents.DeleteClc);
                        await this._repo.Delete(pathsToDelete);
                    }

                    //Otherwise, ensure its not in the explicitly excluded list (if it's already there)
                    //Unexclude doesn't explicitly INclude.  It defers to the status of the individual item.
                    await TfvcSCMProvider.Unexclude(pathsToUnexclude);
                }
            },
            "Include");
    }

    /**
     * This is the default action when an resource is clicked in the viewlet.
     * For ADD, AND UNDELETE just show the local file.
     * For DELETE just show the server file.
     * For EDIT AND RENAME show the diff window (server on left, local on right).
     */
    public async Open(resource?: Resource): Promise<void> {
        this.displayErrors(
            async () => {
                if (resource) {
                    const left: Uri = TfvcSCMProvider.GetLeftResource(resource);
                    const right: Uri = TfvcSCMProvider.GetRightResource(resource);
                    const title: string = resource.GetTitle();

                    if (!right) {
                        // TODO
                        console.error("oh no");
                        return;
                    }

                    if (!left) {
                        return await commands.executeCommand<void>("vscode.open", right);
                    }

                    return await commands.executeCommand<void>("vscode.diff", left, right, title);
                }
            },
            "Open");
    }

    public async OpenDiff(resource?: Resource): Promise<void> {
        this.displayErrors(
            async () => {
                if (resource) {
                    return await TfvcSCMProvider.OpenDiff(resource);
                }
            },
            "OpenDiff");
    }

    public async OpenFile(resource?: Resource): Promise<void> {
        this.displayErrors(
            async () => {
                if (resource) {
                    return await commands.executeCommand<void>("vscode.open", resource.resourceUri);
                }
            },
            "OpenFile");
    }

    public async Refresh(): Promise<void> {
        this.displayErrors(
            async () => {
                await TfvcSCMProvider.Refresh();
            },
            "Refresh");
    }

    /**
     * This command runs a rename command on the selected file.  It gets a Uri object from vscode.
     */
    public async Rename(uri?: Uri): Promise<void> {
        this.displayErrors(
            async () => {
                if (uri) {
                    const basename: string = path.basename(uri.fsPath);
                    const newFilename: string = await window.showInputBox({ value: basename, prompt: Strings.RenamePrompt, placeHolder: undefined, password: false });
                    if (newFilename && newFilename !== basename) {
                        const dirName: string = path.dirname(uri.fsPath);
                        const destination: string = path.join(dirName, newFilename);

                        try {
                            Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.RenameExe : TfvcTelemetryEvents.RenameClc);
                            await this._repo.Rename(uri.fsPath, destination);
                        } catch (err) {
                            //Provide a better error message if the file to be renamed isn't in the workspace (e.g., it's a new file)
                            if (err.tfvcErrorCode && err.tfvcErrorCode === TfvcErrorCodes.FileNotInWorkspace) {
                                this._manager.DisplayErrorMessage(`Cannot rename '${basename}' as it is not in your workspace.`);
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

    public async Resolve(resource: Resource, autoResolveType: AutoResolveType): Promise<void> {
        this.displayErrors(
            async () => {
                if (resource) {
                    const localPath: string = resource.resourceUri.fsPath;
                    const resolveTypeString: string = UIHelper.GetDisplayTextForAutoResolveType(autoResolveType);
                    const basename: string = path.basename(localPath);
                    const message: string = `Are you sure you want to resolve changes in '${basename}' as ${resolveTypeString}?`;
                    if (await UIHelper.PromptForConfirmation(message, resolveTypeString)) {
                        Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.ResolveConflictsExe : TfvcTelemetryEvents.ResolveConflictsClc);
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
     * This command runs a 'tf get' command on the VSCode workspace folder and
     * displays the results to the user.
     */
    public async Sync(): Promise<void> {
        this.displayErrors(
            async () => {
                Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.SyncExe : TfvcTelemetryEvents.SyncClc);
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
    public async Undo(resources?: Resource[]): Promise<void> {
        this.displayErrors(
            async () => {
                if (resources) {
                    const pathsToUndo: string[] = [];
                    resources.forEach((resource) => {
                        pathsToUndo.push(resource.resourceUri.fsPath);
                    });
                    //When calling from UI, we have the uri of the resource from which the command was invoked
                    if (pathsToUndo.length > 0) {
                        const basename: string = path.basename(pathsToUndo[0]);
                        let message: string = `Are you sure you want to undo changes to '${basename}'?`;
                        if (pathsToUndo.length > 1) {
                            message = `Are you sure you want to undo changes to ${pathsToUndo.length.toString()} files?`;
                        }
                        if (await UIHelper.PromptForConfirmation(message, Strings.UndoChanges)) {
                            Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.UndoExe : TfvcTelemetryEvents.UndoClc);
                            await this._repo.Undo(pathsToUndo);
                        }
                    }
                }
            },
            "Undo");
    }

    /**
     * This command runs an undo command on all of the currently open files in the VSCode workspace folder
     * If the undo command applies to the file, the pending changes will be undone.  The
     * file system watcher will update the UI soon thereafter.  No results are displayed to the user.
     */
    public async UndoAll(): Promise<void> {
        this.displayErrors(
            async () => {
                if (TfvcSCMProvider.HasItems()) {
                    const message: string = `Are you sure you want to undo all changes?`;
                    if (await UIHelper.PromptForConfirmation(message, Strings.UndoChanges)) {
                        Telemetry.SendEvent(this._repo.IsExe ? TfvcTelemetryEvents.UndoAllExe : TfvcTelemetryEvents.UndoAllClc);
                        await this._repo.Undo(["*"]);
                    }
                } else {
                    window.showInformationMessage(Strings.NoChangesToUndo);
                    return;
                }
            },
            "UndoAll");
    }

    /**
     * This command runs the info command on the passed in itemPath and
     * opens a web browser to the appropriate history page.
     */
    public async ViewHistory(): Promise<void> {
        //Since this command provides Team Services functionality, we need
        //to ensure it is initialized for Team Services
        if (!this._manager.EnsureInitialized(RepositoryType.TFVC)) {
            this._manager.DisplayErrorMessage();
            return;
        }

        try {
            let itemPath: string;
            const editor = window.activeTextEditor;
            //Get the path to the file open in the VSCode editor (if any)
            if (editor) {
                itemPath = editor.document.fileName;
            }
            if (!itemPath) {
                //If no file open in editor, just display the history url of the entire repo
                this.showRepositoryHistory();
                return;
            }

            const itemInfos: IItemInfo[] = await this._repo.GetInfo([itemPath]);
            //With a single file, show that file's history
            if (itemInfos && itemInfos.length === 1) {
                Telemetry.SendEvent(TfvcTelemetryEvents.OpenFileHistory);
                const serverPath: string = itemInfos[0].serverItem;
                const file: string = encodeURIComponent(serverPath);
                let historyUrl: string = UrlBuilder.Join(this._manager.RepoContext.RemoteUrl, "_versionControl");
                historyUrl = UrlBuilder.AddQueryParams(historyUrl, `path=${file}`, `_a=history`);
                Utils.OpenUrl(historyUrl);
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
        if (!this._manager.EnsureInitializedForTFVC()) {
            this._manager.DisplayErrorMessage();
            return;
        }
        //This occurs in the case where we 1) sign in successfully, 2) sign out, 3) sign back in but with invalid credentials
        //Essentially, the tfvcExtension.InitializeClients call hasn't been made successfully yet.
        if (!this._repo) {
            this._manager.DisplayErrorMessage(Strings.UserMustSignIn);
            return;
        }

        try {
            await funcToTry(prefix);
        } catch (err) {
            let messageOptions: IButtonMessageItem[] = [];
            TfvcOutput.AppendLine(Utils.FormatMessage(`[${prefix}] ${err.message}`));
            //If we also have text in err.stdout, provide that to the output channel
            if (err.stdout) { //TODO: perhaps just for 'Checkin'? Or the CLC?
                TfvcOutput.AppendLine(Utils.FormatMessage(`[${prefix}] ${err.stdout}`));
            }
            //If an exception provides its own messageOptions, use them
            if (err.messageOptions && err.messageOptions.length > 0) {
                messageOptions = err.messageOptions;
            } else {
                messageOptions.push({ title : Strings.ShowTfvcOutput, command: TfvcCommandNames.ShowOutput });
            }
            VsCodeUtils.ShowErrorMessage(err.message, ...messageOptions);
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
        let historyUrl: string = UrlBuilder.Join(this._manager.RepoContext.RemoteUrl, "_versionControl");
        historyUrl = UrlBuilder.AddQueryParams(historyUrl, `_a=history`);
        Utils.OpenUrl(historyUrl);
    }

    dispose() {
        // nothing to dispose
    }
}
