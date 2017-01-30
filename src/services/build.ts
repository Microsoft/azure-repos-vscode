/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Build, BuildBadge, BuildQueryOrder, BuildStatus, DefinitionReference, QueryDeletedOption } from "vso-node-api/interfaces/BuildInterfaces";
import { IBuildApi } from "vso-node-api/BuildApi";
import { WebApi } from "vso-node-api/WebApi";
import { TeamServerContext } from "../contexts/servercontext";
import { CredentialManager } from "../helpers/credentialmanager";

export class BuildService {
    private _buildApi: IBuildApi;

    constructor(context: TeamServerContext) {
        this._buildApi = new WebApi(context.RepoInfo.CollectionUrl, CredentialManager.GetCredentialHandler()).getBuildApi();
    }

    //Get the latest build id and badge of a build definition based on current project, repo and branch
    public async GetBuildBadge(project: string, repoType: string, repoId: string, branchName: string) : Promise<BuildBadge> {
        return await this._buildApi.getBuildBadge(project, repoType, repoId, branchName);
    }

    //Get extra details of a build based on the build id
    public async GetBuildById(buildId: number): Promise<Build> {
        return await this._buildApi.getBuild(buildId);
    };

    //Returns the build definitions (regardless of type) for the team project
    public async GetBuildDefinitions(teamProject: string): Promise<DefinitionReference[]> {
        return await this._buildApi.getDefinitions(teamProject);
    }

    //Returns the most recent 100 completed builds
    public async GetBuilds(teamProject: string): Promise<Build[]> {
        return await this._buildApi.getBuilds(teamProject, null, null, null, null, null, null, null, BuildStatus.Completed, null, null, null,
                                              100, null, 1, QueryDeletedOption.ExcludeDeleted, BuildQueryOrder.FinishTimeDescending);
    }

    //Returns the "latest" build for this definition
    public async GetBuildsByDefinitionId(teamProject: string, definitionId: number): Promise<Build[]> {
        return await this._buildApi.getBuilds(teamProject, [ definitionId ], null, null, null, null, null, null, null, null, null, null,
                                              1, null, 1, QueryDeletedOption.ExcludeDeleted, BuildQueryOrder.FinishTimeDescending);
    }

    //Construct the url to the individual build definition (completed view)
    //https://account.visualstudio.com/DefaultCollection/project/_build#_a=completed&definitionId=34
    public static GetBuildDefinitionUrl(remoteUrl: string, definitionId: string) : string {
        return BuildService.GetBuildsUrl(remoteUrl) + "#_a=completed" + "&definitionId=" + definitionId;
    }

    //Construct the url to the individual build summary
    //https://account.visualstudio.com/DefaultCollection/project/_build#_a=summary&buildId=1977
    public static GetBuildSummaryUrl(remoteUrl: string, buildId: string) : string {
        return BuildService.GetBuildsUrl(remoteUrl) + "#_a=summary" + "&buildId=" + buildId;
    }

    //Construct the url to the build definitions page for the project
    public static GetBuildDefinitionsUrl(remoteUrl: string) : string {
        //The new definitions experience is behind a feature flag
        return BuildService.GetBuildsUrl(remoteUrl); // + "/definitions";
    }

    //Construct the url to the builds page for the project
    public static GetBuildsUrl(remoteUrl: string) : string {
        return remoteUrl + "/_build";
    }

}
