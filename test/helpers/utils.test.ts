/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";
const path = require("path");

import { BuildResult } from "vso-node-api/interfaces/BuildInterfaces";
import { Utils } from "../../src/helpers/utils";
import { Strings } from "../../src/helpers/strings";

describe("Utils", function() {
    const TEST_REPOS_FOLDER: string = "testrepos";
    const DOT_GIT_FOLDER: string = "dotgit";

    beforeEach(function() {
        //
    });

    it("should verify IsOffline", function() {
        let reason: any = { code: "ENOENT" };
        assert.isTrue(Utils.IsOffline(reason));
        reason = { code: "ENOTFOUND" };
        assert.isTrue(Utils.IsOffline(reason));
        reason = { code: "EAI_AGAIN" };
        assert.isTrue(Utils.IsOffline(reason));
        let reason2: any = { statusCode: "ENOENT" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason2 = { statusCode: "ENOTFOUND" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason2 = { statusCode: "EAI_AGAIN" };
        assert.isTrue(Utils.IsOffline(reason2));
        reason = { code: "404" };
        assert.isFalse(Utils.IsOffline(reason));
    });

    it("should verify IsUnauthorized", function() {
        const reason = { code: 401 };
        assert.isTrue(Utils.IsUnauthorized(reason));
        const reason2 = { statusCode: 401 };
        assert.isTrue(Utils.IsUnauthorized(reason2));
        //If no reason, isUnauthorized should be false
        assert.isFalse(Utils.IsUnauthorized(undefined));
    });

    it("should verify GetMessageForStatusCode with 401", function() {
        const reason = { code: "401" };
        const message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCode401);
    });

    it("should verify GetMessageForStatusCode for offline - ENOENT", function() {
        const reason = { code: "ENOENT" };
        const message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for offline - ENOTFOUND", function() {
        const reason = { code: "ENOTFOUND" };
        const message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for offline - EAI_AGAIN", function() {
        const reason = { code: "EAI_AGAIN" };
        const message: string = Utils.GetMessageForStatusCode(reason);
        assert.equal(message, Strings.StatusCodeOffline);
    });

    it("should verify GetMessageForStatusCode for proxy - ECONNRESET", function() {
        const reason = { code: "ECONNRESET" };
        process.env.HTTP_PROXY = "azure-repos-vscode unit tests";
        const message: string = Utils.GetMessageForStatusCode(reason);
        process.env.HTTP_PROXY = "";
        assert.equal(message, Strings.ProxyUnreachable);
    });

    it("should verify GetMessageForStatusCode for proxy - ECONNREFUSED", function() {
        const reason = { code: "ECONNREFUSED" };
        process.env.HTTP_PROXY = "azure-repos-vscode unit tests";
        const message: string = Utils.GetMessageForStatusCode(reason);
        process.env.HTTP_PROXY = "";
        assert.equal(message, Strings.ProxyUnreachable);
    });

    it("should verify GetMessageForStatusCode for no proxy - ECONNRESET", function() {
        const reason = { code: "ECONNRESET" };
        process.env.HTTP_PROXY = "";
        const message: string = Utils.GetMessageForStatusCode(reason, "default message");
        assert.equal(message, "default message");
    });

    it("should verify GetMessageForStatusCode for no proxy - ECONNREFUSED", function() {
        const reason = { code: "ECONNREFUSED" };
        process.env.HTTP_PROXY = "";
        const message: string = Utils.GetMessageForStatusCode(reason, "default message");
        assert.equal(message, "default message");
    });

    it("should verify GetMessageForStatusCode for 404", function() {
        const reason = { statusCode: "404" };
        const msg = "This should be the message that is returned.";

        const message: string = Utils.GetMessageForStatusCode(reason, msg);
        assert.equal(message, msg);
    });

    it("should verify GetMessageForStatusCode for 401 with prefix", function() {
        const reason = { statusCode: "401" };
        const msg = Strings.StatusCode401;
        const prefix: string = "PREFIX:";

        const message: string = Utils.GetMessageForStatusCode(reason, msg, prefix);
        assert.equal(message, prefix + " " + msg);
    });

    it("should verify FindGitFolder with subfolder", function() {
        const repoName: string = "gitreposubfolder";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, repoName, "folder", "subfolder");
        // Pass in DOT_GIT_FOLDER to find our test repo folder
        const actualRepoPath: string = Utils.FindGitFolder(repoPath, DOT_GIT_FOLDER);
        // Although we started with a subfolder in the repository, ensure we get the DOT_GIT_FOLDER
        assert.equal(actualRepoPath, path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER));
    });

    it("should verify FindGitFolder with worktree", function() {
        const worktree: string = "worktree";
        const repoName: string = "gitreposubfolder";
        const repoPath: string = path.join(__dirname, TEST_REPOS_FOLDER, worktree);
        // Pass in DOT_GIT_FOLDER to find our test repo folder
        const actualRepoPath: string = Utils.FindGitFolder(repoPath, DOT_GIT_FOLDER);
        // Although we started with a subfolder in the repository, ensure we get the DOT_GIT_FOLDER
        assert.equal(actualRepoPath, path.join(__dirname, TEST_REPOS_FOLDER, repoName, DOT_GIT_FOLDER));
    });

    it("should verify FindGitFolder with no found .git folder", function() {
        const repoPath: string = __dirname;
        //We need use DOT_GIT_FOLDER here since the test resides in a .git repository
        const actualRepoPath: string = Utils.FindGitFolder(repoPath, DOT_GIT_FOLDER);
        assert.isUndefined(actualRepoPath);
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
        const httpProxy: string = process.env.HTTP_PROXY;
        const httpsProxy: string = process.env.HTTPS_PROXY;
        try {
            process.env.HTTP_PROXY = "azure-repos-vscode unit tests";
            assert.isTrue(Utils.IsProxyEnabled());
            process.env.HTTP_PROXY = "";
            assert.isFalse(Utils.IsProxyEnabled());
            process.env.HTTPS_PROXY = "azure-repos-vscode unit tests";
            assert.isTrue(Utils.IsProxyEnabled());
            process.env.HTTPS_PROXY = "";
            assert.isFalse(Utils.IsProxyEnabled());
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
        const httpProxy: string = process.env.HTTP_PROXY;
        try {
            process.env.HTTP_PROXY = "azure-repos-vscode unit tests";
            let reason: any = { code: "ECONNRESET" };
            assert.isTrue(Utils.IsProxyIssue(reason));
            let reason2: any = { statusCode: "ECONNRESET" };
            assert.isTrue(Utils.IsProxyIssue(reason2));
            let reason3: any = { code: "ECONNREFUSED" };
            assert.isTrue(Utils.IsProxyIssue(reason3));
            let reason4: any = { statusCode: "ECONNREFUSED" };
            assert.isTrue(Utils.IsProxyIssue(reason4));
            //With proxy enabled, an undefined message should be false
            assert.isFalse(Utils.IsProxyIssue(undefined));
            process.env.HTTP_PROXY = "";
            //With proxy not set, the following should not be proxy issues
            reason = { code: "ECONNRESET" };
            assert.isFalse(Utils.IsProxyIssue(reason));
            reason2 = { statusCode: "ECONNRESET" };
            assert.isFalse(Utils.IsProxyIssue(reason2));
            reason3 = { code: "ECONNREFUSED" };
            assert.isFalse(Utils.IsProxyIssue(reason3));
            reason4 = { statusCode: "ECONNREFUSED" };
            assert.isFalse(Utils.IsProxyIssue(reason4));
        } finally {
            if (httpProxy) {
                process.env.HTTP_PROXY = httpProxy;
            }
        }
    });
});
