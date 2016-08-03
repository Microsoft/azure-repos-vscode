/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { RepoUtils }  from "../../src/helpers/repoutils";

var chai = require("chai");
/* tslint:disable:no-unused-variable */
var expect = chai.expect;
/* tslint:enable:no-unused-variable */
var assert = chai.assert;
chai.should();

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

        //The following url has no "/_git/" in the path
        url = "https://account.visualstudio.com/DefaultCollection/VSOnline/Java.IntelliJ";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
    });

    it("should detect invalid Team Foundation Git urls", function() {
        let url : string;

        //The following urls have no "/_git/" in the path
        url = "https://account.visualstudio.com/DefaultCollection/VSOnline/Java.IntelliJ";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "git@github.com:Microsoft/Git-Credential-Manager-for-Mac-and-Linux.git";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "https://github.com/Microsoft/vsts-vscode.git";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
        url = "https://account.visualstudio.com/DefaultCollection/VSOnline/Java.IntelliJ";
        assert.isFalse(RepoUtils.IsTeamFoundationServicesRepo(url));
    });

});
