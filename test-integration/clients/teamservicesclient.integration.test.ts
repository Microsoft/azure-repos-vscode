/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { QTeamServicesApi } from "../../src/clients/teamservicesclient";

var chai = require("chai");
/* tslint:disable:no-unused-variable */
var expect = chai.expect;
/* tslint:enable:no-unused-variable */
var assert = chai.assert;
chai.should();

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

    it("should verify repositoryClient.getVstsInfo", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        let repositoryClient: QTeamServicesApi = new QTeamServicesApi(TestSettings.RemoteRepositoryUrl(), [CredentialManager.GetCredentialHandler()]);
        repositoryClient.getVstsInfo().then(
            function (repoInfo) {
                //console.log(repoInfo);
                assert.isNotNull(repoInfo, "repoInfo was null when it shouldn't have been");
                assert.equal(repoInfo.serverUrl, TestSettings.AccountUrl());
                assert.equal(repoInfo.collection.name, TestSettings.CollectionName());
                assert.equal(repoInfo.repository.remoteUrl, TestSettings.RemoteRepositoryUrl());
                assert.equal(repoInfo.repository.id, TestSettings.RepositoryId());
                expect(repoInfo.repository.name).to.equal(TestSettings.RepositoryName());
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify repositoryClient.getVstsInfo and 404", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        let repositoryClient: QTeamServicesApi = new QTeamServicesApi(TestSettings.RemoteRepositoryUrl() + "1", [CredentialManager.GetCredentialHandler()]);
        repositoryClient.getVstsInfo().then(
            function (repoInfo) {
                //console.log(repoInfo);
                done();
            },
            function (err) {
                assert.isNotNull(err, "err was null when it shouldn't have been");
                expect(err.statusCode).to.equal(404);
                done();
            }
        );
    });

    it("should verify accountClient.connect", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        let accountClient: QTeamServicesApi = new QTeamServicesApi(TestSettings.AccountUrl(), [CredentialManager.GetCredentialHandler()]);
        accountClient.connect().then(
            function (settings) {
                //console.log(settings);
                assert.isNotNull(settings, "settings was null when it shouldn't have been");
                assert.isNotNull(settings.providerDisplayName);
                assert.isNotNull(settings.customDisplayName);
                assert.isNotNull(settings.authorizedUser.providerDisplayName);
                assert.isNotNull(settings.authorizedUser.customDisplayName);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });
});
