/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";
const path = require("path");

import { BuildResult } from "vso-node-api/interfaces/BuildInterfaces";
import { Utils }  from "../../src/helpers/utils";
import { Strings }  from "../../src/helpers/strings";

describe("Utils", function() {
    let TEST_REPOS_FOLDER: string = "testrepos";
    let DOT_GIT_FOLDER: string = "dotgit";

    beforeEach(function() {
        //
    });

    it("should verify IsOffline", function() {
        let reason = { code: "ENOENT" };
        assert.isTrue(Utils.IsOffline(reason));
        reason = { code: "ENOTFOUND" };
        assert.isTrue(Utils.IsOffline(reason));
        reason = { code: "EAI_AGAIN" };
        assert.isTrue(Utils.IsOffline(reason));
        let reason2 = { statusCode: "ENOENT" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason2 = { statusCode: "ENOTFOUND" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason2 = { statusCode: "EAI_AGAIN" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason = { code: "404" };
        assert.isFalse(Utils.IsOffline(reason));
    });

    it("should verify IsUnauthorized", function() {
        let reason = { code: 401 };
        assert.isTrue(Utils.IsUnauthorized(reason));
        let reason2 = { statusCode: 401 };
        assert.isTrue(Utils.IsUnauthorized(reason2));
    });

    it("should verify GetMessageForStatusCode with 401", function() {
        let reason = { code: "401" };
        let message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCode401);
    });

    it("should verify GetMessageForStatusCode for offline - ENOENT", function() {
        let reason = { code: "ENOENT" };
        let message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for offline - ENOTFOUND", function() {
        let reason = { code: "ENOTFOUND" };
        let message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for offline - EAI_AGAIN", function() {
        let reason = { code: "EAI_AGAIN" };
        let message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for 404", function() {
        let reason = { statusCode: "404" };
        let msg = "This should be the message that is returned.";

        let message: string = Utils.GetMessageForStatusCode(reason, msg);
        assert.equal(message, msg);
    });

    it("should verify GetMessageForStatusCode for 401 with prefix", function() {
        let reason = { statusCode: "401" };
        let msg = Strings.StatusCode401;
        let prefix: string = "PREFIX:";

        let message: string = Utils.GetMessageForStatusCode(reason, msg, prefix);
        assert.equal(message, prefix + " " + msg);
    });

    it("should verify FindGitFolder with subfolder", function() {
        let repoName: string = "gitreposubfolder";
        let repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, "folder", "subfolder");
        // Pass in DOT_GIT_FOLDER to find our test repo folder
        let actualRepoPath: string = Utils.FindGitFolder(repoPath, DOT_GIT_FOLDER);
        // Although we started with a subfolder in the repository, ensure we get the DOT_GIT_FOLDER
        assert.equal(actualRepoPath, path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER));
    });

    it("should verify GetBuildResultIcon with all values", function() {
        expect(Utils.GetBuildResultIcon(BuildResult.Succeeded)).to.equal("octicon-check");
        expect(Utils.GetBuildResultIcon(BuildResult.Canceled)).to.equal("octicon-alert");
        expect(Utils.GetBuildResultIcon(BuildResult.Failed)).to.equal("octicon-stop");
        expect(Utils.GetBuildResultIcon(BuildResult.PartiallySucceeded)).to.equal("octicon-alert");
        expect(Utils.GetBuildResultIcon(BuildResult.None)).to.equal("octicon-question");
        expect(Utils.GetBuildResultIcon(undefined)).to.equal("octicon-question");
    });

    it("should verify IsProxyEnabled", function() {
        let httpProxy: string = process.env.HTTP_PROXY;
        let httpsProxy: string = process.env.HTTPS_PROXY;
        try {
            process.env.HTTP_PROXY = "vsts-vscode unit tests";
            assert.isTrue(Utils.IsProxyEnabled());
            process.env.HTTP_PROXY = "";
            process.env.HTTPS_PROXY = "vsts-vscode unit tests";
            assert.isTrue(Utils.IsProxyEnabled());
            process.env.HTTPS_PROXY = "";
        } finally {
            if (httpProxy) {
                process.env.HTTP_PROXY = httpProxy;
            }
            if (httpsProxy) {
                process.env.HTTPS_PROXY = httpsProxy;
            }
        }
    });

    it("should verify IsProxyIssue", function() {
        let httpProxy: string = process.env.HTTP_PROXY;
        try {
            process.env.HTTP_PROXY = "vsts-vscode unit tests";
            let reason = { code: "ECONNRESET" };
            assert.isTrue(Utils.IsProxyIssue(reason));
            let reason2 = { statusCode: "ECONNRESET" };
            assert.isTrue(Utils.IsProxyIssue(reason2));
            let reason3 = { code: "ECONNREFUSED" };
            assert.isTrue(Utils.IsProxyIssue(reason3));
            let reason4 = { statusCode: "ECONNREFUSED" };
            assert.isTrue(Utils.IsProxyIssue(reason4));
        } finally {
            if (httpProxy) {
                process.env.HTTP_PROXY = httpProxy;
            }
        }
    });
});
