/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { CredentialInfo } from "../../src/info/credentialinfo";
import { BasicCredentialHandler } from "vso-node-api/handlers/basiccreds";
import { NtlmCredentialHandler } from "vso-node-api/handlers/ntlm";

describe("CredentialInfo", function() {

    it("should ensure PAT returns a BasicCredentialHandler", function() {
        let credentialInfo: CredentialInfo = new CredentialInfo("pat-token");
        let basic: BasicCredentialHandler = <BasicCredentialHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(basic);
        assert.equal(basic.password, "pat-token");
    });

    it("should ensure username + password returns an NtlmCredentialHandler", function() {
        let credentialInfo: CredentialInfo = new CredentialInfo("username", "password");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        let ntlm: NtlmCredentialHandler = <NtlmCredentialHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.username, "username");
        assert.equal(ntlm.password, "password");
    });

    it("should ensure username + password + domain returns an NtlmCredentialHandler", function() {
        let credentialInfo: CredentialInfo = new CredentialInfo("username", "password", "domain");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        let ntlm: NtlmCredentialHandler = <NtlmCredentialHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.username, "username");
        assert.equal(ntlm.password, "password");
    });

    it("should ensure username + password + domain + workstation returns an NtlmCredentialHandler", function() {
        let credentialInfo: CredentialInfo = new CredentialInfo("username", "password", "domain", "workstation");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        let ntlm: NtlmCredentialHandler = <NtlmCredentialHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.username, "username");
        assert.equal(ntlm.password, "password");
        assert.equal(ntlm.domain, "domain");
        assert.equal(ntlm.workstation, "workstation");
    });

    it("should ensure properties work as intended", function() {
        let credentialInfo: CredentialInfo = new CredentialInfo("pat-token");
        let basic: BasicCredentialHandler = <BasicCredentialHandler>(credentialInfo.CredentialHandler);
        credentialInfo.CredentialHandler = undefined;
        assert.isUndefined(credentialInfo.CredentialHandler);
        credentialInfo.CredentialHandler = basic;
        assert.isNotNull(credentialInfo.CredentialHandler);
    });
});
