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
            //TODO: This can throw
            repoInfo = await repositoryClient.getVstsInfo();
            repositoryInfo = new RepositoryInfo(repoInfo);
            return repositoryInfo;
        } else if (this._repoContext.Type === RepositoryType.TFVC) {
            Logger.LogDebug(`Getting repository information for a TFVC repository at ${this._repoContext.RemoteUrl}`);
            //For TFVC, the teamProjectName is retrieved by tf.cmd and set on the context
            let teamProjectName: string = this._repoContext.TeamProjectName;
            repositoryInfo = new RepositoryInfo(this._repoContext.RemoteUrl);

            let serverUrl: string;
            let collectionName: string;
            if (RepoUtils.IsTeamFoundationServicesRepo(this._repoContext.RemoteUrl)) {
                // The Team Services collection is ALWAYS defaultCollection, and both the url with defaultcollection
                // and the url without defaultCollection will validate just fine. However, it expects you to refer to
                // the collection by the account name. So, we just need to grab the account name and use that to
                // recreate the url.
                // If validation fails, we return false.
                collectionName = repositoryInfo.Account;
                serverUrl = `https://${repositoryInfo.Account}.visualstudio.com/`;
                //repositoryClient = new TeamServicesApi(serverUrl, [this._handler]);
                let valid: boolean = await this.validateTfvcCollectionUrl(serverUrl, this._handler);
                if (!valid) {
                    Logger.LogDebug(`Unable to validate the Team Services TFVC repository. Collection: ${collectionName}, Url: ${serverUrl}`);
                    return undefined; //TODO: Handle this case (in the caller)
                }
                Logger.LogDebug(`Successfully validated the Team Services TFVC repository. Collection: ${collectionName}, Url: ${serverUrl}`);
            } else {
                serverUrl = this._repoContext.RemoteUrl;
                // A full Team Foundation Server collection url is required for the validate call to succeed.
                // So we try the url given. If that fails, we assume it is a server Url and the collection is
                // the defaultCollection. If that assumption fails we return false.
                if (this.validateTfvcCollectionUrl(serverUrl, this._handler)) {
                    let parts: string[] = this.splitTfvcCollectionUrl(serverUrl);
                    serverUrl = parts[0];
                    collectionName = parts[1];
                    Logger.LogDebug(`Validated the TFS TFVC repository. Collection: ${collectionName}, Url: ${serverUrl}`);
                } else {
                    Logger.LogDebug(`Unable to validate the TFS TFVC repository. Url: ${serverUrl}  Attempting with DefaultCollection...`);
                    collectionName = "DefaultCollection";
                    if (!this.validateTfvcCollectionUrl(url.resolve(serverUrl, collectionName), this._handler)) {
                        Logger.LogDebug(`Unable to validate the TFS TFVC repository with DefaultCollection`);
                        return undefined; //TODO: Handle this case (in the caller)
                    }
                    Logger.LogDebug(`Validated the TFS TFVC repository with DefaultCollection`);
                }
            }

            let coreApiClient: CoreApiClient = new CoreApiClient();
            //TODO: This can throw
            //The following call works for VSTS, TFS 2017 and TFS 2015U3 (multiple collections, spaces in the name)
            let collection: TeamProjectCollection = await coreApiClient.GetProjectCollection(serverUrl, collectionName); // + "1");

            //TODO: This can throw
            let project: TeamProject = await this.getProjectFromServer(coreApiClient, url.resolve(serverUrl, collectionName), teamProjectName);
            Logger.LogDebug(`Found a team project for url '${serverUrl}' and collection name '${collectionName}'. ${project.id}`);

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

    //TODO: serverUrl could be a guess (need to add accountName as collection?)
    //RepositoryInfo uses repository.remoteUrl to set up accountUrl
    private getTfvcRepoInfoBlob(serverUrl: string, collectionId: string, collectionName: string, collectionUrl: string,
                                projectId: string, projectName: string, projectDesc: string, projectUrl: string): any {
        //TODO: Not sure if remoteUrl should always be the same as serverUrl...?
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
            if (err.errorCode === "404") { //TODO: ensure 404s are handled appropriately
                return false;
            } else {
                throw err; //TODO: ensure unexpected exceptions are handled appropriately
            }
        }
    }

}
