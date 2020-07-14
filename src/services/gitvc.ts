/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { GitPullRequest, GitPullRequestSearchCriteria, GitRepository,
         PullRequestAsyncStatus, PullRequestStatus} from "vso-node-api/interfaces/GitInterfaces";
import { IGitApi } from "vso-node-api/GitApi";
import { WebApi } from "vso-node-api/WebApi";
import { TeamServerContext } from "../contexts/servercontext";
import { CredentialManager } from "../helpers/credentialmanager";
import { UrlBuilder } from "../helpers/urlbuilder";

export class GitVcService {
    private _gitApi: IGitApi;

    private static REVIEWER_VOTE_NO_RESPONSE: number = 0;
    private static REVIEWER_VOTE_APPROVED_WITH_SUGGESTIONS: number = 5;
    private static REVIEWER_VOTE_APPROVED: number = 10;
    private static REVIEWER_VOTE_WAITING_FOR_AUTHOR: number = -5;
    private static REVIEWER_VOTE_REJECTED: number = -10;

    constructor(context: TeamServerContext) {
        this._gitApi = new WebApi(context.RepoInfo.CollectionUrl, CredentialManager.GetCredentialHandler()).getGitApi();
    }

    //Returns a Promise containing an array of GitPullRequest objectss for the creator and repository
    //If creatorId is undefined, all pull requests will be returned
    public async GetPullRequests(repositoryId: string, creatorId?: string, reviewerId?: string, status?: PullRequestStatus): Promise<GitPullRequest[]> {
        const criteria: GitPullRequestSearchCriteria = { creatorId: creatorId, includeLinks: false, repositoryId: repositoryId, reviewerId: reviewerId,
                                                       sourceRefName: undefined, status: status, targetRefName: undefined };
        return await this._gitApi.getPullRequests(repositoryId, criteria);
    }

    //Returns a Promise containing an array of GitRepository objects for the project
    public async GetRepositories(project: string): Promise<GitRepository[]> {
        return await this._gitApi.getRepositories(project, false);
    }

    //Construct the url to the file blame information
    //https://account.visualstudio.com/defaultcollection/project/_git/VSCode.Extension#path=%2FREADME.md&version=GBmaster&annotate=true
    public static GetFileBlameUrl(remoteUrl: string, currentFile: string, currentBranch: string): string {
        const file: string = encodeURIComponent(currentFile);
        const branch: string = encodeURIComponent(currentBranch);
        return UrlBuilder.AddHashes(remoteUrl, `path=${file}`, `version=GB${branch}`, `annotate=true`);
    }

    //Construct the url to the individual file history
    //https://account.visualstudio.com/defaultcollection/project/_git/VSCode.Extension#path=%2FREADME.md&version=GBmaster&_a=history
    public static GetFileHistoryUrl(remoteUrl: string, currentFile: string, currentBranch: string): string {
        const file: string = encodeURIComponent(currentFile);
        const branch: string = encodeURIComponent(currentBranch);
        return UrlBuilder.AddHashes(remoteUrl, `path=${file}`, `version=GB${branch}`, `_a=history`);
    }

    //Construct the url to the repository history (by branch)
    //https://account.visualstudio.com/project/_git/VSCode.Extension/history?itemVersion=GBmaster&_a=history
    public static GetRepositoryHistoryUrl(remoteUrl: string, currentBranch: string): string {
        const branch: string = encodeURIComponent(currentBranch);
        const repoHistoryUrl: string = UrlBuilder.Join(remoteUrl, "history");
        return UrlBuilder.AddQueryParams(repoHistoryUrl, `itemVersion=GB${branch}`, `_a=history`);
    }

    //Today, simply craft a url to the create pull request web page
    //https://account.visualstudio.com/DefaultCollection/project/_git/VSCode.Health/pullrequests#_a=createnew&sourceRef=master
    public static GetCreatePullRequestUrl(remoteUrl: string, currentBranch: string): string {
        const branch: string = encodeURIComponent(currentBranch);
        return UrlBuilder.AddHashes(GitVcService.GetPullRequestsUrl(remoteUrl), `_a=createnew`, `sourceRef=${branch}`);
    }

    //Construct the url to the view pull request (discussion view)
    //https://account.visualstudio.com/DefaultCollection/VSOnline/project/_git/Java.VSCode/pullrequest/79184?view=discussion
    public static GetPullRequestDiscussionUrl(repositoryUrl: string, requestId: string): string {
        let discussionUrl: string = UrlBuilder.Join(repositoryUrl, "pullrequest", requestId);
//        discussionUrl = UrlBuilder.AddQueryParams(discussionUrl, "view=discussion");
        return discussionUrl;
    }

    //Construct the url to the main pull requests page
    //https://account.visualstudio.com/DefaultCollection/_git/project/pullrequests
    public static GetPullRequestsUrl(repositoryUrl: string): string {
        return UrlBuilder.Join(repositoryUrl, "pullrequests");
    }

    //Returns the 'score' of the pull request so the client knows if the PR failed,
    //didn't receive any reponses, succeeded or is waiting for the author.
    public static GetPullRequestScore(pullRequest: GitPullRequest): PullRequestScore {
        const mergeStatus: PullRequestAsyncStatus = pullRequest.mergeStatus;
        if (mergeStatus === PullRequestAsyncStatus.Conflicts
            || mergeStatus === PullRequestAsyncStatus.Failure
            || mergeStatus === PullRequestAsyncStatus.RejectedByPolicy) {
                return PullRequestScore.Failed;
        }

        let lowestVote: number = 0;
        let highestVote: number = 0;
        if (pullRequest.reviewers !== undefined && pullRequest.reviewers.length > 0) {
            pullRequest.reviewers.forEach((reviewer) => {
                const vote: number = reviewer.vote;
                if (vote < lowestVote) {
                    lowestVote = vote;
                }
                if (vote > highestVote) {
                    highestVote = vote;
                }
            });
        }

        let finalVote: number = GitVcService.REVIEWER_VOTE_NO_RESPONSE;
        if (lowestVote < GitVcService.REVIEWER_VOTE_NO_RESPONSE) {
            finalVote = lowestVote;
        } else if (highestVote > GitVcService.REVIEWER_VOTE_NO_RESPONSE) {
            finalVote = highestVote;
        }

        if (finalVote === GitVcService.REVIEWER_VOTE_APPROVED_WITH_SUGGESTIONS
            || finalVote === GitVcService.REVIEWER_VOTE_APPROVED) {
            return PullRequestScore.Succeeded;
        }
        if (finalVote === GitVcService.REVIEWER_VOTE_WAITING_FOR_AUTHOR) {
            return PullRequestScore.Waiting;
        }
        if (finalVote === GitVcService.REVIEWER_VOTE_REJECTED) {
            return PullRequestScore.Failed;
        }

        return PullRequestScore.NoResponse;
    }
}

export enum PullRequestScore {
    Failed = 0,
    NoResponse = 1,
    Succeeded = 2,
    Waiting = 3
}
