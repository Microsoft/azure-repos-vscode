/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { scm, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { PinnedQuerySettings } from "./helpers/settings";
import { CommandNames, Constants, TelemetryEvents, WitTypes } from "./helpers/constants";
import { Logger } from "./helpers/logger";
import { Strings } from "./helpers/strings";
import { Utils } from "./helpers/utils";
import { UrlMessageItem, VsCodeUtils } from "./helpers/vscodeutils";
import { RepositoryType } from "./contexts/repositorycontext";
import { BuildClient } from "./clients/buildclient";
import { GitClient } from "./clients/gitclient";
import { WitClient } from "./clients/witclient";
import { Telemetry } from "./services/telemetry";
import { ExtensionManager } from "./extensionmanager";

import * as os from "os";

/* tslint:disable:no-unused-variable */
import Q = require("q");
/* tslint:enable:no-unused-variable */

export class TeamExtension  {
    private _manager: ExtensionManager;
    private _buildStatusBarItem: StatusBarItem;
    private _pullRequestStatusBarItem: StatusBarItem;
    private _pinnedQueryStatusBarItem: StatusBarItem;
    private _buildClient: BuildClient;
    private _gitClient: GitClient;
    private _witClient: WitClient;
    private _pinnedQuerySettings: PinnedQuerySettings;
    private _pollingTimer: NodeJS.Timer;
    private _initialTimer: NodeJS.Timer;

    constructor(manager: ExtensionManager) {
        this._manager = manager;
    }

    //Gets any available build status information and adds it to the status bar
    public DisplayCurrentBranchBuildStatus(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this._buildClient.DisplayCurrentBuildStatus(this._manager.RepoContext, false, this._manager.Settings.BuildDefinitionId);
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Initial method to display, select and navigate to my pull requests
    public GetMyPullRequests(): void {
        if (this._manager.EnsureInitialized(RepositoryType.GIT)) {
            if (this._gitClient) {
                this._gitClient.GetMyPullRequests();
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    public async Signin() {
        // For Signin, we just need to verify _serverContext and don't want to set this._errorMessage
        if (this._manager.ServerContext !== undefined && this._manager.ServerContext.RepoInfo !== undefined && this._manager.ServerContext.RepoInfo.IsTeamFoundation === true) {
            if (this._manager.ServerContext.RepoInfo.IsTeamFoundationServer === true) {
                let defaultUsername : string = this.getDefaultUsername();
                let username: string = await window.showInputBox({ value: defaultUsername || "", prompt: Strings.ProvideUsername + " (" + this._manager.ServerContext.RepoInfo.Account + ")", placeHolder: "", password: false });
                if (username !== undefined && username.length > 0) {
                    let password: string = await window.showInputBox({ value: "", prompt: Strings.ProvidePassword + " (" + username + ")", placeHolder: "", password: true });
                    if (password !== undefined) {
                        Logger.LogInfo("Signin: Username and Password provided as authentication.");
                        this._manager.CredentialManager.StoreCredentials(this._manager.ServerContext.RepoInfo.Host, username, password).then(() => {
                            // We don't test the credentials to make sure they're good here.  Do so on the next command that's run.
                            this._manager.Reinitialize();
                        }).catch((reason) => {
                            // TODO: Should the message direct the user to open an issue?  send feedback?
                            let msg: string = Strings.UnableToStoreCredentials + this._manager.ServerContext.RepoInfo.Host;
                            this._manager.ReportError(msg, reason, true);
                        });
                    }
                }
            } else if (this._manager.ServerContext.RepoInfo.IsTeamServices === true) {
                // Until Device Flow, we can prompt for the PAT for Team Services
                let token: string = await window.showInputBox({ value: "", prompt: Strings.ProvideAccessToken + " (" + this._manager.ServerContext.RepoInfo.Account + ")", placeHolder: "", password: true });
                if (token !== undefined) {
                    Logger.LogInfo("Signin: Personal Access Token provided as authentication.");
                    this._manager.CredentialManager.StoreCredentials(this._manager.ServerContext.RepoInfo.Host, Constants.OAuth, token).then(() => {
                        this._manager.Reinitialize();
                    }).catch((reason) => {
                        // TODO: Should the message direct the user to open an issue?  send feedback?
                        let msg: string = Strings.UnableToStoreCredentials + this._manager.ServerContext.RepoInfo.Host;
                        this._manager.ReportError(msg, reason, true);
                    });
                }
            }
        } else {
            let messageItem : UrlMessageItem = { title : Strings.LearnMore,
                                url : Constants.ReadmeLearnMoreUrl,
                                telemetryId: TelemetryEvents.ReadmeLearnMoreClick };
            VsCodeUtils.ShowErrorMessageWithOptions(Strings.NoRepoInformation, messageItem).then((item) => {
                if (item) {
                    Utils.OpenUrl(item.url);
                    Telemetry.SendEvent(item.telemetryId);
                }
            });
        }
    }

    public Signout() {
        // For Logout, we just need to verify _serverContext and don't want to set this._errorMessage
        if (this._manager.ServerContext !== undefined && this._manager.ServerContext.RepoInfo !== undefined && this._manager.ServerContext.RepoInfo.IsTeamFoundation === true) {
            this._manager.CredentialManager.RemoveCredentials(this._manager.ServerContext.RepoInfo.Host).then(() => {
                Logger.LogInfo("Signout: Removed credentials for host '" + this._manager.ServerContext.RepoInfo.Host + "'");
                this._manager.Reinitialize();
            }).catch((reason) => {
                let msg: string = Strings.UnableToRemoveCredentials + this._manager.ServerContext.RepoInfo.Host;
                this._manager.ReportError(msg, reason, true);
            });
        } else {
            this._manager.DisplayErrorMessage(Strings.NoRepoInformation);
        }
    }

    //Opens the build summary page for a particular build
    public OpenBlamePage(): void {
        if (this._manager.EnsureInitialized(RepositoryType.GIT)) {
            if (this._gitClient) {
                this._gitClient.OpenBlamePage(this._manager.RepoContext);
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens the build summary page for a particular build
    public OpenBuildSummaryPage(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this._buildClient.OpenBuildSummaryPage();
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens the file history page for the currently active file
    public OpenFileHistory(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            if (this._manager.RepoContext.Type === RepositoryType.GIT && this._gitClient) {
                this._gitClient.OpenFileHistory(this._manager.RepoContext);
            } else if (this._manager.RepoContext.Type === RepositoryType.TFVC) {
                this._manager.Tfvc.ViewHistory();
            } else {
                this._manager.DisplayErrorMessage(Strings.NoRepoInformation);
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens a browser to a new Bug
    public OpenNewBug(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            //Bug is in all three templates
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewItem(WitTypes.Bug, taskTitle);
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens a browser to a new pull request for the current branch
    public OpenNewPullRequest(): void {
        if (this._manager.EnsureInitialized(RepositoryType.GIT)) {
            if (this._gitClient) {
                this._gitClient.OpenNewPullRequest(this._manager.RepoContext.RemoteUrl, this._manager.RepoContext.CurrentBranch);
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens a browser to a new Task
    public OpenNewTask(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            //Issue is only in Agile and CMMI templates (not Scrum)
            //Task is in all three templates (Agile, CMMI, Scrum)
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewItem(WitTypes.Task, taskTitle);
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens a browser to a new work item (based on the work item type selected)
    public OpenNewWorkItem(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewWorkItem(taskTitle);
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens the main pull requests page
    public OpenPullRequestsPage(): void {
        if (this._manager.EnsureInitialized(RepositoryType.GIT)) {
            if (this._gitClient) {
                this._gitClient.OpenPullRequestsPage();
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Opens the team project web site
    public OpenTeamProjectWebSite(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            Telemetry.SendEvent(TelemetryEvents.OpenTeamSite);
            Logger.LogInfo("OpenTeamProjectWebSite: " + this._manager.ServerContext.RepoInfo.TeamProjectUrl);
            Utils.OpenUrl(this._manager.ServerContext.RepoInfo.TeamProjectUrl);
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Meant to be used when coming back online via status bar items
    public RefreshPollingStatus(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this.refreshPollingItems();
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Prompts for either a smile or frown, feedback text and an optional email address
    public SendFeedback(): void {
        //SendFeedback doesn't need to ensure the extension is initialized
        this._manager.FeedbackClient.SendFeedback();
    }

    //Returns a list of strings representing the work items that the user chose
    // strings are in the form "#id - description"
    public async ChooseWorkItems(): Promise<string[]> {
        return await this._witClient.ChooseWorkItems();
    }

    //Returns the list of work items assigned directly to the current user
    public ViewMyWorkItems(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this._witClient.ShowMyWorkItems();
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Returns the list of work items from the pinned query
    public ViewPinnedQueryWorkItems(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this._witClient.ShowPinnedQueryWorkItems();
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    //Navigates to a work item chosen from the results of a user-selected "My Queries" work item query
    //This method first displays the queries under "My Queries" and, when one is chosen, displays the associated work items.
    //If a work item is chosen, it is opened in the web browser.
    public ViewWorkItems(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            this._witClient.ShowMyWorkItemQueries();
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    public async AssociateWorkItems(): Promise<void> {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            Telemetry.SendEvent(TelemetryEvents.AssociateWorkItems);
            let workitems: string[] = await this.ChooseWorkItems();
            for (let i: number = 0; i < workitems.length; i++) {
                // Append the string to end of the message
                // Note: we are prefixing the message with a space so that the # char is not in the first column
                //       This helps in case the user ends up editing the comment from the Git command line
                this.appendToCheckinMessage(" " + workitems[i]);
            }
        } else {
            this._manager.DisplayErrorMessage();
        }
    }

    private appendToCheckinMessage(line: string): void {
        const previousMessage = scm.inputBox.value;
        if (previousMessage) {
            scm.inputBox.value = previousMessage + "\n" + line;
        } else {
            scm.inputBox.value = line;
        }
    }

    private getDefaultUsername() : string {
        if (os.platform() === "win32") {
            let defaultUsername: string;
            let domain: string = process.env.USERDOMAIN || "";
            let username: string = process.env.USERNAME || "";
            if (domain !== undefined) {
                defaultUsername = domain;
            }
            if (username !== undefined) {
                if (defaultUsername === undefined) {
                    return username;
                }
                return defaultUsername + "\\" + username;
            }
        }
        return undefined;
    }

    //Set up the initial status bars
    public InitializeStatusBars() {
        //Only initialize the status bar item if this is a Git repository
        if (this._manager.RepoContext.Type === RepositoryType.GIT) {
            if (!this._pullRequestStatusBarItem) {
                this._pullRequestStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 99);
                this._pullRequestStatusBarItem.command = CommandNames.GetPullRequests;
                this._pullRequestStatusBarItem.text = GitClient.GetPullRequestStatusText(0);
                this._pullRequestStatusBarItem.tooltip = Strings.BrowseYourPullRequests;
                this._pullRequestStatusBarItem.show();
            }
        }

        if (!this._buildStatusBarItem) {
            this._buildStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 98);
            this._buildStatusBarItem.command = CommandNames.OpenBuildSummaryPage;
            this._buildStatusBarItem.text = `$(icon octicon-package) ` + `$(icon octicon-dash)`;
            this._buildStatusBarItem.tooltip = Strings.NoBuildsFound;
            this._buildStatusBarItem.show();
        }

        if (!this._pinnedQueryStatusBarItem) {
            this._pinnedQueryStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 97);
            this._pinnedQueryStatusBarItem.command = CommandNames.ViewPinnedQueryWorkItems;
            this._pinnedQueryStatusBarItem.text = WitClient.GetPinnedQueryStatusText(0);
            this._pinnedQueryStatusBarItem.tooltip = Strings.ViewYourPinnedQuery;
            this._pinnedQueryStatusBarItem.show();
        }
    }

    public InitializeClients(repoType: RepositoryType) : void {
        //We can initialize for any repo type (just skip _gitClient if not Git)
        this._pinnedQuerySettings = new PinnedQuerySettings(this._manager.ServerContext.RepoInfo.Account);
        this._buildClient = new BuildClient(this._manager.ServerContext, this._buildStatusBarItem);
        //Don't initialize the Git client if we aren't a Git repository
        if (repoType === RepositoryType.GIT) {
            this._gitClient = new GitClient(this._manager.ServerContext, this._pullRequestStatusBarItem);
        }
        this._witClient = new WitClient(this._manager.ServerContext, this._pinnedQuerySettings.PinnedQuery, this._pinnedQueryStatusBarItem);
        this.startPolling();
    }

    private pollBuildStatus(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            Logger.LogInfo("Polling for latest current build status...");
            this._buildClient.DisplayCurrentBuildStatus(this._manager.RepoContext, true, this._manager.Settings.BuildDefinitionId);
        }
    }

    private pollMyPullRequests(): void {
        //Since we're polling, we don't want to display an error every so often
        //if user opened a TFVC repository (via EnsureInitialized).  So send
        //ALL to EnsureInitialized but check it before actually polling.
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            //Only poll for pull requests when repository is Git
            if (this._manager.RepoContext.Type === RepositoryType.GIT) {
                Logger.LogInfo("Polling for pull requests...");
                this._gitClient.PollMyPullRequests();
            }
        }
    }

    private pollPinnedQuery(): void {
        if (this._manager.EnsureInitialized(RepositoryType.ANY)) {
            Logger.LogInfo("Polling for the pinned work itemquery");
            this._witClient.PollPinnedQuery();
        }
    }

    //Polls for latest pull requests and current branch build status information
    private refreshPollingItems(): void {
        this.pollMyPullRequests();
        this.pollBuildStatus();
        this.pollPinnedQuery();
    }

    //Sets up the interval to refresh polling items
    private startPolling(): void {
        if (!this._pollingTimer) {
            this._initialTimer = setTimeout(() => this.refreshPollingItems(), 1000 * 8);
            this._pollingTimer = setInterval(() => this.refreshPollingItems(), 1000 * 60 * this._manager.Settings.PollingInterval);
        }
    }

    public NotifyBranchChanged(currentBranch: string) : void {
        this.refreshPollingItems();
    }

    dispose() {
        if (this._pollingTimer) {
            if (this._initialTimer) {
                clearTimeout(this._initialTimer);
            }
            clearInterval(this._pollingTimer);
            this._pollingTimer = undefined;
        }
        if (this._pullRequestStatusBarItem !== undefined) {
            this._pullRequestStatusBarItem.dispose();
            this._pullRequestStatusBarItem = undefined;
        }
        if (this._buildStatusBarItem !== undefined) {
            this._buildStatusBarItem.dispose();
            this._buildStatusBarItem = undefined;
        }
        if (this._pinnedQueryStatusBarItem !== undefined) {
            this._pinnedQueryStatusBarItem.dispose();
            this._pinnedQueryStatusBarItem = undefined;
        }
    }
}
