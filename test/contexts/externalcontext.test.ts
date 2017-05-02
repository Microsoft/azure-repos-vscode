/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";

import { RepositoryType } from "../../src/contexts/repositorycontext";
import { ExternalContext } from "../../src/contexts/externalcontext";
import { SettingsMock } from "./contexthelper";

describe("ExternalContext", function() {
    const TEST_REPOS_FOLDER: string = "testrepos";
    const DOT_GIT_FOLDER: string = "dotgit";

    beforeEach(function() {
        // console.log("__dirname: " + __dirname);
    });

    it("should verify all undefined properties for undefined rootPath", function() {
        //Verify an undefined path does not set any values
        const ctx: ExternalContext = new ExternalContext(undefined);

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
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        //const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);

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

    it("should cover dispose", function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        //const gc: GitContext = new GitContext(repoPath, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);
        ctx.dispose();
    });

    it("should verify values for valid rootPath path and settings", async function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);

        const mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, "https://xplatalm.visualstudio.com", "L2.VSCodeExtension.RC", undefined);
        const initialized: Boolean = await ctx.Initialize(mock);

        assert.isTrue(initialized);
        assert.isTrue(ctx.IsTeamServices);
        assert.isTrue(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, mock.RemoteUrl);
        assert.equal(ctx.TeamProjectName, mock.TeamProject);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing RemoteUrl", async function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);

        const mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, undefined, "L2.VSCodeExtension.RC", undefined);
        const initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing TeamProject", async function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);

        const mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, "https://xplatalm.visualstudio.com", undefined, undefined);
        const initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

    it("should verify initialize is false for missing RemoteUrl and TeamProject", async function() {
        const repoName: string = "gitrepo";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER);
        const ctx: ExternalContext = new ExternalContext(repoPath);

        const mock: SettingsMock = new SettingsMock(false, undefined, undefined, 1, undefined, undefined, undefined);
        const initialized: Boolean = await ctx.Initialize(mock);

        assert.isFalse(initialized);
        assert.isFalse(ctx.IsSsh);
        assert.isFalse(ctx.IsTeamServices);
        assert.isFalse(ctx.IsTeamFoundation);
        assert.equal(ctx.RemoteUrl, undefined);
        assert.equal(ctx.TeamProjectName, undefined);
        assert.equal(ctx.Type, RepositoryType.EXTERNAL);
    });

});
