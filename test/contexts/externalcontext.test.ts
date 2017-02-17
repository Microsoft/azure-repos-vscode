/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
const path = require("path");

import { RepositoryType } from "../../src/contexts/repositorycontext";
import { ExternalContext }  from "../../src/contexts/externalcontext";
import { SettingsMock }  from "./contexthelper";

describe("ExternalContext", function() {
    let TEST_REPOS_FOLDER: string = "testrepos";
    let DOT_GIT_FOLDER: string = "dotgit";

    beforeEach(function() {
        // console.log("__dirname: " + __dirname);
    });

    it("should verify all undefined properties for undefined rootPath", function() {
        //Verify an undefined path does not set any values
        let ctx: ExternalContext = new ExternalContext(undefined);

        assert.equal(ctx.CurrentRef, undefined);
        assert.equal(ctx.CurrentBranch, undefined);
        assert.equal(ctx.RepositoryParentFolder, undefined);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.isFalse(ctx.IsTeamServices);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.RepoFolder, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify values for valid rootPath path", function() {
        let repoName: string = "gitrepo";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        //let gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);
        let ctx: ExternalContext = new ExternalContext(repoPath);

        assert.equal(ctx.CurrentRef, undefined);
        assert.equal(ctx.CurrentBranch, undefined);
        assert.equal(ctx.RepositoryParentFolder, undefined);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.isFalse(ctx.IsTeamServices);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);

        assert.equal(ctx.RepoFolder, repoPath);
    });

    it("should verify values for valid rootPath path and settings", async function() {
        let repoName: string = "gitrepo";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        let ctx: ExternalContext = new ExternalContext(repoPath);

        let mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, "https://xplatalm.visualstudio.com", "L2.VSCodeExtension.RC", undefined);
        let initialized: Boolean = await ctx.Initialize(mock);

        assert.isTrue(initialized);
        assert.isTrue(ctx.IsTeamServices);
        assert.isTrue(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, mock.RemoteUrl);
        assert.equal(ctx.TeamProjectName, mock.TeamProject);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing RemoteUrl", async function() {
        let repoName: string = "gitrepo";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        let ctx: ExternalContext = new ExternalContext(repoPath);

        let mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, undefined, "L2.VSCodeExtension.RC", undefined);
        let initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing TeamProject", async function() {
        let repoName: string = "gitrepo";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        let ctx: ExternalContext = new ExternalContext(repoPath);

        let mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, "https://xplatalm.visualstudio.com", undefined, undefined);
        let initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing RemoteUrl and TeamProject", async function() {
        let repoName: string = "gitrepo";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        let ctx: ExternalContext = new ExternalContext(repoPath);

        let mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, undefined, undefined, undefined);
        let initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

});
