/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { CredentialInfo } from "../../src/info/credentialinfo";
import { ExtensionRequestHandler } from "../../src/info/extensionrequesthandler";

describe("CredentialInfo", function() {

    it("should ensure all properties work as expected", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("username", "password", "domain", "workstation");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        assert.equal(credentialInfo.Username, "username");
        assert.equal(credentialInfo.Password, "password");
        assert.equal(credentialInfo.Domain, "domain");
        assert.equal(credentialInfo.Workstation, "workstation");
    });

    it("should ensure PAT returns a BasicCredentialHandler", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("pat-token");
        const basic: ExtensionRequestHandler = <ExtensionRequestHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(basic);
        assert.equal(basic.Password, "pat-token");
    });

    it("should ensure username + password returns an NtlmCredentialHandler", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("username", "password");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        const ntlm: ExtensionRequestHandler = <ExtensionRequestHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.Username, "username");
        assert.equal(ntlm.Password, "password");
    });

    it("should ensure username + password + domain returns an NtlmCredentialHandler", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("username", "password", "domain");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        const ntlm: ExtensionRequestHandler = <ExtensionRequestHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.Username, "username");
        assert.equal(ntlm.Password, "password");
    });

    it("should ensure username + password + domain + workstation returns an NtlmCredentialHandler", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("username", "password", "domain", "workstation");
        assert.isDefined(credentialInfo);
        assert.isDefined(credentialInfo.CredentialHandler);
        const ntlm: ExtensionRequestHandler = <ExtensionRequestHandler>(credentialInfo.CredentialHandler);
        assert.isDefined(ntlm);
        assert.equal(ntlm.Username, "username");
        assert.equal(ntlm.Password, "password");
        assert.equal(ntlm.Domain, "domain");
        assert.equal(ntlm.Workstation, "workstation");
    });

    it("should ensure properties work as intended", function() {
        const credentialInfo: CredentialInfo = new CredentialInfo("pat-token");
        const basic: ExtensionRequestHandler = <ExtensionRequestHandler>(credentialInfo.CredentialHandler);
        credentialInfo.CredentialHandler = undefined;
        assert.isUndefined(credentialInfo.CredentialHandler);
        credentialInfo.CredentialHandler = basic;
        assert.isNotNull(credentialInfo.CredentialHandler);
    });
});
