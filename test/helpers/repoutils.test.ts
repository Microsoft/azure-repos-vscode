/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { RepoUtils } from "../../src/helpers/repoutils";

describe("RepoUtils", function() {

    beforeEach(function() {
        //
    });

    it("should ensure valid Team Foundation Server Git urls", function() {
        let url : string;
        //Server names with ports are valid
        url = "http://pioneer-new-dt:8080/tfs/DevDiv_Projects2/_git/JavaALM";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://minint-i0lvs2o:8080/tfs/DefaultCollection/_git/GitProject";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://java-tfs2015:8081/tfs/DefaultCollection/_git/GitJava";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://sources2010/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://sources2010/tfs/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        //Multi-part server names are valid
        url = "http://java-tfs01.3redis.local/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://java-tfs01.loseit.local:8080/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://stdtfs.amways.local/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        //IP addresses would be valid
        url = "http://192.168.0.1/sources2010/tfs/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "http://192.168.0.1:8084/sources2010/tfs/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
        //SSH urls would be valid
        url = "ssh://sources2010:22/tfs/DefaultCollection/_git/GitAgile";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url));
    });

    it("should ensure Team Services urls are not valid Team Foundation Server Git urls", function() {
        let url : string;
        url = "https://mseng.visualstudio.com/VSOnline/_git/Java.VSCode.CredentialStore";
        assert.isFalse(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "https://mseng.visualstudio.com/DefaultCollection/VSOnline/_git/Java.IntelliJ";
        assert.isFalse(RepoUtils.IsTeamFoundationServerRepo(url));
        url = "ssh://mseng@mseng.visualstudio.com:22/DefaultCollection/VSOnline/_git/Java.IntelliJ/";
        assert.isFalse(RepoUtils.IsTeamFoundationServerRepo(url));
    });

    it("should ensure valid Team Services Git urls", function() {
        let url : string;
        url = "https://mseng.visualstudio.com/VSOnline/_git/Java.VSCode.CredentialStore";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "https://mseng.visualstudio.com/DefaultCollection/VSOnline/_git/Java.IntelliJ";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url));
        //SSH urls would be valid
        url = "ssh://mseng@mseng.visualstudio.com:22/DefaultCollection/VSOnline/_git/Java.IntelliJ/";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url));
        //New-style SSH urls (with _ssh instead of _git) should be valid as well
        url = "ssh://acctname@vs-ssh.visualstudio.com:22/DefaultCollection/_ssh/reponame";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url));
    });

    it("should ensure Team Server urls are not valid Team Services Git urls", function() {
        let url : string;

        url = "http://pioneer-new-dt:8080/tfs/DevDiv_Projects2/_git/JavaALM";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://minint-i0lvs2o:8080/tfs/DefaultCollection/_git/GitProject";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://java-tfs2015:8081/tfs/DefaultCollection/_git/GitJava";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://sources2010/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://sources2010/tfs/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://java-tfs01.3redis.local/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://java-tfs01.loseit.local:8080/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://stdtfs.amways.local/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://192.168.0.1/sources2010/tfs/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "http://192.168.0.1:8084/sources2010/tfs/DefaultCollection/_git/repo";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "ssh://sources2010:22/tfs/DefaultCollection/_git/GitAgile";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
    });

    it("should ensure valid Team Foundation Git urls", function() {
        let url : string;
        url = "http://sources2010/tfs/DefaultCollection/_git/repo";
        assert.isTrue(RepoUtils.IsTeamFoundationGitRepo(url));
        url = "https://account.visualstudio.com/DefaultCollection/VSOnline/_git/Java.IntelliJ";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url));
    });

    it("should allow any other url as a valid Team Foundation repository", function() {
        let url : string;

        //This test exists to inform the developer of the fact that if we can't determine the url,
        //we have to assume that it is a TFVC repository.  See the RepoUtils class for more details.

        //This is true because we know it isn't Git but not that it isn't Tfvc
        // url = "https://account.visualstudio.com/DefaultCollection/VSOnline/Java.IntelliJ";
        // assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url), "Java.IntelliJ url is not detected as a valid Team Services repo");

        //This is true because we know it isn't Git but not that it isn't Tfvc
        //(we could write explicit code for GitHub but are not choosing to do so now)
        url = "git@github.com:Microsoft/Git-Credential-Manager-for-Mac-and-Linux.git";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url), "GitHub SSH url is not detected as a valid Team Services repo");

        //This is true because we know it isn't Git but not that it isn't Tfvc
        //(we could write explicit code for GitHub but are not choosing to do so now)
        url = "https://github.com/Microsoft/vsts-vscode.git";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url), "GitHub url is not detected as a valid Team Services repo");

        //This is true because we know it isn't Git but not that it isn't Tfvc
        url = "foo";
        assert.isTrue(RepoUtils.IsTeamFoundationServerRepo(url), "foo url is not detected as a valid Team Services repo");
    });

    it("should detect a valid Team Services repository but not as a Git repository", function() {
        let url : string;

        url = "https://account.visualstudio.com/DefaultCollection/VSOnline/Java.IntelliJ";
        assert.isTrue(RepoUtils.IsTeamFoundationServicesRepo(url), "Java.IntelliJ url is not detected as a valid Team Services repo");
        assert.isFalse(RepoUtils.IsTeamFoundationGitRepo(url), "Java.IntelliJ url is  detected as a valid Git repo");
    });

});
