/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamProject, TeamProjectCollection } from "vso-node-api/interfaces/CoreInterfaces";
import { WebApi } from "vso-node-api/WebApi";
import { ICoreApi } from "vso-node-api/CoreApi";
import { CredentialManager } from "../helpers/credentialmanager";

export class CoreApiService {
    private _coreApi: ICoreApi;

    constructor(remoteUrl: string) {
        this._coreApi = new WebApi(remoteUrl, CredentialManager.GetCredentialHandler()).getCoreApi();
    }

    //Get the
    public async GetProjectCollection(collectionName: string) : Promise<TeamProjectCollection> {
        return await this._coreApi.getProjectCollection(collectionName);
    }

    //Get the
    public async GetTeamProject(projectName: string) : Promise<TeamProject> {
        return await this._coreApi.getProject(projectName, false, false);
    }

}
