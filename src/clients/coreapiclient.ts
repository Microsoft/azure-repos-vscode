/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamProject, TeamProjectCollection } from "vso-node-api/interfaces/CoreInterfaces";
import { CoreApiService } from "../services/coreapi";

export class CoreApiClient {

    /* tslint:disable:no-empty */
    constructor() { }
    /* tslint:enable:no-empty */

    public async GetTeamProject(remoteUrl: string, teamProjectName: string): Promise<TeamProject> {
        const svc: CoreApiService = new CoreApiService(remoteUrl);
        const teamProject:TeamProject = await svc.GetTeamProject(teamProjectName);
        return teamProject;
    }

    public async GetProjectCollection(remoteUrl: string, collectionName: string): Promise<TeamProjectCollection> {
        const svc: CoreApiService = new CoreApiService(remoteUrl);
        const collection:TeamProjectCollection = await svc.GetProjectCollection(collectionName);
        return collection;
    }

}
