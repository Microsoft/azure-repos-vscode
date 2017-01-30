/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { TeamServicesApi } from "../../src/clients/teamservicesclient";

describe("TeamServicesClient-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout()); //http://mochajs.org/#timeouts

    var credentialManager: CredentialManager = new CredentialManager();
    var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());

    before(function() {
        return credentialManager.StoreCredentials(TestSettings.Account(), TestSettings.AccountUser(), TestSettings.Password());
    });
    beforeEach(function() {
        return credentialManager.GetCredentialHandler(ctx, undefined);
    });
    //afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account());
    });

    it("should verify repositoryClient.getVstsInfo", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        try {
            let repositoryClient: TeamServicesApi = new TeamServicesApi(TestSettings.RemoteRepositoryUrl(), [CredentialManager.GetCredentialHandler()]);
            let repoInfo: any = await repositoryClient.getVstsInfo();
            assert.isNotNull(repoInfo, "repoInfo was null when it shouldn't have been");
            assert.equal(repoInfo.serverUrl, TestSettings.AccountUrl());
            assert.equal(repoInfo.collection.name, TestSettings.CollectionName());
            assert.equal(repoInfo.repository.remoteUrl, TestSettings.RemoteRepositoryUrl());
            assert.equal(repoInfo.repository.id, TestSettings.RepositoryId());
            expect(repoInfo.repository.name).to.equal(TestSettings.RepositoryName());
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify repositoryClient.getVstsInfo and 404", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        try {
            let repositoryClient: TeamServicesApi = new TeamServicesApi(TestSettings.RemoteRepositoryUrl() + "1", [CredentialManager.GetCredentialHandler()]);
            let repoInfo: any = await repositoryClient.getVstsInfo();
            assert.isNull(repoInfo);
            done();
        } catch (err) {
            assert.isNotNull(err, "err was null when it shouldn't have been");
            expect(err.statusCode).to.equal(404);
            done();
        }
    });

    it("should verify accountClient.connect", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        try {
            let accountClient: TeamServicesApi = new TeamServicesApi(TestSettings.AccountUrl(), [CredentialManager.GetCredentialHandler()]);
            let settings: any = await accountClient.connect();
            //console.log(settings);
            assert.isNotNull(settings, "settings was null when it shouldn't have been");
            assert.isNotNull(settings.providerDisplayName);
            assert.isNotNull(settings.customDisplayName);
            assert.isNotNull(settings.authorizedUser.providerDisplayName);
            assert.isNotNull(settings.authorizedUser.customDisplayName);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify repositoryClient.validateTfvcCollectionUrl", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        let success: boolean;
        try {
            let repositoryClient: TeamServicesApi = new TeamServicesApi(TestSettings.RemoteTfvcRepositoryUrl(), [CredentialManager.GetCredentialHandler()]);
            await repositoryClient.validateTfvcCollectionUrl();
            success = true;
            done();
        } catch (err) {
            done(err);
        } finally {
            assert.isTrue(success);
        }
    });

    it("should verify repositoryClient.validateTfvcCollectionUrl and 404", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        try {
            let repositoryClient: TeamServicesApi = new TeamServicesApi(TestSettings.RemoteTfvcRepositoryUrl() + "1", [CredentialManager.GetCredentialHandler()]);
            await repositoryClient.validateTfvcCollectionUrl();
            assert.fail(undefined, undefined, "validateTfvcCollectionUrl should have thrown but didn't."); //It shouldn't get here
            done();
        } catch (err) {
            assert.isNotNull(err, "err was null when it shouldn't have been");
            expect(err.statusCode).to.equal(404);
            done();
        }
    });
});
