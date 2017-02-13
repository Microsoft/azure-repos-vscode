/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Logger } from "../helpers/logger";
import { commands, scm, Uri, Disposable, SCMProvider, SCMResource, SCMResourceGroup, Event, ProviderResult, workspace } from "vscode";
import { CommitHoverProvider } from "./scm/commithoverprovider";
import { Model } from "./scm/model";
import { Status } from "./scm/status";
import { Resource } from "./scm/resource";
import { ResourceGroup } from "./scm/resourcegroups";
import { TfvcContext } from "../contexts/tfvccontext";
import { anyEvent, filterEvent } from "./util";
import { ExtensionManager } from "../extensionmanager";
import { RepositoryType } from "../contexts/repositorycontext";
import { TfvcOutput } from "./tfvcoutput";
import { TfvcContentProvider } from "./scm/tfvccontentprovider";
import { TfvcError } from "./tfvcerror";
import { ICheckinInfo } from "./interfaces";

import * as path from "path";

/**
 * This class provides the SCM implementation for TFVC.
 * Note: to switch SCM providers you must do the following:
 *      F1 -> SCM: Enable SCM Preview
 *      F1 -> SCM: Switch SCM Provider -> Choose TFVC from the pick list
 */
export class TfvcSCMProvider implements SCMProvider {
    public static scmScheme: string = "tfvc";
    private static instance: TfvcSCMProvider = undefined;

    private _extensionManager: ExtensionManager;
    private _repoContext: TfvcContext;
    private _model: Model;
    private _disposables: Disposable[] = [];

    constructor(extensionManager: ExtensionManager) {
        this._extensionManager = extensionManager;
    }

    /* Static helper methods */
    public static ClearCheckinMessage(): void {
        scm.inputBox.value = "";
    }

    public static GetCheckinInfo(): ICheckinInfo {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.GetProviderInstance();

        try {
            const files: string[] = [];
            const commitMessage: string = scm.inputBox.value;
            const workItemIds: number[] = [];

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

    public static async Exclude(path: string): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.GetProviderInstance();

        await tfvcProvider._model.Exclude(path);
    };

    public static async Refresh(): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.GetProviderInstance();

        await tfvcProvider._model.Refresh();
    };

    public static async Unexclude(path: string): Promise<void> {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.GetProviderInstance();

        await tfvcProvider._model.Unexclude(path);
    };

    /* Public methods */

    public async Initialize(disposables: Disposable[]): Promise<void> {
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

        this._repoContext = <TfvcContext>this._extensionManager.RepoContext;
        const fsWatcher = workspace.createFileSystemWatcher("**");
        const onWorkspaceChange = anyEvent(fsWatcher.onDidChange, fsWatcher.onDidCreate, fsWatcher.onDidDelete);
        const onTfvcChange = filterEvent(onWorkspaceChange, uri => /^\$tf\//.test(workspace.asRelativePath(uri)));
        this._model = new Model(this._repoContext.RepoFolder, this._repoContext.TfvcRepository, onWorkspaceChange);

        let version: string = "unknown";
        try {
            version = await this._repoContext.TfvcRepository.CheckVersion();
        } catch (err) {
            this._extensionManager.DisplayWarningMessage(err.message);
        }
        await TfvcOutput.CreateChannel(disposables);
        TfvcOutput.AppendLine("Using TFVC command line: " + this._repoContext.Tfvc.Location + " (" + version + ")");

        const commitHoverProvider = new CommitHoverProvider(this._model);
        const contentProvider = new TfvcContentProvider(this._repoContext.TfvcRepository, rootPath, onTfvcChange);
        //const checkoutStatusBar = new CheckoutStatusBar(model);
        //const syncStatusBar = new SyncStatusBar(model);
        //const autoFetcher = new AutoFetcher(model);
        //const mergeDecorator = new MergeDecorator(model);

        // Now that everything is setup, we can register the provider and set up our singleton instance
        TfvcSCMProvider.instance = this;
        scm.registerSCMProvider(TfvcSCMProvider.scmScheme, this);

        disposables.push(
            commitHoverProvider,
            this,
            contentProvider,
            fsWatcher
            //checkoutStatusBar,
            //syncStatusBar,
            //autoFetcher,
            //mergeDecorator
        );
    }

    /* Implement SCMProvider interface */

    public get resources(): SCMResourceGroup[] { return this._model.Resources; }
    public get onDidChange(): Event<SCMResourceGroup[]> { return this._model.onDidChange; }
    public get label(): string { return "TFVC"; }
    public get count(): number {
        // TODO is this too simple? The Git provider does more
        return this._model.Resources.reduce((r, g) => r + g.resources.length, 0);
    }

    /**
     * This is the default action when an resource is clicked in the viewlet.
     * For ADD, AND UNDELETE just show the local file.
     * For DELETE just show the server file.
     * For EDIT AND RENAME show the diff window (server on left, local on right).
     */
    open(resource: Resource): ProviderResult<void> {
        const left: Uri = this.getLeftResource(resource);
        const right: Uri = this.getRightResource(resource);
        const title: string = this.getTitle(resource);

        if (!left) {
            if (!right) {
                // TODO
                console.error("oh no");
                return;
            }
            return commands.executeCommand<void>("vscode.open", right);
        }
        return commands.executeCommand<void>("vscode.diff", left, right, title);
    }

    drag(resource: Resource, resourceGroup: ResourceGroup): void {
        console.log("drag", resource, resourceGroup);
    }

    getOriginalResource(uri: Uri): Uri | undefined {
        if (uri.scheme !== "file") {
            return;
        }

        return uri.with({ scheme: TfvcSCMProvider.scmScheme });
    }

    dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }

    /**
     * Gets the uri for the previous version of the file.
     */
    private getLeftResource(resource: Resource): Uri {
        if (resource.HasStatus(Status.EDIT) ||
            resource.HasStatus(Status.RENAME)) {
                return resource.GetServerUri();
        } else {
            return undefined;
        }
    }

    /**
     * Gets the uri for the current version of the file (except for deleted files).
     */
    private getRightResource(resource: Resource): Uri {
        if (resource.HasStatus(Status.DELETE)) {
            return resource.GetServerUri();
        } else {
            // Adding the version spec query, because this eventually gets passed to getOriginalResource
            return resource.uri.with({ query: `C${resource.PendingChange.version}` });
        }
    }

    private getTitle(resource: Resource): string {
        const basename = path.basename(resource.PendingChange.localItem);
        const sourceBasename = resource.PendingChange.sourceItem ? path.basename(resource.PendingChange.sourceItem) : "";

        if (resource.HasStatus(Status.RENAME)) {
            return sourceBasename ? `${basename} <- ${sourceBasename}` : `${basename}`;
        } else if (resource.HasStatus(Status.EDIT)) {
            return `${basename}`;
        }

        return "";
    }

    private static ResolveTfvcURI(uri: Uri): SCMResource | SCMResourceGroup | undefined {
        if (uri.authority !== TfvcSCMProvider.scmScheme) {
            return;
        }

        return scm.getResourceFromURI(uri);
    }

    public static ResolveTfvcResource(uri: Uri): Resource {
        if (uri) {
            const resource = TfvcSCMProvider.ResolveTfvcURI(uri);

            if (!(resource instanceof Resource)) {
                return undefined;
            }

            return resource;
        }
        return undefined;
    }

    public static GetPathFromUri(uri: Uri): string {
        if (uri) {
            const resource = TfvcSCMProvider.ResolveTfvcResource(uri);
            if (resource) {
                return resource.uri.fsPath;
            }
        }
        return undefined;
    }

    private static GetProviderInstance(): TfvcSCMProvider {
        const tfvcProvider: TfvcSCMProvider = TfvcSCMProvider.instance;
        if (!tfvcProvider) {
            // We are not the active provider
            Logger.LogDebug("Failed to GetCheckinInfo. TFVC is not the active provider.");
            throw TfvcError.CreateInvalidStateError();
        }
        return tfvcProvider;
    }
}
