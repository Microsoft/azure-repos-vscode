/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

//This class is responsible for determining information about a string-based url (not a uri)
//A Team Services Git repository is determined by:
// "_git" AND ".visualstudio.com" in the url
//A TFS Git repository is determined by:
// "_git" in the url and ".visualstudio.com" NOT in the url
//A Team Services TFVC repository is determined by:
// "_git" NOT in the URL and ".visualstudio.com" in the url
//A TFS TFVC repository is determined by:
// "_git" NOT in the URL and ".visualstudio.com" NOT in the url
//
//NOTE: the detection of a TFS TFVC repository is basically a "catch all".  Any url could match
//it and we'd think it's a TFVC repo.  For that to be true, this class now assumes that it is
//always detecting either a Team Services or TFS repository.  It no longer tries to determine
//that a url is NOT either a TFS or Team Services repository.  So it is up to the caller to only
//instantiate this class if we know we should have either a TFS or Team Services repository.
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
        if (url.toLowerCase().indexOf(".visualstudio.com") >= 0) {
            return true;
        }
        return false;
    }

    //This is the "catch all" method.  A repository hosted on TFS is defined by not being on "visualstudio.com"
    public static IsTeamFoundationServerRepo(url: string): boolean {
        if (!RepoUtils.IsTeamFoundationServicesRepo(url)) {
            return true;
        }
        return false;
    }
}
