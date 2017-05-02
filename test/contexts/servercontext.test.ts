/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { TeamServerContext } from "../../src/contexts/servercontext";

describe("TeamServerContext", function() {

    it("should verify thrown Error for undefined remoteUrl", function() {
        try {
            new TeamServerContext(undefined);
        } catch (error) {
            assert.equal(error.message, "remoteUrl is undefined");
        }
    });

    it("should verify context is a TeamFoundation context with Team Services account", function() {
        // This could be a TFVC repository
        const context: TeamServerContext = new TeamServerContext("https://account.visualstudio.com/DefaultCollection/teamproject/");
        assert.isTrue(context.RepoInfo.IsTeamServices);
        assert.isTrue(context.RepoInfo.IsTeamFoundation);
        assert.isFalse(context.RepoInfo.IsTeamFoundationServer);
    });

    it("should verify context is a IsTeamServices and TeamFoundation context", function() {
        const context: TeamServerContext = new TeamServerContext("https://account.visualstudio.com/DefaultCollection/teamproject/_git/repositoryName");
        assert.isTrue(context.RepoInfo.IsTeamServices);
        assert.isTrue(context.RepoInfo.IsTeamFoundation);
        assert.isFalse(context.RepoInfo.IsTeamFoundationServer);
    });

    it("should verify context is a TeamFoundation context with TFS account", function() {
        const context: TeamServerContext = new TeamServerContext("http://server:8080/tfs/DefaultCollection/teamproject");
        assert.isFalse(context.RepoInfo.IsTeamServices, "isTeamServices should be false");
        //TODO: assert.isTrue(context.RepoInfo.IsTeamFoundation, "isTeamFoundation should be true");
        //TODO: assert.isFalse(context.RepoInfo.IsTeamFoundationServer, "isTeamFoundationServer should be true");
    });

});
