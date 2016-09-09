/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { BuildService }  from "../../src/services/build";
import { WellKnownRepositoryTypes } from "../../src/helpers/constants";

var chai = require("chai");
/* tslint:disable:no-unused-variable */
var expect = chai.expect;
/* tslint:enable:no-unused-variable */
var assert = chai.assert;
chai.should();

describe("BuildService-Integration", function() {
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

    it("should verify BuildService.GetBuildDefinitions", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        svc.GetBuildDefinitions(TestSettings.TeamProject()).then(
            function (definitions) {
                assert.isNotNull(definitions, "definitions was null when it shouldn't have been");
                //console.log(definitions.length);
                expect(definitions.length).to.equal(1);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify BuildService.GetBuildById", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        svc.GetBuildById(TestSettings.BuildId()).then(
            function (build) {
                assert.isNotNull(build, "build was null when it shouldn't have been");
                //console.log(definitions.length);
                expect(build.buildNumber).to.equal(TestSettings.BuildId().toString());
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify BuildService.GetBuildsByDefinitionId", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        svc.GetBuildsByDefinitionId(TestSettings.TeamProject(), TestSettings.BuildDefinitionId()).then(
            function (builds) {
                assert.isNotNull(builds, "builds was null when it shouldn't have been");
                //console.log(definitions.length);
                expect(builds.length).to.equal(1);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify BuildService.GetBuildBadge", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        svc.GetBuildBadge(TestSettings.TeamProject(), WellKnownRepositoryTypes.TfsGit, TestSettings.RepositoryId(), "refs/heads/master").then(
            function (badge) {
                assert.isNotNull(badge, "badge was null when it shouldn't have been");
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

});
