/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { GitVcService, PullRequestScore }  from "../../src/services/gitvc";

var chai = require("chai");
/* tslint:disable:no-unused-variable */
var expect = chai.expect;
/* tslint:enable:no-unused-variable */
var assert = chai.assert;
chai.should();

describe("GitVcService-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout());

    var credentialManager: CredentialManager = new CredentialManager();
    var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());

    before(function() {
        return credentialManager.StoreCredentials(TestSettings.Account(), TestSettings.AccountUser(), TestSettings.Password());
    });
    beforeEach(function() {
        return credentialManager.GetCredentialHandler(ctx, undefined);
    });
    // afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account());
    });

    it("should verify GitVcService.GetRepositories", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        svc.GetRepositories(TestSettings.TeamProject()).then(
            function (repos) {
                assert.isNotNull(repos, "repos was null when it shouldn't have been");
                //console.log(repos.length);
                expect(repos.length).to.equal(2);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify GitVcService.GetPullRequests", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        svc.GetPullRequests(ctx.RepoInfo.RepositoryId).then(
            function (requests) {
                assert.isNotNull(requests, "requests was null when it shouldn't have been");
                //console.log(requests.length);
                expect(requests.length).to.equal(4);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify GitVcService.GetPullRequestScore", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: GitVcService = new GitVcService(ctx);
        svc.GetPullRequests(ctx.RepoInfo.RepositoryId).then((requests) => {
            let totals = [];
            requests.forEach(request => {
                totals.push({ "id" : request.pullRequestId, "score" : GitVcService.GetPullRequestScore(request) });
            });
            assert.equal(totals.length, 4);
            for (var index = 0; index < totals.length; index++) {
                var element = totals[index];
                if (element.id === 5) { assert.equal(element.score, PullRequestScore.Succeeded); continue; }
                if (element.id === 4) { assert.equal(element.score, PullRequestScore.Waiting); continue; }
                if (element.id === 3) { assert.equal(element.score, PullRequestScore.Failed); continue; }
                if (element.id === 2) { assert.equal(element.score, PullRequestScore.NoResponse); continue; } else {
                    //We got a PR we didn't expect but length\count was still the same.
                    assert.isTrue(false, "Expected count of pull requests is incorrect.");
                }
            }
            done();
        }).catch((err) => {
            done(err);
        });
    });

});
