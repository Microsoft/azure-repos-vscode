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

describe("ServerContext-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout);

    const credentialManager: CredentialManager = new CredentialManager();
    const ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);

    before(function() {
        return credentialManager.StoreCredentials(TestSettings.Account, TestSettings.AccountUser, TestSettings.Password);
    });
    beforeEach(function() {
        return credentialManager.GetCredentials(ctx);
    });
    // afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account);
    });

    it("should verify ServerContext CredentialHandler, UserInfo", function(done) {
        this.timeout(TestSettings.TestTimeout); //http://mochajs.org/#timeouts

        const ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        //Get coverage on CredentialHandler and UserInfo
        assert.isNotNull(ctx.CredentialHandler);
        expect(ctx.UserInfo).to.equal(undefined);
        done();
    });

});
