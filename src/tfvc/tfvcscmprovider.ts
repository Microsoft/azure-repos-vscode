/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Logger } from "../helpers/logger";
import { TfvcCommandNames } from "../helpers/constants";
import { commands, scm, Uri, Disposable, SourceControl, SourceControlResourceGroup, Event, workspace } from "vscode";
import { CommitHoverProvider } from "./scm/commithoverprovider";
import { Model } from "./scm/model";
import { Status } from "./scm/status";
import { Resource } from "./scm/resource";
import { TfvcContext } from "../contexts/tfvccontext";
import { anyEvent, filterEvent, mapEvent } from "./util";
import { ExtensionManager } from "../extensionmanager";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcOutput } from "./tfvcoutput";
import { TfvcContentProvider } from "./scm/tfvccontentprovider";
import { TfvcError } from "./tfvcerror";
import { ICheckinInfo } from "./interfaces";

/**
 * This class provides the SCM implementation for TFVC.
 * Note: to switch SCM providers you must do the following:
 *      F1 -> SCM: Enable SCM Preview
 *      F1 -> SCM: Switch SCM Provider -> Choose TFVC from the pick list
 */
export class TfvcSCMProvider {
    public static scmScheme: string = "tfvc";
    private static instance: TfvcSCMProvider = undefined;

    private _extensionManager: ExtensionManager;
    private _model: Model;
    private _disposables: Disposable[] = [];
    private _tempDisposables: Disposable[] = [];
    private _sourceControl: SourceControl;

    constructor(extensionManager: ExtensionManager) {
        this._extensionManager = extensionManager;
    }

    /* Static helper methods */
    public static ClearCheckinMessage(): void {
        scm.inputBox.value = "";
    }

    public static GetCheckinInfo(): ICheckinInfo {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.getProviderInstance();

        try {
            const files: string[] = [];
            const commitMessage: string = scm.inputBox.value;
            const workItemIds: number[] = TfvcSCMProvider.getWorkItemIdsFromMessage(commitMessage);

            const resources: Resource[] = tfvcProvider._model.IncludedGroup.resources;
            if (!resources || resources.length === 0) {
                return undefined;
            }

            for (let i: number = 0; i < resources.length; i++) {
                files.push(resources[i].PendingChange.localItem);
            }

            return {
                files: files,
                comment: commitMessage,
                workItemIds: workItemIds
            };
        } catch (err) {
            Logger.LogDebug("Failed to GetCheckinInfo. Details: " + err.message);
            throw TfvcError.CreateUnknownError(err);
        }
    }

    private static getWorkItemIdsFromMessage(message: string) {
        const ids: number[] = [];
        try {
            // Find all the work item mentions in the string.
            // This returns an array like: ["#1", "#12", "#33"]
            const matches: string[] = message ? message.match(/#(\d+)/gm) : [];
            if (matches) {
                for (let i: number = 0; i < matches.length; i++) {
                    const id: number = parseInt(matches[i].slice(1));
                    if (!isNaN(id)) {
                        ids.push(id);
                    }
                }
            }
        } catch (err) {
            Logger.LogDebug("Failed to get all workitems from message: " + message);
        }
        return ids;
    }

    public static async Exclude(paths: string[]): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.getProviderInstance();

        await tfvcProvider._model.Exclude(paths);
    };

    public static async Refresh(): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.getProviderInstance();

        await tfvcProvider._model.Refresh();
    };

    public static async Unexclude(paths: string[]): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.getProviderInstance();

        await tfvcProvider._model.Unexclude(paths);
    };

    /* Public methods */

    private conflictsGroup: SourceControlResourceGroup;
    private includedGroup: SourceControlResourceGroup;
    private excludedGroup: SourceControlResourceGroup;
    public async Initialize(): Promise<void> {
        await TfvcOutput.CreateChannel(this._disposables);
        await this.setup();

        // Now that everything is setup, we can register the provider and set up our singleton instance
        // This registration can only happen once
        TfvcSCMProvider.instance = this;
        this._sourceControl = scm.createSourceControl(TfvcSCMProvider.scmScheme, "TFVC");
        this._disposables.push(this._sourceControl);

        this.conflictsGroup = this._sourceControl.createResourceGroup(this._model.ConflictsGroup.id, this._model.ConflictsGroup.label);
        this.includedGroup = this._sourceControl.createResourceGroup(this._model.IncludedGroup.id, this._model.IncludedGroup.label);
        this.excludedGroup = this._sourceControl.createResourceGroup(this._model.ExcludedGroup.id, this._model.ExcludedGroup.label);
        this.conflictsGroup.hideWhenEmpty = true;

        //Set the command to run when user accepts changes via Ctrl+Enter in input box.
        this._sourceControl.acceptInputCommand = { command: TfvcCommandNames.Checkin, title: "Checkin" };

        this._disposables.push(this.conflictsGroup);
        this._disposables.push(this.includedGroup);
        this._disposables.push(this.excludedGroup);
    }

    private onDidModelChange(): void {
        if (!this.conflictsGroup) {
            return;
        }

        this.conflictsGroup.resourceStates = this._model.ConflictsGroup.resources;
        this.includedGroup.resourceStates = this._model.IncludedGroup.resources;
        this.excludedGroup.resourceStates = this._model.ExcludedGroup.resources;
        this._sourceControl.count = this.count;
    }

    public async Reinitialize(): Promise<void> {
        this.cleanup();
        await this.setup();
    }

    private async setup(): Promise<void> {
        const rootPath = workspace.rootPath;
        if (!rootPath) {
            // no root means no need for an scm provider
            return;
        }

        // Check if this is a TFVC repository
        if (!this._extensionManager.RepoContext
            || this._extensionManager.RepoContext.Type !== RepositoryType.TFVC
            || this._extensionManager.RepoContext.IsTeamFoundation === false) {
            // We don't have a TFVC context, so don't load the provider
            return;
        }

        const repoContext: TfvcContext = <TfvcContext>this._extensionManager.RepoContext;
        const fsWatcher = workspace.createFileSystemWatcher("**");
        const onWorkspaceChange = anyEvent(fsWatcher.onDidChange, fsWatcher.onDidCreate, fsWatcher.onDidDelete);
        const onTfvcChange = filterEvent(onWorkspaceChange, (uri) => /^\$tf\//.test(workspace.asRelativePath(uri)));
        this._model = new Model(repoContext.RepoFolder, repoContext.TfvcRepository, onWorkspaceChange);
        // Hook up the model change event to trigger our own event
        this._disposables.push(this._model.onDidChange(this.onDidModelChange, this));

        let version: string = "unknown";
        try {
            version = await repoContext.TfvcRepository.CheckVersion();
        } catch (err) {
            this._extensionManager.DisplayWarningMessage(err.message);
        }
        TfvcOutput.AppendLine("Using TFVC command line: " + repoContext.TfvcRepository.TfvcLocation + " (" + version + ")");

        const commitHoverProvider: CommitHoverProvider = new CommitHoverProvider();
        const contentProvider: TfvcContentProvider = new TfvcContentProvider(repoContext.TfvcRepository, rootPath, onTfvcChange);
        //const checkoutStatusBar = new CheckoutStatusBar(model);
        //const syncStatusBar = new SyncStatusBar(model);
        //const autoFetcher = new AutoFetcher(model);
        //const mergeDecorator = new MergeDecorator(model);

        this._tempDisposables.push(
            commitHoverProvider,
            contentProvider,
            fsWatcher
            //checkoutStatusBar,
            //syncStatusBar,
            //autoFetcher,
            //mergeDecorator
        );

        // Refresh the model now that we are done setting up
        await this._model.Refresh();
    }

    private cleanup() {
        // dispose all the temporary items
        if (this._tempDisposables) {
            this._tempDisposables.forEach((d) => d.dispose());
            this._tempDisposables = [];
        }

        // dispose of the model
        if (this._model) {
            this._model.dispose();
            this._model = undefined;
        }
    }

    get onDidChange(): Event<this> {
        return mapEvent(this._model.onDidChange, () => this);
    }

    public get count(): number {
        // TODO is this too simple? The Git provider does more
        return this._model.Resources.reduce((r, g) => r + g.resources.length, 0);
    }

    dispose(): void {
        TfvcSCMProvider.instance = undefined;
        this.cleanup();
        if (this._disposables) {
            this._disposables.forEach((d) => d.dispose());
            this._disposables = [];
        }
    }

    /**
     * If Tfvc is the active provider, returns the number of items it is tracking.
     */
    public static HasItems(): boolean {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.instance;
        if (tfvcProvider) {
            if (tfvcProvider.count > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the uri for the previous version of the file.
     */
    public static  GetLeftResource(resource: Resource): Uri {
        if (resource.HasStatus(Status.CONFLICT) ||
            resource.HasStatus(Status.EDIT) ||
            resource.HasStatus(Status.RENAME)) {
                return resource.GetServerUri();
        } else {
            return undefined;
        }
    }

    /**
     * Gets the uri for the current version of the file (except for deleted files).
     */
    public static GetRightResource(resource: Resource): Uri {
        if (resource.HasStatus(Status.DELETE)) {
            return resource.GetServerUri();
        } else {
            // Adding the version spec query, because this eventually gets passed to getOriginalResource
            return resource.resourceUri.with({ query: `C${resource.PendingChange.version}` });
        }
    }

    private static getProviderInstance(): TfvcSCMProvider {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.instance;
        if (!tfvcProvider) {
            // We are not the active provider
            Logger.LogDebug("TFVC is not the active provider.");
            throw TfvcError.CreateInvalidStateError();
        }
        return tfvcProvider;
    }

    public static async OpenDiff(resource: Resource): Promise<void> {
        return await commands.executeCommand<void>(TfvcCommandNames.Open, resource);
    }

}
