/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IRepositoryContext } from "../contexts/repositorycontext";
import { GitContext } from "../contexts/gitcontext";
import { TfvcContext } from "../contexts/tfvccontext";
import { ExternalContext } from "../contexts/externalcontext";
import { Settings } from "../helpers/settings";

export class RepositoryContextFactory {

    //Returns an IRepositoryContext if the repository is either TFS or Team Services
    public static async CreateRepositoryContext(path: string, settings: Settings) : Promise<IRepositoryContext> {
        let repoContext: IRepositoryContext;
        let initialized: boolean = false;

        //Check for remoteUrl and teamProject in settings first
        repoContext = new ExternalContext(path);
        initialized = await repoContext.Initialize(settings);
        if (!initialized) {
            //Check for Git next since it should be faster to determine and this code will
            //be called on Reinitialize (when config changes, for example)
            repoContext = new GitContext(path);
            initialized = await repoContext.Initialize(settings);
            if (!repoContext || repoContext.IsTeamFoundation === false || !initialized) {
                //Check if we have a TFVC repository
                repoContext = new TfvcContext(path);
                initialized = await repoContext.Initialize(settings);
                if (!initialized) {
                    return undefined;
                }
                if (repoContext.IsTeamFoundation === false) {
                    //We don't have any Team Services repository
                    return undefined;
                }
            }
        }
        return repoContext;
    }

}
