/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Disposable, FileSystemWatcher, StatusBarAlignment, StatusBarItem, version, window, workspace } from "vscode";
import { Settings } from "./helpers/settings";
import { CommandNames, Constants, TelemetryEvents, TfvcTelemetryEvents } from "./helpers/constants";
import { CredentialManager } from "./helpers/credentialmanager";
import { Logger } from "./helpers/logger";
import { Strings } from "./helpers/strings";
import { UserAgentProvider } from "./helpers/useragentprovider";
import { Utils } from "./helpers/utils";
import { VsCodeUtils } from "./helpers/vscodeutils";
import { IButtonMessageItem } from "./helpers/vscodeutils.interfaces";
import { RepositoryContextFactory } from "./contexts/repocontextfactory";
import { IRepositoryContext, RepositoryType } from "./contexts/repositorycontext";
import { TeamServerContext } from "./contexts/servercontext";
import { TfvcContext } from "./contexts/tfvccontext";
import { Telemetry } from "./services/telemetry";
import { TeamServicesApi } from "./clients/teamservicesclient";
import { FeedbackClient } from "./clients/feedbackclient";
import { RepositoryInfoClient } from "./clients/repositoryinfoclient";
import { UserInfo } from "./info/userinfo";
import { CredentialInfo } from "./info/credentialinfo";
import { TeamExtension } from "./team-extension";
import { TfCommandLineRunner } from "./tfvc/tfcommandlinerunner";
import { TfvcExtension } from "./tfvc/tfvc-extension";
import { TfvcErrorCodes } from "./tfvc/tfvcerror";
import { TfvcSCMProvider } from "./tfvc/tfvcscmprovider";
import { TfvcRepository } from "./tfvc/tfvcrepository";

import * as path from "path";
import * as util from "util";

export class ExtensionManager implements Disposable {
    private _teamServicesStatusBarItem: StatusBarItem;
    private _feedbackStatusBarItem: StatusBarItem;
    private _errorMessage: string;
    private _feedbackClient: FeedbackClient;
    private _serverContext: TeamServerContext;
    private _repoContext: IRepositoryContext;
    private _settings: Settings;
    private _credentialManager : CredentialManager;
    private _teamExtension: TeamExtension;
    private _tfvcExtension: TfvcExtension;
    private _scmProvider: TfvcSCMProvider;

    public async Initialize(): Promise<void> {
        await this.setupFileSystemWatcherOnConfig();
        await this.initializeExtension();

        // Add the event listener for settings changes, then re-initialized the extension
        if (workspace) {
            workspace.onDidChangeConfiguration(() => {
                Logger.LogDebug("Reinitializing due to onDidChangeConfiguration");
                //FUTURE: Check to see if we really need to do the re-initialization
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

    public get Team(): TeamExtension {
        return this._teamExtension;
    }

    public get Tfvc(): TfvcExtension {
        return this._tfvcExtension;
    }

    //Meant to reinitialize the extension when coming back online
    public Reinitialize(): void {
        this.cleanup(true);
        this.initializeExtension();
    }

    //Ensure we have a TFS or Team Services-based repository. Otherwise, return false.
    private ensureMinimalInitialization(): boolean {
        if (!this._repoContext
                || !this._serverContext
                || !this._serverContext.RepoInfo.IsTeamFoundation) {
            //If the user previously signed out (in this session of VS Code), show a message to that effect
            if (this._teamExtension.IsSignedOut) {
                this.setErrorStatus(Strings.UserMustSignIn);
            } else {
                this.setErrorStatus(Strings.NoRepoInformation);
            }
            return false;
        }
        return true;
    }

    //Checks to ensure we're good to go for running TFVC commands
    public EnsureInitializedForTFVC(): boolean {
        return this.ensureMinimalInitialization();
    }

    //Checks to ensure that Team Services functionality is ready to go.
    public EnsureInitialized(expectedType: RepositoryType): boolean {
        //Ensure we have a TFS or Team Services-based repository. Otherwise, return false.
        if (!this.ensureMinimalInitialization()) {
            return false;
        }
        //If we aren't the expected type and we also aren't ANY, determine which error to show.
        //If we aren't ANY, then this If will handle Git and TFVC. So if we get past the first
        //if, we're returning false either for Git or for TFVC (there's no other option)
        if (expectedType !== this._repoContext.Type && expectedType !== RepositoryType.ANY) {
            //If we already have an error message set, we're in an error state and use that message
            if (this._errorMessage) {
                return false;
            }
            //Display the message straightaway in this case (instead of using status bar)
            if (expectedType === RepositoryType.GIT) {
                VsCodeUtils.ShowErrorMessage(Strings.NotAGitRepository);
                return false;
            }
            if (expectedType === RepositoryType.TFVC) {
                VsCodeUtils.ShowErrorMessage(Strings.NotATfvcRepository);
                return false;
            }
        }
        //For TFVC, without a TeamProjectName, we can't initialize the Team Services functionality
        if ((expectedType === RepositoryType.TFVC || expectedType === RepositoryType.ANY)
            && this._repoContext.Type === RepositoryType.TFVC
            && !this._repoContext.TeamProjectName) {
            this.setErrorStatus(Strings.NoTeamProjectFound);
            return false;
        }
        //Finally, if we set a global error message, there's an issue so we can't initialize.
        if (this._errorMessage !== undefined) {
            return false;
        }
        return true;
    }

    //Return value indicates whether a message was displayed
    public DisplayErrorMessage(message?: string): boolean {
        const msg: string = message ? message : this._errorMessage;
        if (msg) {
            VsCodeUtils.ShowErrorMessage(msg);
            return true;
        }
        return false;
    }

    public DisplayWarningMessage(message: string): void {
        VsCodeUtils.ShowWarningMessage(message);
    }

    //Logs an error to the logger and sends an exception to telemetry service
    public ReportError(err: Error, message: string, showToUser: boolean = false): void {
        const fullMessage = err ? message + " " + err : message;

        // Log the message
        Logger.LogError(fullMessage);
        if (err && err.message) {
            // Log additional information for debugging purposes
            Logger.LogDebug(err.message);
        }

        // Show just the message to the user if needed
        if (showToUser) {
            this.DisplayErrorMessage(message);
        }

        // Send it to telemetry
        if (err !== undefined && (Utils.IsUnauthorized(err) || Utils.IsOffline(err) || Utils.IsProxyIssue(err))) {
            //Don't log exceptions for Unauthorized, Offline or Proxy scenarios
            return;
        }
        Telemetry.SendException(err);
    }

    private displayNoCredentialsMessage(): void {
        let error: string = Strings.NoTeamServerCredentialsRunSignin;
        let displayError: string = Strings.NoTeamServerCredentialsRunSignin;
        let learnMoreMessageItem: IButtonMessageItem;
        let showMeMessageItem: IButtonMessageItem;
        if (this._serverContext.RepoInfo.IsTeamServices === true) {
            learnMoreMessageItem = { title : Strings.LearnMore,
                            url : Constants.TokenLearnMoreUrl,
                            telemetryId: TelemetryEvents.TokenLearnMoreClick };
            showMeMessageItem = { title : Strings.ShowMe,
                            url : Constants.TokenShowMeUrl,
                            telemetryId: TelemetryEvents.TokenShowMeClick };
            //Need different messages for popup message and status bar
            //Add the account name to the message to help the user
            error =  util.format(Strings.NoAccessTokenRunSignin, this._serverContext.RepoInfo.Account);
            displayError = util.format(Strings.NoAccessTokenLearnMoreRunSignin, this._serverContext.RepoInfo.Account);
        }
        Logger.LogError(error);
        this.setErrorStatus(error, CommandNames.Signin, false);
        VsCodeUtils.ShowErrorMessage(displayError, learnMoreMessageItem, showMeMessageItem);
    }

    private async initializeExtension(): Promise<void> {
        //Don't initialize if we don't have a workspace
        if (!workspace || !workspace.rootPath) {
            return;
        }
        //Set version of VSCode on the UserAgentProvider
        UserAgentProvider.VSCodeVersion = version;

        // Create the extensions
        this._teamExtension = new TeamExtension(this);
        this._tfvcExtension = new TfvcExtension(this);

        //If Logging is enabled, the user must have used the extension before so we can enable
        //it here.  This will allow us to log errors when we begin processing TFVC commands.
        this._settings = new Settings();
        Telemetry.Initialize(this._settings); //We don't have the serverContext just yet
        this.logStart(this._settings.LoggingLevel, workspace.rootPath);
        this._teamServicesStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
        this._feedbackStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 96);
        this.showFeedbackItem();

        try {
            //RepositoryContext has some initial information about the repository (what we can get without authenticating with server)
            this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath, this._settings);
            if (this._repoContext) {
                this.setupFileSystemWatcherOnHead();
                this._serverContext = new TeamServerContext(this._repoContext.RemoteUrl);
                //Now that we have a server context, we can update it on the repository context
                RepositoryContextFactory.UpdateRepositoryContext(this._repoContext, this._serverContext);

                this._feedbackClient = new FeedbackClient();
                this._credentialManager = new CredentialManager();

                this._credentialManager.GetCredentials(this._serverContext).then(async (creds: CredentialInfo) => {
                    if (!creds || !creds.CredentialHandler) {
                        this.displayNoCredentialsMessage();
                        return;
                    } else {
                        this._serverContext.CredentialInfo = creds;
                        Telemetry.Initialize(this._settings, this._serverContext); //Re-initialize the telemetry with the server context information
                        Logger.LogDebug("Started ApplicationInsights telemetry");

                        //Set up the client we need to talk to the server for more repository information
                        const repositoryInfoClient: RepositoryInfoClient = new RepositoryInfoClient(this._repoContext, CredentialManager.GetCredentialHandler());

                        Logger.LogInfo("Getting repository information with repositoryInfoClient");
                        Logger.LogDebug("RemoteUrl = " + this._repoContext.RemoteUrl);
                        try {
                            //At this point, we have either successfully called git.exe or tf.cmd (we just need to verify the remote urls)
                            //For Git repositories, we call vsts/info and get collection ids, etc.
                            //For TFVC, we have to (potentially) make multiple other calls to get collection ids, etc.
                            this._serverContext.RepoInfo = await repositoryInfoClient.GetRepositoryInfo();

                            //Now we need to go and get the authorized user information
                            const connectionUrl: string = (this._serverContext.RepoInfo.IsTeamServices === true ? this._serverContext.RepoInfo.AccountUrl : this._serverContext.RepoInfo.CollectionUrl);
                            const accountClient: TeamServicesApi = new TeamServicesApi(connectionUrl, [CredentialManager.GetCredentialHandler()]);
                            Logger.LogInfo("Getting connectionData with accountClient");
                            Logger.LogDebug("connectionUrl = " + connectionUrl);
                            try {
                                const settings: any = await accountClient.connect();
                                Logger.LogInfo("Retrieved connectionData with accountClient");
                                this.resetErrorStatus();

                                this._serverContext.UserInfo = new UserInfo(settings.authenticatedUser.id,
                                                                            settings.authenticatedUser.providerDisplayName,
                                                                            settings.authenticatedUser.customDisplayName);
                                //Finally, update Telemetry with the user's specific collection id and user id
                                Telemetry.Update(this._serverContext.RepoInfo.CollectionId, this._serverContext.UserInfo.Id);

                                this.initializeStatusBars();
                                await this.initializeClients(this._repoContext.Type);

                                this.sendStartupTelemetry();
                                Logger.LogInfo(`Sent extension start up telemetry`);

                                Logger.LogObject(settings);
                                this.logDebugInformation();
                            } catch (err) {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined), false);
                                //Wrap err here to get a useful call stack
                                this.ReportError(new Error(err), Utils.GetMessageForStatusCode(err, err.message, "Failed to get results with accountClient: "));
                            }
                        } catch (err) {
                            //TODO: With TFVC, creating a RepositoryInfo can throw (can't get project collection, can't get team project, etc.)
                            // We get a 404 on-prem if we aren't Update 2 or later
                            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true && err.statusCode === 404) {
                                this.setErrorStatus(Strings.UnsupportedServerVersion, undefined, false);
                                Logger.LogError(Strings.UnsupportedServerVersion);
                                Telemetry.SendEvent(TelemetryEvents.UnsupportedServerVersion);
                            } else {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined), false);
                                //Wrap err here to get a useful call stack
                                this.ReportError(new Error(err), Utils.GetMessageForStatusCode(err, err.message, "Failed call with repositoryClient: "));
                            }
                        }
                    }

                    // Now that everything else is ready, create the SCM provider
                    if (this._repoContext.Type === RepositoryType.TFVC) {
                        const tfvcContext: TfvcContext = <TfvcContext>this._repoContext;
                        this.sendTfvcToolingTelemetry(tfvcContext.TfvcRepository);
                        Logger.LogInfo(`Sent TFVC tooling telemetry`);
                        if (!this._scmProvider) {
                            Logger.LogDebug(`Initializing the TfvcSCMProvider`);
                            this._scmProvider = new TfvcSCMProvider(this);
                            await this._scmProvider.Initialize();
                            Logger.LogDebug(`Initialized the TfvcSCMProvider`);
                        } else {
                            Logger.LogDebug(`Re-initializing the TfvcSCMProvider`);
                            await this._scmProvider.Reinitialize();
                            Logger.LogDebug(`Re-initialized the TfvcSCMProvider`);
                        }
                    }
                }).fail((err) => {
                    this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined), false);
                    //If we can't get a requestHandler, report the error via the feedbackclient
                    const message: string = Utils.GetMessageForStatusCode(err, err.message, "Failed to get a credential handler");
                    Logger.LogError(message);
                    Telemetry.SendException(err);
                });
            }
        } catch (err) {
            Logger.LogError(err.message);
            //For now, don't report these errors via the _feedbackClient
            if (!err.tfvcErrorCode || this.shouldDisplayTfvcError(err.tfvcErrorCode)) {
                this.setErrorStatus(err.message, undefined, false);
                VsCodeUtils.ShowErrorMessage(err.message, ...err.messageOptions);
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

        Telemetry.SendEvent(event);
    }

    //Sends telemetry based on values of the TfvcRepostiory (which TF tooling (Exe or CLC) is being used)
    private sendTfvcToolingTelemetry(repository: TfvcRepository): void {
        let event: string = TfvcTelemetryEvents.UsingExe;

        if (!repository.IsExe) {
            event = TfvcTelemetryEvents.UsingClc;
        }
        Telemetry.SendEvent(event);

        if (repository.RestrictWorkspace) {
            Telemetry.SendEvent(TfvcTelemetryEvents.RestrictWorkspace);
        }
    }

    //Determines which Tfvc errors to display in the status bar ui
    private shouldDisplayTfvcError(errorCode: string): boolean {
        if (TfvcErrorCodes.MinVersionWarning === errorCode ||
            TfvcErrorCodes.NotFound === errorCode ||
            TfvcErrorCodes.NotAuthorizedToAccess === errorCode ||
            TfvcErrorCodes.NotAnEnuTfCommandLine === errorCode) {
            return true;
        }
        return false;
    }

    //Set up the initial status bars
    private initializeStatusBars(): void {
        if (this.ensureMinimalInitialization()) {
            this._teamServicesStatusBarItem.command = CommandNames.OpenTeamSite;
            this._teamServicesStatusBarItem.text = this._serverContext.RepoInfo.TeamProject ? this._serverContext.RepoInfo.TeamProject : "<none>";
            this._teamServicesStatusBarItem.tooltip = Strings.NavigateToTeamServicesWebSite;
            this._teamServicesStatusBarItem.show();

            if (this.EnsureInitialized(RepositoryType.ANY)) {
                // Update the extensions
                this._teamExtension.InitializeStatusBars();
                //this._tfvcExtension.InitializeStatusBars();
            }
        }
    }

    //Set up the initial status bars
    private async initializeClients(repoType: RepositoryType): Promise<void> {
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
        Logger.LogDebug("repositoryFolder: " + this._repoContext.RepoFolder);
        Logger.LogDebug("repositoryRemoteUrl: " + this._repoContext.RemoteUrl);
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
            Logger.LogPath = rootPath;
            Logger.LogInfo(`*** FOLDER: ${rootPath} ***`);
            Logger.LogInfo(`version ${Constants.ExtensionVersion}`);
        } else {
            Logger.LogInfo(`*** Folder not opened ***`);
        }
    }

    private resetErrorStatus(): void {
        this._errorMessage = undefined;
    }

    private setErrorStatus(message: string, commandOnClick?: string, showRetryMessage?: boolean): void {
        this._errorMessage = message;
        if (this._teamServicesStatusBarItem !== undefined) {
            //TODO: Should the default command be to do nothing?  Or perhaps to display the message?
            this._teamServicesStatusBarItem.command = commandOnClick === undefined ? CommandNames.Reinitialize : commandOnClick;
            this._teamServicesStatusBarItem.text = "Team " + `$(icon octicon-stop)`;
            const message: string = this._errorMessage + (showRetryMessage !== undefined && showRetryMessage === true ? " " + Strings.ClickToRetryConnection : "") ;
            this._teamServicesStatusBarItem.tooltip = message;
            this._teamServicesStatusBarItem.show();
        }
    }

    //Sets up a file system watcher on HEAD so we can know when the current branch has changed
    private async setupFileSystemWatcherOnHead(): Promise<void> {
        if (this._repoContext && this._repoContext.Type === RepositoryType.GIT) {
            const pattern: string = this._repoContext.RepoFolder + "/HEAD";
            const fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, true, false, true);
            fsw.onDidChange(async (/*uri*/) => {
                Logger.LogInfo("HEAD has changed, re-parsing RepoContext object");
                this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath, this._settings);
                Logger.LogInfo("CurrentBranch is: " + this._repoContext.CurrentBranch);
                this.notifyBranchChanged(/*this._repoContext.CurrentBranch*/);
            });
        }
    }

    private notifyBranchChanged(/*TODO: currentBranch: string*/): void {
        this._teamExtension.NotifyBranchChanged();
        //this._tfvcExtension.NotifyBranchChanged(currentBranch);
    }

    //Sets up a file system watcher on config so we can know when the remote origin has changed
    private async setupFileSystemWatcherOnConfig(): Promise<void> {
        //If we don't have a workspace, don't set up the file watcher
        if (!workspace || !workspace.rootPath) {
            return;
        }

        if (this._repoContext && this._repoContext.Type === RepositoryType.GIT) {
            const pattern: string = path.join(workspace.rootPath, ".git", "config");
            //We want to listen to file creation, change and delete events
            const fsw:FileSystemWatcher = workspace.createFileSystemWatcher(pattern, false, false, false);
            fsw.onDidCreate((/*uri*/) => {
                //When a new local repo is initialized (e.g., git init), re-initialize the extension
                Logger.LogInfo("config has been created, re-initializing the extension");
                this.Reinitialize();
            });
            fsw.onDidChange(async (uri) => {
                Logger.LogInfo("config has changed, checking if 'remote origin' changed");
                const context: IRepositoryContext = await RepositoryContextFactory.CreateRepositoryContext(uri.fsPath, this._settings);
                const remote: string = context.RemoteUrl;
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
            fsw.onDidDelete((/*uri*/) => {
                Logger.LogInfo("config has been deleted, re-initializing the extension");
                this.Reinitialize();
            });
        }
    }

    private showFeedbackItem(): void {
        this._feedbackStatusBarItem.command = CommandNames.SendFeedback;
        this._feedbackStatusBarItem.text = `$(icon octicon-megaphone)`;
        this._feedbackStatusBarItem.tooltip = Strings.SendFeedback;
        this._feedbackStatusBarItem.show();
    }

    private cleanup(preserveTeamExtension: boolean = false): void {
        if (this._teamServicesStatusBarItem) {
            this._teamServicesStatusBarItem.dispose();
            this._teamServicesStatusBarItem = undefined;
        }
        if (this._feedbackStatusBarItem !== undefined) {
            this._feedbackStatusBarItem.dispose();
            this._feedbackStatusBarItem = undefined;
        }
        //If we are signing out, we need to keep some of the objects around
        if (!preserveTeamExtension && this._teamExtension) {
            this._teamExtension.dispose();
            this._teamExtension = undefined;
            this._serverContext = undefined;
            this._credentialManager = undefined;

            if (this._tfvcExtension) {
                this._tfvcExtension.dispose();
                this._tfvcExtension = undefined;
            }
            if (this._scmProvider) {
                this._scmProvider.dispose();
                this._scmProvider = undefined;
            }
            //Make sure we clean up any running instances of TF
            TfCommandLineRunner.DisposeStatics();
        }

        //The following will be reset during a re-initialization
        this._repoContext = undefined;
        this._settings = undefined;
        this._errorMessage = undefined;
    }

    public dispose() {
        this.cleanup();
    }

    //If we're signing out, we don't want to dispose of everything.
    public SignOut(): void {
        this.cleanup(true);
    }
}
