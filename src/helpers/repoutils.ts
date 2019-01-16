/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Logger } from "../helpers/logger";
import * as url from "url";

//This class is responsible for determining information about a string-based url (not a uri)
//A Team Services Git repository is determined by:
// "_git" AND ".visualstudio.com" / "azure.com" in the url
//A TFS Git repository is determined by:
// "_git" in the url and ".visualstudio.com" / "azure.com" NOT in the url
//A Team Services TFVC repository is determined by:
// "_git" NOT in the URL and ".visualstudio.com" / "azure.com" in the url
//A Team Services azure repository is determined by:
// "azure.com" in the hostname
//A TFS TFVC repository is determined by:
// "_git" NOT in the URL and ".visualstudio.com" / "azure.com" NOT in the url
//
//NOTE: the detection of a TFS TFVC repository is basically a "catch all".  Any url could match
//it and we'd think it's a TFVC repo.  For that to be true, this class now assumes that it is
//always detecting either a Team Services or TFS repository.  It no longer tries to determine
//that a url is NOT either a TFS or Team Services repository.  So it is up to the caller to only
//instantiate this class if we know we should have either a TFS or Team Services repository.
export class RepoUtils {
    private static sshV3 = new RegExp(".+@(?:vs-)?ssh\.(.+):v3\/(.+)\/(.+)\/(.+)");

    //Checks a handful of heuristics to see if the url provided is a TFS or VSTS repo
    public static IsTeamFoundationGitRepo(url: string): boolean {
        if (!url) {
            return false;
        }

        const asLower = url.toLowerCase();

        // TFS uses /_git/ in all repository paths
        const containsUnderGit = asLower.indexOf("/_git/") >= 0;
        if (containsUnderGit) {
            return true;
        }

        // VSTS uses /_ssh/ after visualstudio.com in all repository paths
        const underSSHIndex = asLower.indexOf("/_ssh/");
        const visualstudioDotComIndex = asLower.indexOf(".visualstudio.com");
        if (visualstudioDotComIndex >= 0 && underSSHIndex >= visualstudioDotComIndex) {
            return true;
        }

        // Check for v3 url format
        if (RepoUtils.IsTeamFoundationServicesV3SshRepo(url)) {
            return true;
        }

        return false;
    }

    //Checks to ensure it's a Team Foundation Git repo, then ensures it's hosted on visualstudio.com
    public static IsTeamFoundationServicesRepo(url: string): boolean {
        if ((url.toLowerCase().indexOf(".visualstudio.com") >= 0) ||
            RepoUtils.IsTeamFoundationServicesAzureRepo(url)) {
            return true;
        }
        return false;
    }

    //Checks to ensure it's a Team Foundation Git repo, then ensures it's hosted on azure.com
    public static IsTeamFoundationServicesAzureRepo(respositoryUrl: string): boolean {
        try {
            // check for ssh based url that will not parse as a standard url
            if (RepoUtils.IsTeamFoundationServicesV3SshRepo(respositoryUrl)) {
                return true;
            }
            const purl: url.Url = url.parse(respositoryUrl);
            if (purl.hostname.toLowerCase().indexOf("azure.com") >= 0) {
                return true;
            }
        } catch (err) {
            Logger.LogDebug("Could not parse repository url: " + respositoryUrl);
        }
        return false;
    }

    public static IsTeamFoundationServicesV3SshRepo(respositoryUrl: string): boolean {
        return RepoUtils.sshV3.test(respositoryUrl.toLowerCase());
    }

    public static ConvertSshV3ToUrl(respositoryUrl: string): string {
        const scheme = "https://";
        const match = RepoUtils.sshV3.exec(respositoryUrl.toLowerCase());
        if (match.length === 5) {
            if (match[1] === "visualstudio.com") {
                return scheme + match[2] + "." + match[1] + "/" + match[3] + "/_git/" + match[4];
            }
            return scheme + match[1] + "/" + match[2] +  "/" + match[3] + "/_git/" + match[4];
        }
        Logger.LogDebug("Could not parse as v3 repository url: " + respositoryUrl);
        return undefined;
    }

    //This is the "catch all" method.  A repository hosted on TFS is defined by not being on "visualstudio.com"
    public static IsTeamFoundationServerRepo(url: string): boolean {
        if (!RepoUtils.IsTeamFoundationServicesRepo(url)) {
            return true;
        }
        return false;
    }
}
