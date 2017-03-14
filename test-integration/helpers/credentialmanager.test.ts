/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { CredentialManager } from "../../src/helpers/credentialmanager";
import { CredentialInfo } from "../../src/info/credentialinfo";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { Constants } from "../../src/helpers/constants";

describe("CredentialManager-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout); //http://mochajs.org/#timeouts

    let credentialManager: CredentialManager = new CredentialManager();
    let ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl);

    before(function() {
        //
    });
    beforeEach(function() {
        //
    });
    //afterEach(function() { });
    after(function() {
        //Ensure we're clean after each test (even if one failed)
        return credentialManager.RemoveCredentials(TestSettings.Account);
    });

    it("should verify store, get, remove credentials for Team Services (no token in settings)", async function() {
        try {
            await credentialManager.StoreCredentials(TestSettings.Account, TestSettings.AccountUser, TestSettings.Password);
            let credInfo: CredentialInfo = await credentialManager.GetCredentials(ctx, undefined);
            //For PATs, username stored with StoreCredentials doesn't matter (it's always returned as OAuth)
            assert.equal(credInfo.Username, Constants.OAuth);
            assert.equal(credInfo.Password, TestSettings.Password);
            await credentialManager.RemoveCredentials(TestSettings.Account);
            credInfo = await credentialManager.GetCredentials(ctx, undefined);
            //Ensure the creds we added get removed
            assert.isUndefined(credInfo);
        } catch (err) {
            console.log(err);
        }
    });

    it("should verify get and remove credentials for Team Services (with token in settings)", async function() {
        try {
            //Test scenario where the requested credential is not in the credential store but we're passing the token (from settings)
            let credInfo: CredentialInfo = await credentialManager.GetCredentials(ctx, TestSettings.SettingsPassword);
            //For PATs, username stored with StoreCredentials doesn't matter (it's always returned as OAuth)
            assert.equal(credInfo.Username, Constants.OAuth);
            assert.equal(credInfo.Password, TestSettings.SettingsPassword);
            await credentialManager.RemoveCredentials(TestSettings.Account);
            credInfo = await credentialManager.GetCredentials(ctx, undefined);
            //Ensure the creds we added get removed
            assert.isUndefined(credInfo);
        } catch (err) {
            console.log(err);
        }
    });

    it("should verify store, get, remove credentials for Team Services (with token in settings)", async function() {
        try {
            //Test scenario where the requested credential is in the store but we're also passing the token (from settings)
            await credentialManager.StoreCredentials(TestSettings.Account, TestSettings.AccountUser, TestSettings.Password);
            let credInfo: CredentialInfo = await credentialManager.GetCredentials(ctx, TestSettings.SettingsPassword);
            //For PATs, username stored with StoreCredentials doesn't matter (it's always returned as OAuth)
            assert.equal(credInfo.Username, Constants.OAuth);
            //We still expect to get the SettingsPassword and not Password
            assert.equal(credInfo.Password, TestSettings.SettingsPassword);
            await credentialManager.RemoveCredentials(TestSettings.Account);
            credInfo = await credentialManager.GetCredentials(ctx, undefined);
            //Ensure the creds we added get removed
            assert.isUndefined(credInfo);
        } catch (err) {
            console.log(err);
        }
    });

    it("should verify store, get, remove credentials for Team Foundation Server", async function() {
        try {
            let ctx: TeamServerContext = Mocks.TeamServerContext("http://java-tfs2015:8081/tfs/DefaultCollection/_git/GitJava");
            let account: string = "java-tfs2015:8081";
            let username: string = "domain\\user";
            let password: string = "password";

            await credentialManager.StoreCredentials(account, username, password);
            let credInfo: CredentialInfo = await credentialManager.GetCredentials(ctx, undefined);
            assert.equal(credInfo.Domain, "domain");
            assert.equal(credInfo.Username, "user");
            assert.equal(credInfo.Password, password);
            await credentialManager.RemoveCredentials(account);
            credInfo = await credentialManager.GetCredentials(ctx, undefined);
            //Ensure the creds we added get removed
            assert.isUndefined(credInfo);
        } catch (err) {
            console.log(err);
        }
    });
});
