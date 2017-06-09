/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Logger } from "../helpers/logger";
import { RepoUtils } from "../helpers/repoutils";
import { UrlBuilder } from "../helpers/urlbuilder";
import * as url from "url";

//When a RepositoryInfo object is created, we have already verified whether or not it
//is either a Team Services or Team Foundation Server repository.  With the introduction
//of TFVC support, we cannot determine if it is TFVC based on url alone.  Therfore,
//we have to assume that are creating a RepositoryInfo for an existing TF repo.
export class RepositoryInfo {
    private _host: string;
    private _hostName: string;
    private _path: string;
    private _pathName: string;
    private _port: string;
    private _protocol: string;
    private _query: string;

    private _account: string;
    private _collection: string;
    private _collectionId: string;
    private _teamProject: string;
    private _repositoryName: string;
    private _repositoryUrl: string;
    private _serverUrl: string;

    // Indicates whether the repository is Team Services
    private _isTeamServicesUrl: boolean = false;
    // Indicates whether the repository is an on-premises server
    private _isTeamFoundationServer: boolean = false;

    private _repositoryId: string;

    constructor(repositoryUrl: string);
    constructor(repositoryInfo: any);

    constructor (repositoryInfo: any) {
        if (!repositoryInfo) {
            throw new Error(`repositoryInfo is undefined`);
        }

        let repositoryUrl: string = undefined;

        if (typeof repositoryInfo === "object") {
            repositoryUrl = repositoryInfo.repository.remoteUrl;
        } else {
            repositoryUrl = repositoryInfo;
        }
        //Clean up repository URLs for repos that have "limited refs" enabled
        repositoryUrl = repositoryUrl.replace("/_git/_full/", "/_git/").replace("/_git/_optimized/", "/_git/");

        const purl: url.Url = url.parse(repositoryUrl);
        if (purl) {
            this._host = purl.host;
            this._hostName = purl.hostname;
            this._path = purl.path;
            this._pathName = purl.pathname;
            this._port = purl.port;
            this._protocol = purl.protocol;
            this._query = purl.query;

            this._repositoryUrl = repositoryUrl;
            if (RepoUtils.IsTeamFoundationServicesRepo(repositoryUrl)) {
                const splitHost = this._host.split(".");
                this._account = splitHost[0];
                this._isTeamServicesUrl = true;
                Logger.LogDebug("_isTeamServicesUrl: true");
            } else if (RepoUtils.IsTeamFoundationServerRepo(repositoryUrl)) {
                this._account = purl.host;
                this._isTeamFoundationServer = true;
            }
            if (typeof repositoryInfo === "object") {
                Logger.LogDebug("Parsing values from repositoryInfo object as any");
                //The following properties are returned from the vsts/info api
                //If you add additional properties to the server context, they need to be set here
                this._collection = repositoryInfo.collection.name;
                Logger.LogDebug("_collection: " + this._collection);
                this._collectionId = repositoryInfo.collection.id;
                Logger.LogDebug("_collectionId: " + this._collectionId);
                this._repositoryId = repositoryInfo.repository.id;
                Logger.LogDebug("_repositoryId: " + this._repositoryId);
                this._repositoryName = repositoryInfo.repository.name;
                Logger.LogDebug("_repositoryName: " + this._repositoryName);
                this._teamProject = repositoryInfo.repository.project.name;
                Logger.LogDebug("_teamProject: " + this._teamProject);
                if (this._isTeamFoundationServer === true) {
                    Logger.LogDebug("_isTeamFoundationServer: true");
                    //_serverUrl is only set for TeamFoundationServer repositories
                    this._serverUrl = repositoryInfo.serverUrl;
                }
            } else {
                Logger.LogDebug("Parsing values from repositoryInfo as string url");
            }
        }
    }

    public get Account(): string {
        return this._account;
    }
    public get AccountUrl(): string {
        if (this._isTeamServicesUrl) {
            return this._protocol + "//" + this._host;
        } else if (this._isTeamFoundationServer) {
            return this._serverUrl;
        }
    }
    public get CollectionId(): string {
        return this._collectionId;
    }
    public get CollectionName(): string {
        return this._collection;
    }
    public get CollectionUrl(): string {
        if (this._collection === undefined) {
            return undefined;
        }
        //While leaving the actual data alone, check for 'collection in the domain'
        if (this._account.toLowerCase() !== this._collection.toLowerCase()) {
            return UrlBuilder.Join(this.AccountUrl, this._collection);
        } else {
            return this.AccountUrl;
        }
    }
    public get Host(): string {
        return this._host;
    }
    public get IsTeamFoundation(): boolean {
        return this._isTeamServicesUrl || this._isTeamFoundationServer;
    }
    public get IsTeamFoundationServer(): boolean {
        return this._isTeamFoundationServer;
    }
    public get IsTeamServices(): boolean {
        return this._isTeamServicesUrl;
    }
    public get Protocol(): string {
        return this._protocol;
    }
    public get RepositoryId(): string {
        return this._repositoryId;
    }
    public get RepositoryName(): string {
        return this._repositoryName;
    }
    public get RepositoryUrl(): string {
        return this._repositoryUrl;
    }
    public get TeamProjectUrl(): string {
        if (this._teamProject === undefined) {
            return undefined;
        }
        return UrlBuilder.Join(this.CollectionUrl, this._teamProject);
    }
    public get TeamProject(): string {
        return this._teamProject;
    }
}
