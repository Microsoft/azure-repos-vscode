/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";

import { Build, BuildBadge } from "vso-node-api/interfaces/BuildInterfaces";
import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";
import { CredentialManager } from "../../src/helpers/credentialmanager";
import { UserAgentProvider } from "../../src/helpers/useragentprovider";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { BuildService } from "../../src/services/build";
import { WellKnownRepositoryTypes } from "../../src/helpers/constants";

describe("BuildService-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout);

    let credentialManager: CredentialManager = new CredentialManager();
    let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);

    before(function() {
        UserAgentProvider.VSCodeVersion = "0.0.0";
        return credentialManager.StoreCredentials(TestSettings.Account, TestSettings.AccountUser, TestSettings.Password);
    });
    beforeEach(function() {
        return credentialManager.GetCredentials(ctx);
    });
    // afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account);
    });

    it("should verify BuildService.GetBuildDefinitions", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        let definitions = await svc.GetBuildDefinitions(TestSettings.TeamProject);
        assert.isNotNull(definitions, "definitions was null when it shouldn't have been");
        //console.log(definitions.length);
        expect(definitions.length).to.be.at.least(1);
    });

    it("should verify BuildService.GetBuildById", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        let build: Build = await svc.GetBuildById(TestSettings.BuildId);
        assert.isNotNull(build, "build was null when it shouldn't have been");
        //console.log(definitions.length);
        expect(build.buildNumber).to.equal(TestSettings.BuildId.toString());
    });

    it("should verify BuildService.GetBuilds", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        let builds = await svc.GetBuilds(TestSettings.TeamProject);
        assert.isNotNull(builds, "builds was null when it shouldn't have been");
        //console.log(builds.length);
        expect(builds.length).to.be.at.least(1);
    });

    it("should verify BuildService.GetBuildsByDefinitionId", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        let builds: Build[] = await svc.GetBuildsByDefinitionId(TestSettings.TeamProject, TestSettings.BuildDefinitionId);
        assert.isNotNull(builds, "builds was null when it shouldn't have been");
        //console.log(definitions.length);
        expect(builds.length).to.equal(1);
    });

    it("should verify BuildService.GetBuildBadge", async function() {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: BuildService = new BuildService(ctx);
        let badge: BuildBadge = await svc.GetBuildBadge(TestSettings.TeamProject, WellKnownRepositoryTypes.TfsGit, TestSettings.RepositoryId, "refs/heads/master");
        assert.isNotNull(badge, "badge was null when it shouldn't have been");
    });

});
