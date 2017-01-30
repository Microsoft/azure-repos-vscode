/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IRepositoryContext, RepositoryType } from "./repositorycontext";
import { Tfvc } from "../tfvc/tfvc";
import { Repository } from "../tfvc/repository";
import { IWorkspace } from "../tfvc/interfaces";
import { RepoUtils } from "../helpers/repoutils";

export class TfvcContext implements IRepositoryContext {
    private _tfvcFolder: string;
    private _gitParentFolder: string;
    private _tfvcRemoteUrl: string;
    private _isSsh: boolean = false;
    private _isTeamServicesUrl: boolean = false;
    private _isTeamFoundationServer: boolean = false;
    private _teamProjectName: string;

    constructor(rootPath: string) { //, gitDir?: string) {
        this._tfvcFolder = rootPath;
    }

    //Need to call tf.cmd to get TFVC information (and constructors can't be async)
    public async Initialize(): Promise<Boolean> {
        //TODO: This will call tf.cmd workfold to determine if we're a TFVC repo
        //If that succeeds, set _tfvcFolder, _tfvcRemoteUrl and the flags.  That
        //call will also return the teamProject name for us.
        try {
            const tfvc: Tfvc = new Tfvc();
            const repo: Repository = tfvc.Open(this._tfvcFolder);
            const tfvcWorkspace: IWorkspace = await repo.FindWorkspace(this._tfvcFolder);

            this._tfvcRemoteUrl = tfvcWorkspace.server; // "https://xplatalm.visualstudio.com/defaultcollection/"; //This comes from workfold
            this._isTeamServicesUrl = RepoUtils.IsTeamFoundationServicesRepo(this._tfvcRemoteUrl); // true;
            this._isTeamFoundationServer = RepoUtils.IsTeamFoundationServerRepo(this._tfvcRemoteUrl); //TODO: Not sure I want to do this here; // false;
            this._teamProjectName = "L2.VSCodeExtension";  //TOOD: Fix this up once I can get the TeamProjectName from tf.cmd
            return true;
        } catch (err) {
            //TODO: Log an error (or display a message later?)
            return false;
        }
    }

    // Tfvc implementation
    public get TeamProjectName(): string {
        return this._teamProjectName;
    }

    // Git implementation
    public get CurrentBranch(): string {
        return undefined;
    }
    public get CurrentRef(): string {
        return undefined;
    }

    // IRepositoryContext implementation
    public get RepoFolder(): string {
        return this._tfvcFolder;
    }
    public get IsSsh(): boolean {
        return this._isSsh;
    }
    public get IsTeamFoundation(): boolean {
        return this._isTeamServicesUrl || this._isTeamFoundationServer;
    }
    public get IsTeamServices(): boolean {
        return this._isTeamServicesUrl;
    }
    public get RemoteUrl(): string {
        return this._tfvcRemoteUrl;
    }
    public get RepositoryParentFolder(): string {
        return this._gitParentFolder;
    }
    public get Type(): RepositoryType {
        return RepositoryType.TFVC;
    }
}
