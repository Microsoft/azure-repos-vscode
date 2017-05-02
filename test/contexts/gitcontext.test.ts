/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";

import { GitContext } from "../../src/contexts/gitcontext";
import { RepositoryType } from "../../src/contexts/repositorycontext";

describe("GitContext", function() {
    const TEST_REPOS_FOLDER: string = "testrepos";
    const DOT_GIT_FOLDER: string = "dotgit";

    beforeEach(function() {
        // console.log("__dirname: " + __dirname);
    });

    it("should verify all undefined properties for undefined GitContext path", function() {
        //Verify an undefined path does not set any values
        const gc: GitContext = new GitContext(undefined);

        assert.equal(gc.CurrentBranch, undefined);
        assert.equal(gc.RemoteUrl, undefined);
        assert.equal(gc.RepositoryParentFolder, undefined);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify undefined values for invalid GitContext path", function() {
        //Actually pass a value to constructor (instead of undefined), values should be undefined
        const gc: GitContext = new GitContext(__dirname + "invalid");

        assert.equal(gc.CurrentBranch, undefined);
        assert.equal(gc.RemoteUrl, undefined);
        assert.equal(gc.RepositoryParentFolder, undefined);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify initialize returns true", async function() {
        const gc: GitContext = new GitContext(__dirname);
        assert.isTrue(await gc.Initialize());
    });

    it("should cover dispose", async function() {
        const gc: GitContext = new GitContext(__dirname);
        gc.dispose();
    });

    it("should verify repository with an empty origin remote", function() {
        const repoName: string = "emptyconfig";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, undefined);
        assert.equal(gc.CurrentRef, undefined);
        assert.isFalse(gc.IsSsh);
        assert.isFalse(gc.IsTeamFoundation);
        assert.isFalse(gc.IsTeamServices);
        assert.equal(gc.RemoteUrl, undefined);
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify GitHub origin remote", function() {
        const repoName: string = "githubrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, "master");
        assert.equal(gc.CurrentRef, "refs/heads/master");
        assert.isFalse(gc.IsSsh);
        assert.isFalse(gc.IsTeamFoundation);
        assert.isFalse(gc.IsTeamServices);
        assert.equal(gc.RemoteUrl, undefined);
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify TeamServices origin remote", function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, "jeyou/approved-pr");
        assert.equal(gc.CurrentRef, "refs/heads/jeyou/approved-pr");
        assert.isFalse(gc.IsSsh);
        assert.isTrue(gc.IsTeamFoundation);
        assert.isTrue(gc.IsTeamServices);
        assert.equal(gc.RemoteUrl, "https://account.visualstudio.com/DefaultCollection/teamproject/_git/gitrepo");
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.isUndefined(gc.TeamProjectName); //For Git repositories, teamproject comes from vsts/info (not remoteUrl)
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify TeamServices origin remote cloned with ssh", function() {
        const repoName: string = "gitrepo-ssh";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, "master");
        assert.equal(gc.CurrentRef, "refs/heads/master");
        assert.isTrue(gc.IsSsh);
        assert.isTrue(gc.IsTeamFoundation);
        assert.isTrue(gc.IsTeamServices);
        //The remote URL is the https and no longer has port number
        assert.equal(gc.RemoteUrl, "https://account.visualstudio.com/DefaultCollection/_git/repository");
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify TeamFoundationServer origin remote", function() {
        const repoName: string = "tfsrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, "master");
        assert.equal(gc.CurrentRef, "refs/heads/master");
        assert.isFalse(gc.IsSsh);
        assert.isTrue(gc.IsTeamFoundation);
        assert.isFalse(gc.IsTeamServices);
        assert.equal(gc.RemoteUrl, "http://devmachine:8080/tfs/DefaultCollection/_git/GitAgile");
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

    it("should verify TeamFoundationServer origin remote cloned with ssh", function() {
        const repoName: string = "tfsrepo-ssh";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);

        assert.equal(gc.CurrentBranch, "master");
        assert.equal(gc.CurrentRef, "refs/heads/master");
        assert.isTrue(gc.IsSsh);
        //SSH isn't supported on server yet and that is indicated by isTeamFoundation === false
        assert.isFalse(gc.IsTeamFoundation);
        assert.isFalse(gc.IsTeamServices);
        //The remote URL is the same as the original
        assert.equal(gc.RemoteUrl, "ssh://devmachine:22/tfs/DefaultCollection/_git/GitJava");
        assert.equal(gc.RepositoryParentFolder, path.join(__dirname, TEST_REPOS_FOLDER, repoName));
        assert.equal(gc.RepoFolder, repoPath);
        assert.equal(gc.Type, RepositoryType.GIT);
    });

});
