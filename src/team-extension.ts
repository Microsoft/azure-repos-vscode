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
import { GitContext } from "./contexts/gitcontext";
import { TeamServerContext} from "./contexts/servercontext";
import { TelemetryService } from "./services/telemetry";
import { QTeamServicesApi } from "./clients/teamservicesclient";
import { BuildClient } from "./clients/buildclient";
import { FeedbackClient } from "./clients/feedbackclient";
import { GitClient } from "./clients/gitclient";
import { WitClient } from "./clients/witclient";
import { RepositoryInfo } from "./info/repositoryinfo";
import { UserInfo } from "./info/userinfo";

var os = require("os");
var path = require("path");

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
    private _gitContext: GitContext;
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
            this._gitClient.CreatePullRequest(this._gitContext);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Gets any available build status information and adds it to the status bar
    public DisplayCurrentBranchBuildStatus(): void {
        if (this.ensureInitialized()) {
            this._buildClient.DisplayCurrentBranchBuildStatus(this._gitContext, false);
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    //Initial method to display, select and navigate to my pull requests
    public GetMyPullRequests(): void {
        if (this.ensureInitialized()) {
            this._gitClient.GetMyPullRequests();
        } else {
            VsCodeUtils.ShowErrorMessage(this._errorMessage);
        }
    }

    public Login() {
        // For Login, we just need to verify _serverContext and don't want to set this._errorMessage
        if (this._serverContext !== undefined && this._serverContext.RepoInfo !== undefined && this._serverContext.RepoInfo.IsTeamFoundation === true) {
            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true) {
                let defaultUsername : string = this.getDefaultUsername();
                window.showInputBox({ value: defaultUsername || "", prompt: Strings.ProvideUsername + " (" + this._serverContext.RepoInfo.Account + ")", placeHolder: "", password: false }).then((username) => {
                    if (username !== undefined && username.length > 0) {
                        window.showInputBox({ value: "", prompt: Strings.ProvidePassword + " (" + username + ")", placeHolder: "", password: true }).then((password) => {
                            if (password !== undefined) {
                                Logger.LogInfo("Login: Username and Password provided as authentication.");
                                this._credentialManager.StoreCredentials(this._serverContext.RepoInfo.Host, username, password).then(() => {
                                    // We don't test the credentials to make sure they're good here.  Do so on the next command that's run.
                                    this.Reinitialize();
                                }).catch((reason) => {
                                    // TODO: Should the message direct the user to open an issue?  send feedback?
                                    let msg: string = Strings.UnableToStoreCredentials + this._serverContext.RepoInfo.Host;
                                    this.reportError(msg);
                                    VsCodeUtils.ShowErrorMessage(msg);
                                });
                            }
                        });
                    }
                });
            } else if (this._serverContext.RepoInfo.IsTeamServices === true) {
                // Until Device Flow, we can prompt for the PAT for Team Services
                window.showInputBox({ value: "", prompt: Strings.ProvideAccessToken + " (" + this._serverContext.RepoInfo.Account + ")", placeHolder: "", password: true }).then((token) => {
                    if (token !== undefined) {
                        Logger.LogInfo("Login: Personal Access Token provided as authentication.");
                        this._credentialManager.StoreCredentials(this._serverContext.RepoInfo.Host, Constants.OAuth, token).then(() => {
                            this.Reinitialize();
                        }).catch((reason) => {
                            // TODO: Should the message direct the user to open an issue?  send feedback?
                            let msg: string = Strings.UnableToStoreCredentials + this._serverContext.RepoInfo.Host;
                            this.reportError(msg);
                            VsCodeUtils.ShowErrorMessage(msg);
                        });
                    }
                });
            }
        } else {
            let messageItem : UrlMessageItem = { title : Strings.LearnMore,
                                url : Constants.ReadmeLearnMoreUrl,
                                telemetryId: TelemetryEvents.ReadmeLearnMoreClick };
            VsCodeUtils.ShowErrorMessageWithOptions(Strings.NoGitRepoInformation, messageItem).then((item) => {
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
                this.reportError(msg);
                VsCodeUtils.ShowErrorMessage(msg);
            });
        } else {
            VsCodeUtils.ShowErrorMessage(Strings.NoGitRepoInformation);
        }
    }

    //Opens the build summary page for a particular build
    public OpenBlamePage(): void {
        if (this.ensureInitialized()) {
            this._gitClient.OpenBlamePage(this._gitContext);
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
            this._gitClient.OpenFileHistory(this._gitContext);
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
            this._gitClient.OpenNewPullRequest(this._gitContext.RemoteUrl, this._gitContext.CurrentBranch);
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
            this._gitClient.OpenPullRequestsPage();
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
        return this._feedbackClient.SendFeedback();
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
        if (!this._gitContext
                || !this._gitContext.RemoteUrl
                || !this._serverContext
                || !this._serverContext.RepoInfo.IsTeamFoundation) {
            this.setErrorStatus(Strings.NoGitRepoInformation);
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

    private initializeExtension() : void {
        //Don't initialize if we don't have a workspace
        if (!workspace || !workspace.rootPath) {
            return;
        }

        this._gitContext = new GitContext(workspace.rootPath);
        if (this._gitContext && this._gitContext.RemoteUrl !== undefined && this._gitContext.IsTeamFoundation) {
            this.setupFileSystemWatcherOnHead();
            this._serverContext = new TeamServerContext(this._gitContext.RemoteUrl);
            this._settings = new Settings();
            this.logStart(this._settings.LoggingLevel, workspace.rootPath);
            this._pinnedQuerySettings = new PinnedQuerySettings(this._serverContext.RepoInfo.Account);
            this._teamServicesStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
            //We need to be able to send feedback even if we aren't authenticated with the server
            this._feedbackClient = new FeedbackClient(new TelemetryService(this._settings));

            this._credentialManager = new CredentialManager();
            let accountSettings = new AccountSettings(this._serverContext.RepoInfo.Account);
            this._credentialManager.GetCredentialHandler(this._serverContext, accountSettings.TeamServicesPersonalAccessToken).then((requestHandler) => {
                if (requestHandler === undefined) {
                    this.displayNoCredentialsMessage();
                    return;
                } else {
                    this._telemetry = new TelemetryService(this._settings, this._serverContext);
                    this._feedbackClient = new FeedbackClient(this._telemetry);
                    Logger.LogDebug("Started ApplicationInsights telemetry");

                    //Go get the details about the repository
                    let repositoryClient: QTeamServicesApi = new QTeamServicesApi(this._gitContext.RemoteUrl, [CredentialManager.GetCredentialHandler()]);
                    Logger.LogInfo("Getting repository information (vsts/info) with repositoryClient");
                    Logger.LogDebug("RemoteUrl = " + this._gitContext.RemoteUrl);
                    repositoryClient.getVstsInfo().then((repoInfo) => {
                        Logger.LogInfo("Retrieved repository info with repositoryClient");
                        Logger.LogObject(repoInfo);

                        this._serverContext.RepoInfo = new RepositoryInfo(repoInfo);
                        //Now we need to go and get the authorized user information
                        let connectionUrl: string = (this._serverContext.RepoInfo.IsTeamServices === true ? this._serverContext.RepoInfo.AccountUrl : this._serverContext.RepoInfo.CollectionUrl);
                        let accountClient: QTeamServicesApi = new QTeamServicesApi(connectionUrl, [CredentialManager.GetCredentialHandler()]);
                        Logger.LogInfo("Getting connectionData with accountClient");
                        Logger.LogDebug("connectionUrl = " + connectionUrl);
                        accountClient.connect().then((settings) => {
                            Logger.LogInfo("Retrieved connectionData with accountClient");
                            this.resetErrorStatus();

                            this._serverContext.UserInfo = new UserInfo(settings.authenticatedUser.id,
                                                                        settings.authenticatedUser.providerDisplayName,
                                                                        settings.authenticatedUser.customDisplayName);
                            this._telemetry.Update(this._serverContext.RepoInfo.CollectionId, this._serverContext.UserInfo.Id);

                            this.initializeStatusBars();
                            this._buildClient = new BuildClient(this._serverContext, this._telemetry, this._buildStatusBarItem);
                            this._gitClient = new GitClient(this._serverContext, this._telemetry, this._pullRequestStatusBarItem);
                            this._witClient = new WitClient(this._serverContext, this._telemetry, this._pinnedQuerySettings.PinnedQuery, this._pinnedQueryStatusBarItem);
                            this._telemetry.SendEvent(TelemetryEvents.StartUp);

                            Logger.LogObject(settings);
                            this.logDebugInformation();
                            this.refreshPollingItems();
                            this.startPolling();
                        }).fail((reason) => {
                            this.setErrorStatus(Utils.GetMessageForStatusCode(reason, reason.message), (reason.statusCode === 401 ? CommandNames.Login : undefined), false);
                            this.reportError(Utils.GetMessageForStatusCode(reason, reason.message, "Failed to get results with accountClient: "), reason);
                        });
                    }).fail((reason) => {
                        // We get a 404 on-prem if we aren't Update 2 or later
                        if (this._serverContext.RepoInfo.IsTeamFoundationServer === true && reason.statusCode === 404) {
                            this.setErrorStatus(Strings.UnsupportedServerVersion, undefined, false);
                            Logger.LogError(Strings.UnsupportedServerVersion);
                        } else {
                            this.setErrorStatus(Utils.GetMessageForStatusCode(reason, reason.message), (reason.statusCode === 401 ? CommandNames.Login : undefined), false);
                            this.reportError(Utils.GetMessageForStatusCode(reason, reason.message, "Failed (vsts/info) call with repositoryClient: "), reason);
                        }
                    });
                }
            }).fail((reason) => {
                this.setErrorStatus(Utils.GetMessageForStatusCode(reason, reason.message), (reason.statusCode === 401 ? CommandNames.Login : undefined), false);
                //If we can't get a requestHandler, report the error via the feedbackclient
                this._feedbackClient.ReportError(Utils.GetMessageForStatusCode(reason, reason.message, "Failed to get a credential handler"), reason);
            });
        }
    }

    //Set up the initial status bars
    private initializeStatusBars() {
        if (this.ensureInitialized()) {
            this._teamServicesStatusBarItem.command = CommandNames.OpenTeamSite;
            this._teamServicesStatusBarItem.text = this._serverContext.RepoInfo.TeamProject;
            this._teamServicesStatusBarItem.tooltip = Strings.NavigateToTeamServicesWebSite;
            this._teamServicesStatusBarItem.show();

            this._pullRequestStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 99);
            this._pullRequestStatusBarItem.command = CommandNames.GetPullRequests;
            this._pullRequestStatusBarItem.text = GitClient.GetPullRequestStatusText(0);
            this._pullRequestStatusBarItem.tooltip = Strings.BrowseYourPullRequests;
            this._pullRequestStatusBarItem.show();

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
        Logger.LogDebug("Acct: " + this._serverContext.RepoInfo.Account + " "
                            + "TP: " + this._serverContext.RepoInfo.TeamProject + " "
                            + "Coll: " + this._serverContext.RepoInfo.CollectionName + " "
                            + "Repo: " + this._serverContext.RepoInfo.RepositoryName + " "
                            + "UserCustomDisplayName: " + this._serverContext.UserInfo.CustomDisplayName + " "
                            + "UserProviderDisplayName: " + this._serverContext.UserInfo.ProviderDisplayName + " "
                            + "UserId: " + this._serverContext.UserInfo.Id + " ");
        Logger.LogDebug("gitFolder: " + this._gitContext.GitFolder);
        Logger.LogDebug("gitRemoteUrl: " + this._gitContext.RemoteUrl);
        Logger.LogDebug("gitRepositoryParentFolder: " + this._gitContext.RepositoryParentFolder);
        Logger.LogDebug("gitCurrentBranch: " + this._gitContext.CurrentBranch);
        Logger.LogDebug("gitCurrentRef: " + this._gitContext.CurrentRef);
        Logger.LogDebug("gitIsSsh: " + this._gitContext.IsSsh);
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
            this._buildClient.DisplayCurrentBranchBuildStatus(this._gitContext, true);
        }
    }

    private pollMyPullRequests(): void {
        if (this.ensureInitialized()) {
            this._gitClient.PollMyPullRequests();
        }
    }

    private pollPinnedQuery(): void {
        if (this.ensureInitialized()) {
            this._witClient.PollPinnedQuery();
        }
    }

    //Polls for latest pull requests and current branch build status information
    private refreshPollingItems(): void {
        Logger.LogInfo("Polling for pull requests...");
        this.pollMyPullRequests();
        Logger.LogInfo("Polling for latest current branch build status...");
        this.pollBuildStatus();
        Logger.LogInfo("Polling for the pinned work itemquery");
        this.pollPinnedQuery();
    }

    //Logs an error to the logger and sends an exception to telemetry service
    private reportError(message: string, reason?: any): void {
        Logger.LogError(message);
        if (reason !== undefined && (Utils.IsUnauthorized(reason) || Utils.IsOffline(reason))) {
            //Don't log exceptions for Unauthorized or Offline scenarios
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
    private setupFileSystemWatcherOnHead(): void {
        let pattern: string = this._gitContext.GitFolder + "/HEAD";
        let fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, true, false, true);
        fsw.onDidChange((uri) => {
            Logger.LogInfo("HEAD has changed, re-parsing GitContext object");
            this._gitContext = new GitContext(workspace.rootPath);
            Logger.LogInfo("CurrentBranch is: " + this._gitContext.CurrentBranch);
            this.refreshPollingItems();
        });
    }

    //Sets up a file system watcher on config so we can know when the remote origin has changed
    private setupFileSystemWatcherOnConfig(): void {
        //If we don't have a workspace, don't set up the file watcher
        if (!workspace || !workspace.rootPath) {
            return;
        }
        let pattern: string = path.join(workspace.rootPath, ".git", "config");
        //We want to listen to file creation, change and delete events
        let fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, false, false, false);
        fsw.onDidCreate((uri) => {
            //When a new local repo is initialized (e.g., git init), re-initialize the extension
            Logger.LogInfo("config has been created, re-initializing the extension");
            this.Reinitialize();
        });
        fsw.onDidChange((uri) => {
            Logger.LogInfo("config has changed, checking if 'remote origin' changed");
            let context: GitContext = new GitContext(uri.fsPath);
            let remote: string = context.RemoteUrl;
            if (remote === undefined) {
                //There is either no remote defined yet or it isn't a Team Services repo
                if (this._gitContext.RemoteUrl !== undefined) {
                    //We previously had a Team Services repo and now we don't, reinitialize
                    Logger.LogInfo("remote was removed, previously had a Team Services remote, re-initializing the extension");
                    this.Reinitialize();
                    return;
                }
                //There was no previous remote, so do nothing
                Logger.LogInfo("remote does not exist, no previous Team Services remote, nothing to do");
            } else if (this._gitContext !== undefined) {
                //We have a valid gitContext already, check to see what changed
                if (this._gitContext.RemoteUrl !== undefined) {
                    //The config has changed, and we had a Team Services remote already
                    if (remote.toLowerCase() !== this._gitContext.RemoteUrl.toLowerCase()) {
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
