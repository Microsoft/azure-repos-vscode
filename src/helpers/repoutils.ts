/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

export class RepoUtils {
    //Checks to see if url contains /_git/ signifying a Team Foundation Git repository
    public static IsTeamFoundationGitRepo(url: string): boolean {
        if (url && url.toLowerCase().indexOf("/_git/") >= 0) {
            return true;
        }
        return false;
    }

    //Checks to ensure it's a Team Foundation Git repo, then ensures it's hosted on visualstudio.com
    public static IsTeamFoundationServicesRepo(url: string): boolean {
        if (RepoUtils.IsTeamFoundationGitRepo(url) && url.toLowerCase().indexOf(".visualstudio.com") >= 0) {
            return true;
        }
        return false;
    }

    //Checks to ensure it's a Team Foundation repo, then ensures it's *not* on visualstudio.com
    public static IsTeamFoundationServerRepo(url: string): boolean {
        if (RepoUtils.IsTeamFoundationGitRepo(url) && !RepoUtils.IsTeamFoundationServicesRepo(url)) {
            return true;
        }
        return false;
    }
}
