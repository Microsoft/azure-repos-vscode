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
        await this.initializeExtension(false /*reinitializing*/);

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
        this.initializeExtension(true /*reinitializing*/);
    }

    public SendFeedback(): void {
        //SendFeedback doesn't need to ensure the extension is initialized
        FeedbackClient.SendFeedback();
    }

    //Ensure we have a TFS or Team Services-based repository. Otherwise, return false.
    private ensureMinimalInitialization(): boolean {
        if (!this._repoContext
                || !this._serverContext
                || !this._serverContext.RepoInfo.IsTeamFoundation) {
            //If the user previously signed out (in this session of VS Code), show a message to that effect
            if (this._teamExtension.IsSignedOut) {
                this.setErrorStatus(Strings.UserMustSignIn, CommandNames.Signin);
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

    //Ensures a folder is open before attempting to run any command already shown in
    //the Command Palette (and defined in package.json).
    public RunCommand(funcToTry: (args) => void, ...args: string[]): void {
        if (!workspace || !workspace.rootPath) {
            this.DisplayErrorMessage(Strings.FolderNotOpened);
            return;
        }
        funcToTry(args);
    }

    private displayNoCredentialsMessage(): void {
        let error: string = Strings.NoTeamServerCredentialsRunSignin;
        let displayError: string = Strings.NoTeamServerCredentialsRunSignin;
        const messageItems: IButtonMessageItem[] = [];
        if (this._serverContext.RepoInfo.IsTeamServices === true) {
            messageItems.push({ title : Strings.LearnMore,
                            url : Constants.TokenLearnMoreUrl,
                            telemetryId: TelemetryEvents.TokenLearnMoreClick });
            messageItems.push({ title : Strings.ShowMe,
                            url : Constants.TokenShowMeUrl,
                            telemetryId: TelemetryEvents.TokenShowMeClick });
            //Need different messages for popup message and status bar
            //Add the account name to the message to help the user
            error =  util.format(Strings.NoAccessTokenRunSignin, this._serverContext.RepoInfo.Account);
            displayError = util.format(Strings.NoAccessTokenLearnMoreRunSignin, this._serverContext.RepoInfo.Account);
        }
        Logger.LogError(error);
        this.setErrorStatus(error, CommandNames.Signin);
        VsCodeUtils.ShowErrorMessage(displayError, ...messageItems);
    }

    private formatErrorLogMessage(err): string {
        let logMsg: string = err.message;
        if (err.stderr) { //Add stderr to logged message if we have it
            logMsg = Utils.FormatMessage(`${logMsg} ${err.stderr}`);
        }
        return logMsg;
    }

    private async initializeExtension(reinitializing: boolean): Promise<void> {
        //Set version of VSCode on the UserAgentProvider
        UserAgentProvider.VSCodeVersion = version;

        //Users could install without having a folder (workspace) open
        this._settings = new Settings(); //We need settings before showing the Welcome message
        Telemetry.Initialize(this._settings); //Need to initialize telemetry for showing welcome message
        if (!reinitializing) {
            await this.showWelcomeMessage(); //Ensure we show the message before hooking workspace.onDidChangeConfiguration
        }

        //Don't initialize if we don't have a workspace
        if (!workspace || !workspace.rootPath) {
            return;
        }

        // Create the extensions
        this._teamExtension = new TeamExtension(this);
        this._tfvcExtension = new TfvcExtension(this);

        //If Logging is enabled, the user must have used the extension before so we can enable
        //it here.  This will allow us to log errors when we begin processing TFVC commands.
        Telemetry.SendEvent(TelemetryEvents.Installed); //Send event that the extension is installed (even if not used)
        this.logStart(this._settings.LoggingLevel, workspace.rootPath);
        this._teamServicesStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
        this._feedbackStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 96);

        try {
            //RepositoryContext has some initial information about the repository (what we can get without authenticating with server)
            this._repoContext = await RepositoryContextFactory.CreateRepositoryContext(workspace.rootPath, this._settings);
            if (this._repoContext) {
                this.showFeedbackItem();
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

                                this.initializeStatusBars();
                                await this.initializeClients(this._repoContext.Type);

                                this.sendStartupTelemetry();
                                Logger.LogInfo(`Sent extension start up telemetry`);

                                Logger.LogObject(settings);
                                this.logDebugInformation();
                            } catch (err) {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined));
                                //Wrap err here to get a useful call stack
                                this.ReportError(new Error(err), Utils.GetMessageForStatusCode(err, err.message, "Failed to get results with accountClient: "));
                            }
                        } catch (err) {
                            //TODO: With TFVC, creating a RepositoryInfo can throw (can't get project collection, can't get team project, etc.)
                            // We get a 404 on-prem if we aren't TFS 2015 Update 2 or later and 'core id' error with TFS 2013 RTM (and likely later)
                            if (this._serverContext.RepoInfo.IsTeamFoundationServer === true &&
                                (err.statusCode === 404 || (err.message && err.message.indexOf("Failed to find api location for area: core id:") === 0))) {
                                this.setErrorStatus(Strings.UnsupportedServerVersion);
                                Logger.LogError(Strings.UnsupportedServerVersion);
                                Telemetry.SendEvent(TelemetryEvents.UnsupportedServerVersion);
                            } else {
                                this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined));
                                //Wrap err here to get a useful call stack
                                this.ReportError(new Error(err), Utils.GetMessageForStatusCode(err, err.message, "Failed call with repositoryClient: "));
                            }
                        }
                    }

                    // Now that everything else is ready, create the SCM provider
                    try {
                        if (this._repoContext.Type === RepositoryType.TFVC) {
                            const tfvcContext: TfvcContext = <TfvcContext>this._repoContext;
                            this.sendTfvcConfiguredTelemetry(tfvcContext.TfvcRepository);
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
                            this.sendTfvcConnectedTelemetry(tfvcContext.TfvcRepository);
                        }
                    } catch (err) {
                        Logger.LogError(`Caught an exception during Tfvc SCM Provider initialization`);
                        const logMsg: string = this.formatErrorLogMessage(err);
                        Logger.LogError(logMsg);
                        if (err.tfvcErrorCode) {
                            this.setErrorStatus(err.message);
                            //Dispose of the Build and WIT status bar items so they don't show up (they should be re-created once a new folder is opened)
                            this._teamExtension.cleanup();
                            if (this.shouldDisplayTfvcError(err.tfvcErrorCode)) {
                                VsCodeUtils.ShowErrorMessage(err.message, ...err.messageOptions);
                            }
                        }
                    }
                }).fail((err) => {
                    this.setErrorStatus(Utils.GetMessageForStatusCode(err, err.message), (err.statusCode === 401 ? CommandNames.Signin : undefined));
                    //If we can't get a requestHandler, report the error via the feedbackclient
                    const message: string = Utils.GetMessageForStatusCode(err, err.message, "Failed to get a credential handler");
                    Logger.LogError(message);
                    Telemetry.SendException(err);
                });
            }
        } catch (err) {
            const logMsg: string = this.formatErrorLogMessage(err);
            Logger.LogError(logMsg);
            //For now, don't report these errors via the FeedbackClient (TFVC errors could result from TfvcContext creation failing)
            if (!err.tfvcErrorCode || this.shouldDisplayTfvcError(err.tfvcErrorCode)) {
                this.setErrorStatus(err.message);
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

    //Sends telemetry based on values of the TfvcRepository (which TF tooling (Exe or CLC) is configured)
    private sendTfvcConfiguredTelemetry(repository: TfvcRepository): void {
        let event: string = TfvcTelemetryEvents.ExeConfigured;

        if (!repository.IsExe) {
            event = TfvcTelemetryEvents.ClcConfigured;
        }
        Telemetry.SendEvent(event);

        //For now, this is simply an indication that users have configured that feature
        if (repository.RestrictWorkspace) {
            Telemetry.SendEvent(TfvcTelemetryEvents.RestrictWorkspace);
        }
    }

    //Sends telemetry based on values of the TfvcRepository (which TF tooling (Exe or CLC) was connected)
    private sendTfvcConnectedTelemetry(repository: TfvcRepository): void {
        let event: string = TfvcTelemetryEvents.ExeConnected;

        if (!repository.IsExe) {
            event = TfvcTelemetryEvents.ClcConnected;
        }
        Telemetry.SendEvent(event);
    }

    //Determines which Tfvc errors to display in the status bar ui
    private shouldDisplayTfvcError(errorCode: string): boolean {
        if (TfvcErrorCodes.MinVersionWarning === errorCode ||
            TfvcErrorCodes.NotFound === errorCode ||
            TfvcErrorCodes.NotAuthorizedToAccess === errorCode ||
            TfvcErrorCodes.NotAnEnuTfCommandLine === errorCode ||
            TfvcErrorCodes.WorkspaceNotKnownToClc === errorCode) {
            return true;
        }
        return false;
    }

    //Ensure this is async (and is awaited on) so that the extension doesn't continue until user deals with message
    private async showWelcomeMessage(): Promise<void> {
        if (this._settings.ShowWelcomeMessage) {
            const welcomeMessage: string = `Welcome to version ${Constants.ExtensionVersion} of the Azure Repos extension!`;
            const messageItems: IButtonMessageItem[] = [];
            messageItems.push({ title : Strings.LearnMore,
                                url : Constants.ReadmeLearnMoreUrl,
                                telemetryId : TelemetryEvents.WelcomeLearnMoreClick });
            messageItems.push({ title : Strings.SetupTfvcSupport,
                                url : Constants.TfvcLearnMoreUrl,
                                telemetryId : TfvcTelemetryEvents.SetupTfvcSupportClick });
            messageItems.push({ title : Strings.DontShowAgain });
            const chosenItem: IButtonMessageItem = await VsCodeUtils.ShowInfoMessage(welcomeMessage, ...messageItems);
            if (chosenItem && chosenItem.title === Strings.DontShowAgain) {
                this._settings.ShowWelcomeMessage = false;
            }
        }
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
                        + ", azure devops services: " + this._serverContext.RepoInfo.IsTeamServices.toString());
    }

    private logStart(loggingLevel: string, rootPath: string): void {
        if (loggingLevel === undefined) {
            return;
        }
        Logger.SetLoggingLevel(loggingLevel);
        if (rootPath !== undefined) {
            Logger.LogPath = rootPath;
            Logger.LogInfo(`*** FOLDER: ${rootPath} ***`);
            Logger.LogInfo(`${UserAgentProvider.UserAgent}`);
        } else {
            Logger.LogInfo(`*** Folder not opened ***`);
        }
    }

    private resetErrorStatus(): void {
        this._errorMessage = undefined;
    }

    private setErrorStatus(message: string, commandOnClick?: string): void {
        this._errorMessage = message;
        if (this._teamServicesStatusBarItem !== undefined) {
            //TODO: Should the default command be to display the message?
            this._teamServicesStatusBarItem.command = commandOnClick; // undefined clears the command
            this._teamServicesStatusBarItem.text = `Team $(stop)`;
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
                        Logger.LogInfo("remote was removed, previously had an Azure Repos remote, re-initializing the extension");
                        this.Reinitialize();
                        return;
                    }
                    //There was no previous remote, so do nothing
                    Logger.LogInfo("remote does not exist, no previous Azure Repos remote, nothing to do");
                } else if (this._repoContext !== undefined) {
                    //We have a valid gitContext already, check to see what changed
                    if (this._repoContext.RemoteUrl !== undefined) {
                        //The config has changed, and we had a Team Services remote already
                        if (remote.toLowerCase() !== this._repoContext.RemoteUrl.toLowerCase()) {
                            //And they're different, reinitialize
                            Logger.LogInfo("remote changed to a different Azure Repos remote, re-initializing the extension");
                            this.Reinitialize();
                        }
                    } else {
                        //The remote was initialized to a Team Services remote, reinitialize
                        Logger.LogInfo("remote initialized to an Azure Repos remote, re-initializing the extension");
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
        this._feedbackStatusBarItem.text = `$(megaphone)`;
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
        //No matter if we're signing out or re-initializing, we need the team extension's
        //status bars and timers to be disposed but not the entire object
        this._teamExtension.cleanup();

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
