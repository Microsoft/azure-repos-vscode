/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IRepositoryContext } from "../contexts/repositorycontext";
import { GitContext } from "../contexts/gitcontext";
import { TfvcContext } from "../contexts/tfvccontext";

export class RepositoryContextFactory {

    //Returns an IRepositoryContext if the repository is either TFS or Team Services
    public static async CreateRepositoryContext(path: string, gitDir?: string /*testing*/) : Promise<IRepositoryContext> {
        let repoContext: IRepositoryContext;

        //Check for Git first since it should be faster to determine and this code will
        //be called on Reinitialize (when config changes, for example)
        repoContext = new GitContext(path, gitDir);
        if (!repoContext ||
            repoContext.IsTeamFoundation === false) {
            //Check if we have a TFVC repository

            //TODO: This is where we'll first call the tf.cmd workfold to determine if we're a TFVC repository
            repoContext = new TfvcContext(path);
            let initialized: Boolean = await repoContext.Initialize();
            if (!initialized ||
                repoContext.IsTeamFoundation === false) {
                //We don't have any Team Services repository
                return undefined;
            }
        }

        return repoContext;
    }

}
