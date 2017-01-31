/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { FileSystemWatcher, StatusBarAlignment, StatusBarItem, window, workspace } from "vscode";
import { AccountSettings, PinnedQuerySettings, Settings } from "./helpers/settings";
import { CommandNames, Constants, TelemetryEvents, WitTypes } from "./helpers/constants";
import { CredentialManager } from "./helpers/credentialmanager";
import { Logger } from "./helpers/logger";
import { Strings } from "./helpers/strings";
import { Utils } from "./helpers/utils";
import { UrlMessageItem, VsCodeUtils } from "./helpers/vscodeutils";
import { RepositoryContextFactory } from "./contexts/repocontextfactory";
import { IRepositoryContext, RepositoryType } from "./contexts/repositorycontext";
import { TeamServerContext} from "./contexts/servercontext";
import { TelemetryService } from "./services/telemetry";
import { TeamServicesApi } from "./clients/teamservicesclient";
import { BuildClient } from "./clients/buildclient";
import { FeedbackClient } from "./clients/feedbackclient";
import { GitClient } from "./clients/gitclient";
import { WitClient } from "./clients/witclient";
import { RepositoryInfoClient } from "./clients/repositoryinfoclient";
import { UserInfo } from "./info/userinfo";

var os = require("os");
var path = require("path");

/* tslint:disable:no-unused-variable */
import Q = require("q");
/* tslint:enable:no-unused-variable */

export class TeamExtension  {
    private _teamServicesStatusBarItem: StatusBarItem;
    private _buildStatusBarItem: StatusBarItem;
    private _pullRequestStatusBarItem: StatusBarItem;
    private _pinnedQueryStatusBarItem: StatusBarItem;
    private _errorMessage: string;
    private _telemetry: TelemetryService;
    private _buildClient: BuildClient;
    private _gitClient: GitClient;
    private _witClient: WitClient;
    private _feedbackClient: FeedbackClient;
    private _serverContext: TeamServerContext;
    private _repoContext: IRepositoryContext;
    private _settings: Settings;
    private _pinnedQuerySettings: PinnedQuerySettings;
    private _credentialManager : CredentialManager;

    constructor() {
        this.setupFileSystemWatcherOnConfig();

        this.initializeExtension();

        // Add the event listener for settings changes, then re-initialized the extension
        if (workspace) {
            workspace.onDidChangeConfiguration(() => {
                this.Reinitialize();
            });
        }
    }

    //Opens the pull request page given the remote and (current) branch
    public CreatePullRequest(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.CreatePullRequest(this._repoContext);
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Gets any available build status information and adds it to the status bar
    public DisplayCurrentBranchBuildStatus(): void {
        if (this.ensureInitialized()) {
            this._buildClient.DisplayCurrentBuildStatus(this._repoContext, false);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Initial method to display, select and navigate to my pull requests
    public GetMyPullRequests(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.GetMyPullRequests();
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    public async Login() {
        // For Login, we just need to verify _serverContext and don't want to set this._errorMessage
        if (this._serverContext !== undefined && this._serverContext.RepoInfo !== undefined && this._serverContext.RepoInfo.IsTeamFoundation === true) {
            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true) {
                let defaultUsername : string = this.getDefaultUsername();
                let username: string = await window.showInputBox({ value: defaultUsername || "", prompt: Strings.ProvideUsername + " (" + this._serverContext.RepoInfo.Account + ")", placeHolder: "", password: false });
                if (username !== undefined && username.length > 0) {
                    let password: string = await window.showInputBox({ value: "", prompt: Strings.ProvidePassword + " (" + username + ")", placeHolder: "", password: true });
                    if (password !== undefined) {
                        Logger.LogInfo("Login: Username and Password provided as authentication.");
                        this._credentialManager.StoreCredentials(this._serverContext.RepoInfo.Host, username, password).then(() => {
                            // We don't test the credentials to make sure they're good here.  Do so on the next command that's run.
                            this.Reinitialize();
                        }).catch((reason) => {
                            // TODO: Should the message direct the user to open an issue?  send feedback?
                            let msg: string = Strings.UnableToStoreCredentials + this._serverContext.RepoInfo.Host;
                            this._feedbackClient.ReportError(msg + " " + reason);
                            Logger.LogDebug(msg + " " + reason);
                            VsCodeUtils.ShowErrorMessage(msg);
                        });
                    }
                }
            } else if (this._serverContext.RepoInfo.IsTeamServices === true) {
                // Until Device Flow, we can prompt for the PAT for Team Services
                let token: string = await window.showInputBox({ value: "", prompt: Strings.ProvideAccessToken + " (" + this._serverContext.RepoInfo.Account + ")", placeHolder: "", password: true });
                if (token !== undefined) {
                    Logger.LogInfo("Login: Personal Access Token provided as authentication.");
                    this._credentialManager.StoreCredentials(this._serverContext.RepoInfo.Host, Constants.OAuth, token).then(() => {
                        this.Reinitialize();
                    }).catch((reason) => {
                        // TODO: Should the message direct the user to open an issue?  send feedback?
                        let msg: string = Strings.UnableToStoreCredentials + this._serverContext.RepoInfo.Host;
                        this._feedbackClient.ReportError(msg + " " + reason);
                        Logger.LogDebug(msg + " " + reason);
                        VsCodeUtils.ShowErrorMessage(msg);
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
                    this._feedbackClient.SendEvent(item.telemetryId);
                }
            });
        }
    }

    public Logout() {
        // For Logout, we just need to verify _serverContext and don't want to set this._errorMessage
        if (this._serverContext !== undefined && this._serverContext.RepoInfo !== undefined && this._serverContext.RepoInfo.IsTeamFoundation === true) {
            this._credentialManager.RemoveCredentials(this._serverContext.RepoInfo.Host).then(() => {
                Logger.LogInfo("Logout: Removed credentials for host '" + this._serverContext.RepoInfo.Host + "'");
                this.Reinitialize();
            }).catch((reason) => {
                let msg: string = Strings.UnableToRemoveCredentials + this._serverContext.RepoInfo.Host;
                this._feedbackClient.ReportError(msg + " " + reason);
                Logger.LogDebug(msg + " " + reason);
                VsCodeUtils.ShowErrorMessage(msg);
            });
        } else {
            VsCodeUtils.ShowErrorMessage(Strings.NoRepoInformation);
        }
    }

    //Opens the build summary page for a particular build
    public OpenBlamePage(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.OpenBlamePage(this._repoContext);
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens the build summary page for a particular build
    public OpenBuildSummaryPage(): void {
        if (this.ensureInitialized()) {
            this._buildClient.OpenBuildSummaryPage();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens the file history page for the currently active file
    public OpenFileHistory(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.OpenFileHistory(this._repoContext);
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens a browser to a new Bug
    public OpenNewBug(): void {
        if (this.ensureInitialized()) {
            //Bug is in all three templates
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewItem(WitTypes.Bug, taskTitle);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens a browser to a new pull request for the current branch
    public OpenNewPullRequest(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.OpenNewPullRequest(this._repoContext.RemoteUrl, this._repoContext.CurrentBranch);
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens a browser to a new Task
    public OpenNewTask(): void {
        if (this.ensureInitialized()) {
            //Issue is only in Agile and CMMI templates (not Scrum)
            //Task is in all three templates (Agile, CMMI, Scrum)
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewItem(WitTypes.Task, taskTitle);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens a browser to a new work item (based on the work item type selected)
    public OpenNewWorkItem(): void {
        if (this.ensureInitialized()) {
            let taskTitle = VsCodeUtils.GetActiveSelection();
            this._witClient.CreateNewWorkItem(taskTitle);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens the main pull requests page
    public OpenPullRequestsPage(): void {
        if (this.ensureInitialized()) {
            if (this._gitClient) {
                this._gitClient.OpenPullRequestsPage();
            }
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Opens the team project web site
    public OpenTeamProjectWebSite(): void {
        if (this.ensureInitialized()) {
            this._telemetry.SendEvent(TelemetryEvents.OpenTeamSite);
            Logger.LogInfo("OpenTeamProjectWebSite: " + this._serverContext.RepoInfo.TeamProjectUrl);
            Utils.OpenUrl(this._serverContext.RepoInfo.TeamProjectUrl);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Meant to be used when coming back online via status bar items
    public RefreshPollingStatus(): void {
        if (this.ensureInitialized()) {
            this.refreshPollingItems();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Meant to reinitialize the extension when coming back online
    public Reinitialize(): void {
        this.dispose();
        this.initializeExtension();
    }

    //Prompts for either a smile or frown, feedback text and an optional email address
    public SendFeedback(): void {
        //SendFeedback doesn't need to ensure the extension is initialized
        this._feedbackClient.SendFeedback();
    }

    //Returns the list of work items assigned directly to the current user
    public ViewMyWorkItems(): void {
        if (this.ensureInitialized()) {
            this._witClient.ShowMyWorkItems();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Returns the list of work items from the pinned query
    public ViewPinnedQueryWorkItems(): void {
        if (this.ensureInitialized()) {
            this._witClient.ShowPinnedQueryWorkItems();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Navigates to a work item chosen from the results of a user-selected "My Queries" work item query
    //This method first displays the queries under "My Queries" and, when one is chosen, displays the associated work items.
    //If a work item is chosen, it is opened in the web browser.
    public ViewWorkItems(): void {
        if (this.ensureInitialized()) {
            this._witClient.ShowMyWorkItemQueries();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    private displayNoCredentialsMessage(): void {
        let error: string = Strings.NoTeamServerCredentialsRunLogin;
        let displayError: string = Strings.NoTeamServerCredentialsRunLogin;
        let messageItem: UrlMessageItem = undefined;
        if (this._serverContext.RepoInfo.IsTeamServices === true) {
            messageItem = { title : Strings.LearnMore,
                            url : Constants.TokenLearnMoreUrl,
                            telemetryId: TelemetryEvents.TokenLearnMoreClick };
            //Need different messages for popup message and status bar
            error = Strings.NoAccessTokenRunLogin;
            displayError = Strings.NoAccessTokenLearnMoreRunLogin;
        }
        Logger.LogError(error);
        this.setErrorStatus(error, CommandNames.Login, false);
        VsCodeUtils.ShowErrorMessageWithOptions(displayError, messageItem).then((item) => {
            if (item) {
                Utils.OpenUrl(item.url);
                this._feedbackClient.SendEvent(item.telemetryId);
            }
        });
    }

    private ensureInitialized(): boolean {
        if (!this._repoContext
                || !this._serverContext
                || !this._serverContext.RepoInfo.IsTeamFoundation) {
            this.setErrorStatus(Strings.NoRepoInformation);
            return false;
        } else if (this._errorMessage !== undefined) {
            return false;
        }
        return true;
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

    private async initializeExtension() : Promise<void> {
        //Don't initialize if we don't have a workspace
        if (!workspace || !workspace.rootPath) {
            return;
        }

        //If Logging is enabled, the user must have used the extension before so we can enable
        //it here.  This will allow us to log errors when we begin processing TFVC commands.
        this._settings = new Settings();
        this.logStart(this._settings.LoggingLevel, workspace.rootPath);
        this._teamServicesStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);

        try {
            //RepositoryContext has some initial information about the repository (what we can get without authenticating with server)
            this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath);
            if (this._repoContext) {
                this.setupFileSystemWatcherOnHead();
                this._serverContext = new TeamServerContext(this._repoContext.RemoteUrl);
                this._pinnedQuerySettings = new PinnedQuerySettings(this._serverContext.RepoInfo.Account);
                //We need to be able to send feedback even if we aren't authenticated with the server
                this._feedbackClient = new FeedbackClient(new TelemetryService(this._settings));

                this._credentialManager = new CredentialManager();
                let accountSettings = new AccountSettings(this._serverContext.RepoInfo.Account);
                this._credentialManager.GetCredentialHandler(this._serverContext, accountSettings.TeamServicesPersonalAccessToken).then(async (requestHandler) => {
                    if (requestHandler === undefined) {
                        this.displayNoCredentialsMessage();
                        return;
                    } else {
                        this._telemetry = new TelemetryService(this._settings, this._serverContext);
                        this._feedbackClient = new FeedbackClient(this._telemetry);
                        Logger.LogDebug("Started ApplicationInsights telemetry");

                        //Set up the client we need to talk to the server for more repository information
                        //TODO: Handle this guy throwing!!
                        let repositoryInfoClient: RepositoryInfoClient = new RepositoryInfoClient(this._repoContext, CredentialManager.GetCredentialHandler());

                        Logger.LogInfo("Getting repository information with repositoryInfoClient");
                        Logger.LogDebug("RemoteUrl = " + this._repoContext.RemoteUrl);
                        try {
                            //At this point, we have either successfully called git.exe or tf.cmd (we just need to verify the remote urls)
                            //For Git repositories, we call vsts/info and get collection ids, etc.
                            //For TFVC, we have to (potentially) make multiple other calls to get collection ids, etc.
                            this._serverContext.RepoInfo = await repositoryInfoClient.GetRepositoryInfo();

                            //Now we need to go and get the authorized user information
                            let connectionUrl: string = (this._serverContext.RepoInfo.IsTeamServices === true ? this._serverContext.RepoInfo.AccountUrl : this._serverContext.RepoInfo.CollectionUrl);
                            let accountClient: TeamServicesApi = new TeamServicesApi(connectionUrl, [CredentialManager.GetCredentialHandler()]);
                            Logger.LogInfo("Getting connectionData with accountClient");
                            Logger.LogDebug("connectionUrl = " + connectionUrl);
                            try {
                                let settings: any = await accountClient.connect();
                                Logger.LogInfo("Retrieved connectionData with accountClient");
                                this.resetErrorStatus();

                                this._serverContext.UserInfo = new UserInfo(settings.authenticatedUser.id,
                                                                            settings.authenticatedUser.providerDisplayName,
                                                                            settings.authenticatedUser.customDisplayName);
                                this._telemetry.Update(this._serverContext.RepoInfo.CollectionId, this._serverContext.UserInfo.Id);

                                this.initializeStatusBars();
                                this._buildClient = new BuildClient(this._serverContext, this._telemetry, this._buildStatusBarItem);
                                //Don't initialize the Git client if we aren't a Git repository
                                if (this._repoContext.Type === RepositoryType.GIT) {
                                    this._gitClient = new GitClient(this._serverContext, this._telemetry, this._pullRequestStatusBarItem);
                                }
                                this._witClient = new WitClient(this._serverContext, this._telemetry, this._pinnedQuerySettings.PinnedQuery, this._pinnedQueryStatusBarItem);
                                this._telemetry.SendEvent(TelemetryEvents.StartUp);

                                Logger.LogObject(settings);
                                this.logDebugInformation();
                                this.refreshPollingItems();
                                this.startPolling();
                            } catch (err) {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Login : undefined), false);
                                this.reportError(Utils.GetMessageForStatusCode(err, err.message, "Failed to get results with accountClient: "), err);
                            }
                        } catch (err) {
                            //TODO: With TFVC, creating a RepositoryInfo can throw (can't get project collection, can't get team project, etc.)
                            // We get a 404 on-prem if we aren't Update 2 or later
                            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true && err.statusCode === 404) {
                                this.setErrorStatus(Strings.UnsupportedServerVersion, undefined, false);
                                Logger.LogError(Strings.UnsupportedServerVersion);
                            } else {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Login : undefined), false);
                                this.reportError(Utils.GetMessageForStatusCode(err, err.message, "Failed call with repositoryClient: "), err);
                            }
                        }
                    }
                }).fail((reason) => {
                    this.setErrorStatus(Utils.GetMessageForStatusCode(reason, reason.message), (reason.statusCode === 401 ? CommandNames.Login : undefined), false);
                    //If we can't get a requestHandler, report the error via the feedbackclient
                    this._feedbackClient.ReportError(Utils.GetMessageForStatusCode(reason, reason.message, "Failed to get a credential handler"), reason);
                });
            }
        } catch (err) {
            Logger.LogError(err.message);
            //For now, don't report these errors via the _feedbackClient
            this.setErrorStatus(err.message, undefined, false);
        }
    }

    //Set up the initial status bars
    private initializeStatusBars() {
        if (this.ensureInitialized()) {
            this._teamServicesStatusBarItem.command = CommandNames.OpenTeamSite;
            this._teamServicesStatusBarItem.text = this._serverContext.RepoInfo.TeamProject;
            this._teamServicesStatusBarItem.tooltip = Strings.NavigateToTeamServicesWebSite;
            this._teamServicesStatusBarItem.show();

            //Only initialize the status bar item if this is a Git repository
            if (this._repoContext.Type === RepositoryType.GIT) {
                this._pullRequestStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 99);
                this._pullRequestStatusBarItem.command = CommandNames.GetPullRequests;
                this._pullRequestStatusBarItem.text = GitClient.GetPullRequestStatusText(0);
                this._pullRequestStatusBarItem.tooltip = Strings.BrowseYourPullRequests;
                this._pullRequestStatusBarItem.show();
            }

            this._buildStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 98);
            this._buildStatusBarItem.command = CommandNames.OpenBuildSummaryPage;
            this._buildStatusBarItem.text = `$(icon octicon-package) ` + `$(icon octicon-dash)`;
            this._buildStatusBarItem.tooltip = Strings.NoBuildsFound;
            this._buildStatusBarItem.show();

            this._pinnedQueryStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 97);
            this._pinnedQueryStatusBarItem.command = CommandNames.ViewPinnedQueryWorkItems;
            this._pinnedQueryStatusBarItem.text = WitClient.GetPinnedQueryStatusText(0);
            this._pinnedQueryStatusBarItem.tooltip = Strings.ViewYourPinnedQuery;
            this._pinnedQueryStatusBarItem.show();
        }
    }

    private logDebugInformation(): void {
        Logger.LogDebug("Account: " + this._serverContext.RepoInfo.Account + " "
                            + "Team Project: " + this._serverContext.RepoInfo.TeamProject + " "
                            + "Collection: " + this._serverContext.RepoInfo.CollectionName + " "
                            + "Repository: " + this._serverContext.RepoInfo.RepositoryName + " "
                            + "UserCustomDisplayName: " + this._serverContext.UserInfo.CustomDisplayName + " "
                            + "UserProviderDisplayName: " + this._serverContext.UserInfo.ProviderDisplayName + " "
                            + "UserId: " + this._serverContext.UserInfo.Id + " ");
        Logger.LogDebug("gitFolder: " + this._repoContext.RepoFolder);
        Logger.LogDebug("gitRemoteUrl: " + this._repoContext.RemoteUrl);
        if (this._repoContext.Type === RepositoryType.GIT) {
            Logger.LogDebug("gitRepositoryParentFolder: " + this._repoContext.RepositoryParentFolder);
            Logger.LogDebug("gitCurrentBranch: " + this._repoContext.CurrentBranch);
            Logger.LogDebug("gitCurrentRef: " + this._repoContext.CurrentRef);
        }
        Logger.LogDebug("IsSsh: " + this._repoContext.IsSsh);
        Logger.LogDebug("proxy: " + (Utils.IsProxyEnabled() ? "enabled" : "not enabled")
                        + ", team services: " + this._serverContext.RepoInfo.IsTeamServices.toString());
    }

    private logStart(loggingLevel: string, rootPath: string): void {
        if (loggingLevel === undefined) {
            console.log("Logging is disabled.");
            return;
        }
        Logger.SetLoggingLevel(loggingLevel);
        if (rootPath !== undefined) {
            Logger.SetLogPath(rootPath);
            Logger.LogInfo("*** FOLDER: " + rootPath + " ***");
        } else {
            Logger.LogInfo("*** Folder not opened ***");
        }
    }

    private pollBuildStatus(): void {
        if (this.ensureInitialized()) {
            Logger.LogInfo("Polling for latest current build status...");
            this._buildClient.DisplayCurrentBuildStatus(this._repoContext, true);
        }
    }

    private pollMyPullRequests(): void {
        if (this.ensureInitialized()) {
            //Only poll for pull requests when repository is Git
            if (this._repoContext.Type === RepositoryType.GIT) {
                Logger.LogInfo("Polling for pull requests...");
                this._gitClient.PollMyPullRequests();
            }
        }
    }

    private pollPinnedQuery(): void {
        if (this.ensureInitialized()) {
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

    //Logs an error to the logger and sends an exception to telemetry service
    private reportError(message: string, reason?: any): void {
        Logger.LogError(message);
        if (reason && reason.message) {
            // Log additional information for debugging purposes
            Logger.LogDebug(reason.message);
        }
        if (reason !== undefined && (Utils.IsUnauthorized(reason) || Utils.IsOffline(reason) || Utils.IsProxyIssue(reason))) {
            //Don't log exceptions for Unauthorized, Offline or Proxy scenarios
            return;
        }
        this._telemetry.SendException(message);
    }

    private resetErrorStatus() {
        this._errorMessage = undefined;
    }

    private setErrorStatus(message: string, commandOnClick?: string, showRetryMessage?: boolean) {
        this._errorMessage = message;
        if (this._teamServicesStatusBarItem !== undefined) {
            this._teamServicesStatusBarItem.command = commandOnClick === undefined ? CommandNames.Reinitialize : commandOnClick;
            this._teamServicesStatusBarItem.text = "Team " + `$(icon octicon-stop)`;
            let message: string = this._errorMessage + (showRetryMessage !== undefined && showRetryMessage === true ? " " + Strings.ClickToRetryConnection : "") ;
            this._teamServicesStatusBarItem.tooltip = message;
            this._teamServicesStatusBarItem.show();
        }
    }

    //Sets up a file system watcher on HEAD so we can know when the current branch has changed
    private async setupFileSystemWatcherOnHead(): Promise<void> {
        if (this._repoContext && this._repoContext.Type === RepositoryType.GIT) {
            let pattern: string = this._repoContext.RepoFolder + "/HEAD";
            let fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, true, false, true);
            fsw.onDidChange(async (uri) => {
                Logger.LogInfo("HEAD has changed, re-parsing RepoContext object");
                this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath);
                Logger.LogInfo("CurrentBranch is: " + this._repoContext.CurrentBranch);
                this.refreshPollingItems();
            });
        }
    }

    //Sets up a file system watcher on config so we can know when the remote origin has changed
    private async setupFileSystemWatcherOnConfig(): Promise<void> {
        //If we don't have a workspace, don't set up the file watcher
        if (!workspace || !workspace.rootPath) {
            return;
        }

        if (this._repoContext && this._repoContext.Type === RepositoryType.GIT) {
            let pattern: string = path.join(workspace.rootPath, ".git", "config");
            //We want to listen to file creation, change and delete events
            let fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, false, false, false);
            fsw.onDidCreate((uri) => {
                //When a new local repo is initialized (e.g., git init), re-initialize the extension
                Logger.LogInfo("config has been created, re-initializing the extension");
                this.Reinitialize();
            });
            fsw.onDidChange(async (uri) => {
                Logger.LogInfo("config has changed, checking if 'remote origin' changed");
                let context: IRepositoryContext = await RepositoryContextFactory.CreateRepositoryContext(uri.fsPath);
                let remote: string = context.RemoteUrl;
                if (remote === undefined) {
                    //There is either no remote defined yet or it isn't a Team Services repo
                    if (this._repoContext.RemoteUrl !== undefined) {
                        //We previously had a Team Services repo and now we don't, reinitialize
                        Logger.LogInfo("remote was removed, previously had a Team Services remote, re-initializing the extension");
                        this.Reinitialize();
                        return;
                    }
                    //There was no previous remote, so do nothing
                    Logger.LogInfo("remote does not exist, no previous Team Services remote, nothing to do");
                } else if (this._repoContext !== undefined) {
                    //We have a valid gitContext already, check to see what changed
                    if (this._repoContext.RemoteUrl !== undefined) {
                        //The config has changed, and we had a Team Services remote already
                        if (remote.toLowerCase() !== this._repoContext.RemoteUrl.toLowerCase()) {
                            //And they're different, reinitialize
                            Logger.LogInfo("remote changed to a different Team Services remote, re-initializing the extension");
                            this.Reinitialize();
                        }
                    } else {
                        //The remote was initialized to a Team Services remote, reinitialize
                        Logger.LogInfo("remote initialized to a Team Services remote, re-initializing the extension");
                        this.Reinitialize();
                    }
                }
            });
            fsw.onDidDelete((uri) => {
                Logger.LogInfo("config has been deleted, re-initializing the extension");
                this.Reinitialize();
            });
        }
    }

    //Sets up the interval to refresh polling items
    private startPolling(): void {
        setInterval(() => this.refreshPollingItems(), 1000 * 60 * this._settings.PollingInterval);
    }

    dispose() {
        if (this._pullRequestStatusBarItem !== undefined) {
            this._pullRequestStatusBarItem.dispose();
        }
        if (this._teamServicesStatusBarItem !== undefined) {
            this._teamServicesStatusBarItem.dispose();
        }
        if (this._buildStatusBarItem !== undefined) {
            this._buildStatusBarItem.dispose();
        }
        if (this._pinnedQueryStatusBarItem !== undefined) {
            this._pinnedQueryStatusBarItem.dispose();
        }
    }
}
