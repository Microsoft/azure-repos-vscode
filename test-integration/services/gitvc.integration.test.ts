/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";

import { GitPullRequest, GitRepository } from "vso-node-api/interfaces/GitInterfaces";
import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";
import { CredentialManager } from "../../src/helpers/credentialmanager";
import { UserAgentProvider } from "../../src/helpers/useragentprovider";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { GitVcService, PullRequestScore } from "../../src/services/gitvc";

describe("GitVcService-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout);

    let credentialManager: CredentialManager = new CredentialManager();
    let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);

    before(function() {
        UserAgentProvider.VSCodeVersion = "0.0.0";
        return credentialManager.StoreCredentials(TestSettings.Account, TestSettings.AccountUser, TestSettings.Password);
    });
    beforeEach(function() {
        return credentialManager.GetCredentials(ctx, undefined);
    });
    // afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account);
    });

    it("should verify GitVcService.GetRepositories", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        let repos: GitRepository[] = await svc.GetRepositories(TestSettings.TeamProject);
        assert.isNotNull(repos, "repos was null when it shouldn't have been");
        //console.log(repos.length);
        expect(repos.length).to.equal(2);
    });

    it("should verify GitVcService.GetPullRequests", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        let requests: GitPullRequest[] = await svc.GetPullRequests(ctx.RepoInfo.RepositoryId);
        assert.isNotNull(requests, "requests was null when it shouldn't have been");
        //console.log(requests.length);
        expect(requests.length).to.equal(4);
    });

    it("should verify GitVcService.GetPullRequestScore", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        let requests: GitPullRequest[] = await svc.GetPullRequests(ctx.RepoInfo.RepositoryId);
        let totals = [];
        requests.forEach((request) => {
            totals.push({ "id" : request.pullRequestId, "score" : GitVcService.GetPullRequestScore(request) });
        });
        assert.equal(totals.length, 4);
        for (let index = 0; index < totals.length; index++) {
            let element: any = totals[index];
            if (element.id === 5) { assert.equal(element.score, PullRequestScore.Succeeded); continue; }
            if (element.id === 4) { assert.equal(element.score, PullRequestScore.Waiting); continue; }
            if (element.id === 3) { assert.equal(element.score, PullRequestScore.Failed); continue; }
            if (element.id === 2) { assert.equal(element.score, PullRequestScore.NoResponse); continue; } else {
                //We got a PR we didn't expect but length\count was still the same.
                assert.isTrue(false, "Expected count of pull requests is incorrect.");
            }
        }
    });

});
