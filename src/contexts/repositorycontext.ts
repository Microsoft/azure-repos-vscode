/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

export enum RepositoryType {
    GIT,
    TFVC,
    ANY
}

export interface IRepositoryContext {
    Type: RepositoryType;

    //Added Initialize() so TFVC could call tf.cmd async
    Initialize(): Promise<void>;

    IsSsh: boolean;
    IsTeamFoundation: boolean;
    IsTeamServices: boolean;
    RemoteUrl: string;
    RepoFolder: string;
    RepositoryParentFolder: string;

    //Git-specific values
    CurrentBranch: string;
    CurrentRef: string;

    //TFVC-specific values
    TeamProjectName: string; //For TFVC, we can get this from the client
}
