/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

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
                    return undefined; //not what we expected (which is a tfvc team services repo)
                }
            } else {
                //TODO: on-prem TFS...?!
            }

            let collection: TeamProjectCollection;
            let coreApiClient: CoreApiClient = new CoreApiClient();
            if (RepoUtils.IsTeamFoundationServicesRepo(this._repoContext.RemoteUrl)) {
                //TODO: This can throw
                collection = await coreApiClient.GetProjectCollection(serverUrl, collectionName); // + "1");
                Logger.LogDebug(`Found a team project collection for url '${serverUrl}' and collection name '${collectionName}'. ${collection.id}`);
            } else {
                //TODO: On-prem TFS
            }

            // Now get the team project information from the server
            //TODO: This can throw
            let project: TeamProject = await this.getProjectFromServer(coreApiClient, serverUrl, teamProjectName);
            Logger.LogDebug(`Found a team project for url '${serverUrl}' and collection name '${collectionName}'. ${project.id}`);

            //Now, create the JSON blob to send to new RepositoryInfo(repoInfo);
            repoInfo = this.getTfvcRepoInfoBlob(serverUrl, collection.id, collection.name, collection.url, project.id, project.name, project.description, project.url);
            repositoryInfo = new RepositoryInfo(repoInfo);
            return repositoryInfo;
        }
        return repositoryInfo;
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
                url: "http://xplatalm.visualstudio.com/repository-url-does-not-exist",
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
            if (err.errorCode === "404") { //check this!!
                return false;
            } else {
                throw err; //check this!!
            }
        }
    }

}
