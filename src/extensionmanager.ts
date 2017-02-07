/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { FileSystemWatcher, StatusBarAlignment, StatusBarItem, window, workspace } from "vscode";
import { AccountSettings, Settings } from "./helpers/settings";
import { CommandNames, Constants, TelemetryEvents, TfvcTelemetryEvents } from "./helpers/constants";
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
import { FeedbackClient } from "./clients/feedbackclient";
import { RepositoryInfoClient } from "./clients/repositoryinfoclient";
import { UserInfo } from "./info/userinfo";
import { CredentialInfo } from "./info/credentialinfo";
import { TeamExtension } from "./team-extension";
import { TfvcExtension } from "./tfvc/tfvc-extension";
import { TfvcErrorCodes } from "./tfvc/tfvcerror";

var path = require("path");
var util = require("util");

/* tslint:disable:no-unused-variable */
import Q = require("q");
/* tslint:enable:no-unused-variable */

export class ExtensionManager  {
    private _teamServicesStatusBarItem: StatusBarItem;
    private _errorMessage: string;
    private _telemetry: TelemetryService;
    private _feedbackClient: FeedbackClient;
    private _serverContext: TeamServerContext;
    private _repoContext: IRepositoryContext;
    private _settings: Settings;
    private _credentialManager : CredentialManager;
    private _teamExtension: TeamExtension;
    private _tfvcExtension: TfvcExtension;

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

    public get RepoContext(): IRepositoryContext {
        return this._repoContext;
    }

    public get ServerContext(): TeamServerContext {
        return this._serverContext;
    }

    public get CredentialManager(): CredentialManager {
        return this._credentialManager;
    }

    public get FeedbackClient(): FeedbackClient {
        return this._feedbackClient;
    }

    public get Settings(): Settings {
        return this._settings;
    }

    public get Telemetry(): TelemetryService {
        return this._telemetry;
    }

    public get Team(): TeamExtension {
        return this._teamExtension;
    }

    public get Tfvc(): TfvcExtension {
        return this._tfvcExtension;
    }

    //Meant to reinitialize the extension when coming back online
    public Reinitialize(): void {
        this.dispose();
        this.initializeExtension();
    }

    public EnsureInitialized(expectedType: RepositoryType): boolean {
        if (!this._repoContext
                || !this._serverContext
                || !this._serverContext.RepoInfo.IsTeamFoundation) {
            this.setErrorStatus(Strings.NoRepoInformation);
            return false;
        } else if (expectedType !== this._repoContext.Type
                   && expectedType !== RepositoryType.ANY) {
            //Display the message straightaway in this case (instead of using status bar)
            if (expectedType === RepositoryType.GIT) {
                VsCodeUtils.ShowErrorMessage(Strings.NotAGitRepository);
                return false;
            } else if (expectedType === RepositoryType.TFVC) {
                VsCodeUtils.ShowErrorMessage(Strings.NotATfvcRepository);
                return false;
            }
        } else if (this._errorMessage !== undefined) {
            return false;
        }
        return true;
    }

    public DisplayErrorMessage(message?: string) {
        let msg: string = message ? message : this._errorMessage;
        if (msg) {
            VsCodeUtils.ShowErrorMessage(message ? message : this._errorMessage);
        }
    }

    public DisplayWarningMessage(message: string) {
        VsCodeUtils.ShowWarningMessage(message);
    }

    //Logs an error to the logger and sends an exception to telemetry service
    public ReportError(message: string, reason?: any, showToUser: boolean = false): void {
        let fullMessage = reason ? message + " " + reason : message;

        // Log the message
        Logger.LogError(fullMessage);
        if (reason && reason.message) {
            // Log additional information for debugging purposes
            Logger.LogDebug(reason.message);
        }

        // Show just the message to the user if needed
        if (showToUser) {
            this.DisplayErrorMessage(message);
        }

        // Send it to telemetry
        if (reason !== undefined && (Utils.IsUnauthorized(reason) || Utils.IsOffline(reason) || Utils.IsProxyIssue(reason))) {
            //Don't log exceptions for Unauthorized, Offline or Proxy scenarios
            return;
        }
        this._telemetry.SendException(fullMessage);
    }

    public ReportEvent(event: string) {
        this._feedbackClient.SendEvent(event);
    }

    private displayNoCredentialsMessage(): void {
        let error: string = Strings.NoTeamServerCredentialsRunSignin;
        let displayError: string = Strings.NoTeamServerCredentialsRunSignin;
        let messageItem: UrlMessageItem = undefined;
        if (this._serverContext.RepoInfo.IsTeamServices === true) {
            messageItem = { title : Strings.LearnMore,
                            url : Constants.TokenLearnMoreUrl,
                            telemetryId: TelemetryEvents.TokenLearnMoreClick };
            //Need different messages for popup message and status bar
            //Add the account name to the message to help the user
            error =  util.format(Strings.NoAccessTokenRunSignin, this._serverContext.RepoInfo.Account);
            displayError = util.format(Strings.NoAccessTokenLearnMoreRunSignin, this._serverContext.RepoInfo.Account);
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

    private async initializeExtension() : Promise<void> {
        //Don't initialize if we don't have a workspace
        if (!workspace || !workspace.rootPath) {
            return;
        }

        // Create the extensions
        this._teamExtension = new TeamExtension(this);
        this._tfvcExtension = new TfvcExtension(this);

        //If Logging is enabled, the user must have used the extension before so we can enable
        //it here.  This will allow us to log errors when we begin processing TFVC commands.
        this._settings = new Settings();
        this.logStart(this._settings.LoggingLevel, workspace.rootPath);
        this._teamServicesStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);

        try {
            //RepositoryContext has some initial information about the repository (what we can get without authenticating with server)
            this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath, this._settings);
            if (this._repoContext) {
                this.setupFileSystemWatcherOnHead();
                this._serverContext = new TeamServerContext(this._repoContext.RemoteUrl);
                //We need to be able to send feedback even if we aren't authenticated with the server
                this._feedbackClient = new FeedbackClient(new TelemetryService(this._settings));

                this._credentialManager = new CredentialManager();
                let accountSettings = new AccountSettings(this._serverContext.RepoInfo.Account);

                this._credentialManager.GetCredentials(this._serverContext, accountSettings.TeamServicesPersonalAccessToken).then(async (creds: CredentialInfo) => {
                    if (!creds || !creds.CredentialHandler) {
                        this.displayNoCredentialsMessage();
                        return;
                    } else {
                        this._serverContext.CredentialInfo = creds;
                        this._telemetry = new TelemetryService(this._settings, this._serverContext);
                        this._feedbackClient = new FeedbackClient(this._telemetry);
                        Logger.LogDebug("Started ApplicationInsights telemetry");

                        //Set up the client we need to talk to the server for more repository information
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
                                await this.initializeClients(this._repoContext.Type);

                                this.sendStartupTelemetry();

                                Logger.LogObject(settings);
                                this.logDebugInformation();
                            } catch (err) {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Login : undefined), false);
                                this.ReportError(Utils.GetMessageForStatusCode(err, err.message, "Failed to get results with accountClient: "), err);
                            }
                        } catch (err) {
                            //TODO: With TFVC, creating a RepositoryInfo can throw (can't get project collection, can't get team project, etc.)
                            // We get a 404 on-prem if we aren't Update 2 or later
                            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true && err.statusCode === 404) {
                                this.setErrorStatus(Strings.UnsupportedServerVersion, undefined, false);
                                Logger.LogError(Strings.UnsupportedServerVersion);
                            } else {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Login : undefined), false);
                                this.ReportError(Utils.GetMessageForStatusCode(err, err.message, "Failed call with repositoryClient: "), err);
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
            if (!err.tfvcErrorCode || this.shouldDisplayTfvcError(err.tfvcErrorCode)) {
                this.setErrorStatus(err.message, undefined, false);
            }
        }
    }

    //Sends the "StartUp" event based on repository type
    private sendStartupTelemetry(): void {
        let event: string = TelemetryEvents.StartUp;

        if (this._repoContext.Type === RepositoryType.TFVC) {
            event = TfvcTelemetryEvents.StartUp;
        } else if (this._repoContext.Type === RepositoryType.EXTERNAL) {
            event = TelemetryEvents.ExternalRepository;
        }

        this._telemetry.SendEvent(event);
    }

    //Determines which Tfvc errors to display in the status bar ui
    private shouldDisplayTfvcError(errorCode: string): boolean {
        if (TfvcErrorCodes.TfvcMinVersionWarning === errorCode ||
            TfvcErrorCodes.TfvcNotFound === errorCode) {
            return true;
        }
        return false;
    }

    //Set up the initial status bars
    private initializeStatusBars() {
        if (this.EnsureInitialized(RepositoryType.ANY)) {
            this._teamServicesStatusBarItem.command = CommandNames.OpenTeamSite;
            this._teamServicesStatusBarItem.text = this._serverContext.RepoInfo.TeamProject;
            this._teamServicesStatusBarItem.tooltip = Strings.NavigateToTeamServicesWebSite;
            this._teamServicesStatusBarItem.show();
            // Update the extensions
            this._teamExtension.InitializeStatusBars();
            //this._tfvcExtension.InitializeStatusBars();
        }
    }

    //Set up the initial status bars
    private async initializeClients(repoType: RepositoryType) {
        await this._teamExtension.InitializeClients(repoType);
        await this._tfvcExtension.InitializeClients(repoType);
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
                this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath, this._settings);
                Logger.LogInfo("CurrentBranch is: " + this._repoContext.CurrentBranch);
                this.notifyBranchChanged(this._repoContext.CurrentBranch);
            });
        }
    }

    private notifyBranchChanged(currentBranch: string) {
        this._teamExtension.NotifyBranchChanged(currentBranch);
        //this._tfvcExtension.NotifyBranchChanged(currentBranch);
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
                let context: IRepositoryContext = await RepositoryContextFactory.CreateRepositoryContext(uri.fsPath, this._settings);
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

    public dispose() {
        if (this._teamServicesStatusBarItem) {
            this._teamServicesStatusBarItem.dispose();
            this._teamServicesStatusBarItem = undefined;
        }
        if (this._teamExtension) {
            this._teamExtension.dispose();
            this._teamExtension = undefined;
        }
        if (this._tfvcExtension) {
            this._tfvcExtension.dispose();
            this._tfvcExtension = undefined;
        }
    }
}
