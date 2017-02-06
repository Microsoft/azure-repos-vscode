/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import url = require("url");
import VsoBaseInterfaces = require("vso-node-api/interfaces/common/VsoBaseInterfaces");
import { CoreApiClient } from "./coreapiclient";
import { Logger } from "../helpers/logger";
import { RepoUtils } from "../helpers/repoutils";
import { Strings } from "../helpers/strings";
import { IRepositoryContext, RepositoryType } from "../contexts/repositorycontext";
import { TeamServicesApi } from "./teamservicesclient";
import { RepositoryInfo } from "../info/repositoryinfo";
import { TeamProject, TeamProjectCollection } from "vso-node-api/interfaces/CoreInterfaces";

export class RepositoryInfoClient {
    private _handler: VsoBaseInterfaces.IRequestHandler;
    private _repoContext: IRepositoryContext;

    constructor(context: IRepositoryContext, handler: VsoBaseInterfaces.IRequestHandler) {
        this._repoContext = context;
        this._handler = handler;
    }

    public async GetRepositoryInfo(): Promise<RepositoryInfo> {
        let repoInfo: any;
        let repositoryInfo: RepositoryInfo;
        let repositoryClient: TeamServicesApi;

        if (this._repoContext.Type === RepositoryType.GIT) {
            Logger.LogDebug(`Getting repository information for a Git repository at ${this._repoContext.RemoteUrl}`);
            repositoryClient = new TeamServicesApi(this._repoContext.RemoteUrl, [this._handler]);
            repoInfo = await repositoryClient.getVstsInfo();
            repositoryInfo = new RepositoryInfo(repoInfo);
            return repositoryInfo;
        } else if (this._repoContext.Type === RepositoryType.TFVC || this._repoContext.Type === RepositoryType.EXTERNAL) {
            Logger.LogDebug(`Getting repository information for a TFVC repository at ${this._repoContext.RemoteUrl}`);
            //For TFVC, the teamProjectName is retrieved by tf.cmd and set on the context
            let teamProjectName: string = this._repoContext.TeamProjectName;
            repositoryInfo = new RepositoryInfo(this._repoContext.RemoteUrl);

            let serverUrl: string;
            let collectionName: string;
            let isTeamServices: boolean = RepoUtils.IsTeamFoundationServicesRepo(this._repoContext.RemoteUrl);
            if (isTeamServices) {
                // The Team Services collection is ALWAYS defaultCollection, and both the url with defaultcollection
                // and the url without defaultCollection will validate just fine. However, it expects you to refer to
                // the collection by the account name. So, we just need to grab the account name and use that to
                // recreate the url.
                // If validation fails, we return false.
                collectionName = repositoryInfo.Account;
                serverUrl = `https://${repositoryInfo.Account}.visualstudio.com/`;
                let valid: boolean = await this.validateTfvcCollectionUrl(serverUrl, this._handler);
                if (!valid) {
                    let error: string = `Unable to validate the Team Services TFVC repository. Collection name: '${collectionName}', Url: '${serverUrl}'`;
                    Logger.LogDebug(error);
                    throw new Error(`${Strings.UnableToValidateTeamServicesTfvcRepository} Collection name: '${collectionName}', Url: '${serverUrl}'`);
                }
                Logger.LogDebug(`Successfully validated the Team Services TFVC repository. Collection name: '${collectionName}', 'Url: ${serverUrl}'`);
            } else {
                serverUrl = this._repoContext.RemoteUrl;
                // A full Team Foundation Server collection url is required for the validate call to succeed.
                // So we try the url given. If that fails, we assume it is a server Url and the collection is
                // the defaultCollection. If that assumption fails we return false.
                if (this.validateTfvcCollectionUrl(serverUrl, this._handler)) {
                    let parts: string[] = this.splitTfvcCollectionUrl(serverUrl);
                    serverUrl = parts[0];
                    collectionName = parts[1];
                    Logger.LogDebug(`Validated the TFS TFVC repository. Collection name: '${collectionName}', Url: '${serverUrl}'`);
                } else {
                    Logger.LogDebug(`Unable to validate the TFS TFVC repository. Url: '${serverUrl}'  Attempting with DefaultCollection...`);
                    collectionName = "DefaultCollection";
                    if (!this.validateTfvcCollectionUrl(url.resolve(serverUrl, collectionName), this._handler)) {
                        Logger.LogDebug(`Unable to validate the TFS TFVC repository with DefaultCollection.`);
                        throw new Error(Strings.UnableToValidateTfvcRepositoryWithDefaultCollection);
                    }
                    Logger.LogDebug(`Validated the TFS TFVC repository with DefaultCollection`);
                }
            }

            let coreApiClient: CoreApiClient = new CoreApiClient();
            //The following call works for VSTS, TFS 2017 and TFS 2015U3 (multiple collections, spaces in the name)
            Logger.LogDebug(`Getting project collection...  url: '${serverUrl}', and collection name: '${collectionName}'`);
            let collection: TeamProjectCollection = await coreApiClient.GetProjectCollection(serverUrl, collectionName);
            Logger.LogDebug(`Found a project collection for url: '${serverUrl}' and collection name: '${collection.name}'.`);

            Logger.LogDebug(`Getting team project...  Url: '${serverUrl}', collection name: '${collection.name}', and project: '${teamProjectName}'`);
            //For a Team Services collection, ignore the collectionName
            let resolvedRemoteUrl: string = url.resolve(serverUrl, isTeamServices ? "" : collection.name);
            let project: TeamProject = await this.getProjectFromServer(coreApiClient, resolvedRemoteUrl, teamProjectName);
            Logger.LogDebug(`Found a team project for url: '${serverUrl}', collection name: '${collection.name}', and project id: '${project.id}'`);

            //Now, create the JSON blob to send to new RepositoryInfo(repoInfo);
            repoInfo = this.getTfvcRepoInfoBlob(serverUrl, collection.id, collection.name, collection.url, project.id, project.name, project.description, project.url);
            repositoryInfo = new RepositoryInfo(repoInfo);
            return repositoryInfo;
        }
        return repositoryInfo;
    }

    private splitTfvcCollectionUrl(collectionUrl: string): string[] {
        let result: string[] = [ , ];
        if (!collectionUrl) {
            return result;
        }

        // Now find the TRUE last separator (before the collection name)
        let trimmedUrl: string = this.trimTrailingSeparators(collectionUrl);
        let index: number = trimmedUrl.lastIndexOf("/");
        if (index >= 0) {
            // result0 is the server url without the collection name
            result[0] = trimmedUrl.substring(0, index + 1);
            // result1 is just the collection name (no separators)
            result[1] = trimmedUrl.substring(index + 1);
        } else {
            // We can't determine the collection name so leave it empty
            result[0] = collectionUrl;
            result[1] = "";
        }

        return result;
    }

    private trimTrailingSeparators(uri: string): string {
        if (uri) {
            let lastIndex: number = uri.length;
            while (lastIndex > 0 && uri.charAt(lastIndex - 1) === "/".charAt(0)) {
                lastIndex--;
            }
            if (lastIndex >= 0) {
                return uri.substring(0, lastIndex);
            }
        }

        return uri;
    }

    //RepositoryInfo uses repository.remoteUrl to set up accountUrl
    private getTfvcRepoInfoBlob(serverUrl: string, collectionId: string, collectionName: string, collectionUrl: string,
                                projectId: string, projectName: string, projectDesc: string, projectUrl: string): any {
        return {
            serverUrl: serverUrl,
            collection: {
                id: collectionId,
                name: collectionName,
                url: collectionUrl
            },
            repository: {
                id: "00000000-0000-0000-0000-000000000000",
                name: "NoNameTfvcRepository",
                url: serverUrl,
                project: {
                    id: projectId,
                    name: projectName,
                    description: projectDesc,
                    url: projectUrl,
                    state: 1,
                    revision: 15
                },
                remoteUrl: serverUrl
            }
        };
    }

    private async getProjectFromServer(coreApiClient: CoreApiClient, remoteUrl: string, teamProjectName: string): Promise<TeamProject> {
        return coreApiClient.GetTeamProject(remoteUrl, teamProjectName);
    }

    private async validateTfvcCollectionUrl(serverUrl: string, handler: VsoBaseInterfaces.IRequestHandler): Promise<boolean> {
        try {
            let repositoryClient: TeamServicesApi = new TeamServicesApi(serverUrl, [this._handler]);
            await repositoryClient.validateTfvcCollectionUrl();
            return true;
        } catch (err) {
            if (err.errorCode === "404") {
                return false;
            } else {
                throw err;
            }
        }
    }

}
