/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { GitPullRequest, PullRequestAsyncStatus } from "vso-node-api/interfaces/GitInterfaces";
import { GitVcService, PullRequestScore }  from "../../src/services/gitvc";

describe("GitVcService", function() {

    beforeEach(function() {
        //
    });

    it("should verify GetCreatePullRequestUrl", function() {
        let url: string = "https://account.visualstudio.com/DefaultCollection/project";
        let branch: string = "branch";

        assert.equal(GitVcService.GetCreatePullRequestUrl(url, branch), url + "/pullrequests#_a=createnew&sourceRef=" + branch);
    });

    it("should verify GetFileBlameUrl", function() {
        let url: string = "https://account.visualstudio.com/DefaultCollection/project";
        let file: string = "team-extension.ts";
        let branch: string = "branch";

        assert.equal(GitVcService.GetFileBlameUrl(url, file, branch), url + "#path=" + file + "&version=GB" + branch + "&annotate=true");
    });

    it("should verify GetFileHistoryUrl", function() {
        let url: string = "https://account.visualstudio.com/DefaultCollection/project";
        let file: string = "team-extension.ts";
        let branch: string = "branch";

        assert.equal(GitVcService.GetFileHistoryUrl(url, file, branch), url + "#path=" + file + "&version=GB" + branch + "&_a=history");
    });

    it("should verify GetPullRequestDiscussionUrl", function() {
        let repositoryUrl: string = "https://account.visualstudio.com/DefaultCollection/_git/project";
        let id: string = "42";

        assert.equal(GitVcService.GetPullRequestDiscussionUrl(repositoryUrl, id), repositoryUrl + "/pullrequest/" + id + "?view=discussion");
    });

    it("should verify GetPullRequestsUrl", function() {
        let repositoryUrl: string = "https://account.visualstudio.com/DefaultCollection/_git/project";

        assert.equal(GitVcService.GetPullRequestsUrl(repositoryUrl), repositoryUrl + "/pullrequests");
    });

    it("should verify GetPullRequestDiscussionUrl", function() {
        let repositoryUrl: string = "https://account.visualstudio.com/DefaultCollection/_git/project";
        let branch: string = "branch";

        assert.equal(GitVcService.GetRepositoryHistoryUrl(repositoryUrl, branch), repositoryUrl + "/history" + "?itemVersion=GB" + branch + "&_a=history");
    });

    it("should verify failed pull request score", function() {
        let pullRequest: GitPullRequest = {
            mergeStatus: PullRequestAsyncStatus.Conflicts,
            _links: undefined,
            closedDate: undefined,
            codeReviewId: undefined,
            commits: undefined,
            completionOptions: undefined,
            completionQueueTime: undefined,
            createdBy: undefined,
            creationDate: undefined,
            description: undefined,
            mergeId: undefined,
            lastMergeCommit: undefined,
            lastMergeSourceCommit: undefined,
            lastMergeTargetCommit: undefined,
            pullRequestId: undefined,
            remoteUrl: undefined,
            repository: undefined,
            reviewers: undefined,
            sourceRefName: undefined,
            status: undefined,
            targetRefName: undefined,
            title: undefined,
            autoCompleteSetBy: undefined,
            closedBy: undefined,
            artifactId: undefined,
            supportsIterations: undefined,
            url: undefined,
            workItemRefs: undefined
        };
        assert.equal(GitVcService.GetPullRequestScore(pullRequest), PullRequestScore.Failed);
        pullRequest.mergeStatus = PullRequestAsyncStatus.Failure;
        assert.equal(GitVcService.GetPullRequestScore(pullRequest), PullRequestScore.Failed);
        pullRequest.mergeStatus = PullRequestAsyncStatus.RejectedByPolicy;
        assert.equal(GitVcService.GetPullRequestScore(pullRequest), PullRequestScore.Failed);
    });

});
