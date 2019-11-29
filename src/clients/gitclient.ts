/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { StatusBarItem, window } from "vscode";
import { GitPullRequest, PullRequestStatus} from "vso-node-api/interfaces/GitInterfaces";
import { BaseQuickPickItem, VsCodeUtils } from "../helpers/vscodeutils";
import { CommandNames, TelemetryEvents } from "../helpers/constants";
import { Logger } from "../helpers/logger";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { IRepositoryContext, RepositoryType } from "../contexts/repositorycontext";
import { TeamServerContext} from "../contexts/servercontext";
import { GitVcService, PullRequestScore } from "../services/gitvc";
import { Telemetry } from "../services/telemetry";
import { BaseClient } from "./baseclient";

import * as path from "path";

export class GitClient extends BaseClient {

    constructor(context: TeamServerContext, statusBarItem: StatusBarItem) {
        super(context, statusBarItem);
    }

    //Initial method to display, select and navigate to my pull requests
    public async GetMyPullRequests(): Promise<void> {
        Telemetry.SendEvent(TelemetryEvents.ViewPullRequests);

        try {
            const request: BaseQuickPickItem = await window.showQuickPick(this.getMyPullRequests(), { matchOnDescription: true, placeHolder: Strings.ChoosePullRequest });
            if (request) {
                Telemetry.SendEvent(TelemetryEvents.ViewPullRequest);
                let discUrl: string = undefined;
                if (request.id !== undefined) {
                    discUrl = GitVcService.GetPullRequestDiscussionUrl(this._serverContext.RepoInfo.RepositoryUrl, request.id);
                } else {
                    discUrl = GitVcService.GetPullRequestsUrl(this._serverContext.RepoInfo.RepositoryUrl);
                }
                Logger.LogInfo("Pull Request Url: " + discUrl);
                Utils.OpenUrl(discUrl);
            }
        } catch (err) {
            this.handleError(err, GitClient.GetOfflinePullRequestStatusText(), false, "Error selecting pull request from QuickPick");
        }
    }

    //Opens the blame page for the currently active file
    public OpenBlamePage(context: IRepositoryContext): void {
        this.ensureGitContext(context);
        let url: string = undefined;

        const editor = window.activeTextEditor;
        if (editor) {
            Telemetry.SendEvent(TelemetryEvents.OpenBlamePage);

            //Get the relative file path we can use to create the url
            let relativePath: string = "\\" + path.relative(context.RepositoryParentFolder, editor.document.fileName);
            relativePath = relativePath.split("\\").join("/");  //Replace all

            url = GitVcService.GetFileBlameUrl(context.RemoteUrl, relativePath, context.CurrentBranch);
            //Note: if file hasn't been pushed yet, blame link we generate won't point to anything valid (basically a 404)
            Logger.LogInfo("OpenBlame: " + url);
            Utils.OpenUrl(url);
        } else {
            const msg: string = Utils.GetMessageForStatusCode(0, Strings.NoSourceFileForBlame);
            Logger.LogError(msg);
            VsCodeUtils.ShowErrorMessage(msg);
        }
    }

    //Opens the file history page for the currently active file
    public OpenFileHistory(context: IRepositoryContext): void {
        this.ensureGitContext(context);
        let historyUrl: string = undefined;

        const editor = window.activeTextEditor;
        if (!editor) {
            Telemetry.SendEvent(TelemetryEvents.OpenRepositoryHistory);

            historyUrl = GitVcService.GetRepositoryHistoryUrl(context.RemoteUrl, context.CurrentBranch);
            Logger.LogInfo("OpenRepoHistory: " + historyUrl);
        } else {
            Telemetry.SendEvent(TelemetryEvents.OpenFileHistory);

            //Get the relative file path we can use to create the history url
            let relativePath: string = "\\" + path.relative(context.RepositoryParentFolder, editor.document.fileName);
            relativePath = relativePath.split("\\").join("/");  //Replace all

            historyUrl = GitVcService.GetFileHistoryUrl(context.RemoteUrl, relativePath, context.CurrentBranch);
            //Note: if file hasn't been pushed yet, history link we generate won't point to anything valid (basically a 404)
            Logger.LogInfo("OpenFileHistory: " + historyUrl);
        }

        Utils.OpenUrl(historyUrl);
    }

    public OpenNewPullRequest(remoteUrl: string, currentBranch: string): void {
        Telemetry.SendEvent(TelemetryEvents.OpenNewPullRequest);

        const url: string = GitVcService.GetCreatePullRequestUrl(remoteUrl, currentBranch);
        Logger.LogInfo("CreatePullRequestPage: " + url);
        Utils.OpenUrl(url);
    }

    public async PollMyPullRequests(): Promise<void> {
        try {
            const requests: BaseQuickPickItem[] = await this.getMyPullRequests();
            this._statusBarItem.tooltip = Strings.BrowseYourPullRequests;
            //Remove the default Strings.BrowseYourPullRequests item from the calculation
            this._statusBarItem.text = GitClient.GetPullRequestStatusText((requests.length - 1).toString());
        } catch (err) {
            this.handleError(err, GitClient.GetOfflinePullRequestStatusText(), true, "Attempting to poll my pull requests");
        }
    }

    private async getMyPullRequests(): Promise<BaseQuickPickItem[]> {
        const requestItems: BaseQuickPickItem[] = [];
        const requestIds: number[] = [];

        Logger.LogInfo("Getting pull requests that I requested...");
        const svc: GitVcService = new GitVcService(this._serverContext);
        const myPullRequests: GitPullRequest[] = await svc.GetPullRequests(this._serverContext.RepoInfo.RepositoryId, this._serverContext.UserInfo.Id, undefined, PullRequestStatus.Active);
        const icon: string = "search";
        const label: string = `$(${icon}) `;
        requestItems.push({ label: label + Strings.BrowseYourPullRequests, description: undefined, id: undefined });

        myPullRequests.forEach((pr) => {
            const score: PullRequestScore = GitVcService.GetPullRequestScore(pr);
            requestItems.push(this.getPullRequestLabel(pr.createdBy.displayName, pr.title, pr.description, pr.pullRequestId.toString(), score));
            requestIds.push(pr.pullRequestId);
        });
        Logger.LogInfo("Retrieved " + myPullRequests.length + " pull requests that I requested");

        Logger.LogInfo("Getting pull requests for which I'm a reviewer...");
        //Go get the active pull requests that I'm a reviewer for
        const myReviewPullRequests: GitPullRequest[] = await svc.GetPullRequests(this._serverContext.RepoInfo.RepositoryId, undefined, this._serverContext.UserInfo.Id, PullRequestStatus.Active);
        myReviewPullRequests.forEach((pr) => {
            const score: PullRequestScore = GitVcService.GetPullRequestScore(pr);
            if (requestIds.indexOf(pr.pullRequestId) < 0) {
                requestItems.push(this.getPullRequestLabel(pr.createdBy.displayName, pr.title, pr.description, pr.pullRequestId.toString(), score));
            }
        });
        Logger.LogInfo("Retrieved " + myReviewPullRequests.length + " pull requests that I'm the reviewer");

        //Remove the default Strings.BrowseYourPullRequests item from the calculation
        this._statusBarItem.text = GitClient.GetPullRequestStatusText((requestItems.length - 1).toString());
        this._statusBarItem.tooltip = Strings.BrowseYourPullRequests;
        this._statusBarItem.command = CommandNames.GetPullRequests;

        return requestItems;
    }

    private getPullRequestLabel(displayName: string, title: string, description: string, id: string, score: PullRequestScore): BaseQuickPickItem {
        let scoreIcon: string = "";
        if (score === PullRequestScore.Succeeded) {
            scoreIcon = "check";
        } else if (score === PullRequestScore.Failed) {
            scoreIcon = "stop";
        } else if (score === PullRequestScore.Waiting) {
            scoreIcon = "watch";
        } else if (score === PullRequestScore.NoResponse) {
            scoreIcon = "git-pull-request";
        }
        const scoreLabel: string = `$(${scoreIcon}) `;

        return { label: scoreLabel + " (" + displayName + ") " + title, description: description, id: id };
    }

    public static GetOfflinePullRequestStatusText() : string {
        return `$(git-pull-request) ???`;
    }

    //Sets the text on the pull request status bar
    public static GetPullRequestStatusText(total?: string) : string {
        if (!total) {
            return `$(git-pull-request) $(dash)`;
        }
        return `$(git-pull-request) ${total.toString()}`;
    }

    //Ensure that we don't accidentally send non-Git (e.g., TFVC) contexts to the Git client
    private ensureGitContext(context: IRepositoryContext): void {
        if (context.Type !== RepositoryType.GIT) {
            throw new Error("context sent to GitClient is not a Git context object.");
        }
    }
}
