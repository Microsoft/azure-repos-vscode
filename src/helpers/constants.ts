/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

/* tslint:disable:variable-name */
export class Constants {
    static ExtensionName: string = "team";
    static ExtensionUserAgentName: string = "AzureReposVSCode";
    static ExtensionVersion: string = "1.161.0";
    static OAuth: string = "OAuth";
    static TokenLearnMoreUrl: string = "https://aka.ms/v9r4jt";
    static TokenShowMeUrl: string = "https://aka.ms/o2wkmo";
    static ReadmeLearnMoreUrl: string = "https://aka.ms/jkapah";
    static TfvcLearnMoreUrl: string = "https://github.com/Microsoft/azure-repos-vscode/blob/master/TFVC_README.md#quick-start";
    static ServerWorkspaceUrl: string = "https://github.com/Microsoft/azure-repos-vscode/blob/master/TFVC_README.md#what-is-the-difference-between-a-local-and-server-workspace-how-can-i-tell-which-one-im-working-with";
    static VS2015U3CSRUrl: string = "https://msdn.microsoft.com/en-us/library/mt752379.aspx";
    static WorkspaceNotDetectedByClcUrl: string = "https://github.com/Microsoft/azure-repos-vscode/blob/master/TFVC_README.md#using-the-tee-clc-i-am-unable-to-access-an-existing-local-workspace-what-can-i-do";
    static NonEnuTfExeConfiguredUrl: string = "https://github.com/Microsoft/azure-repos-vscode/blob/master/TFVC_README.md#i-received-the-it-appears-you-have-configured-a-non-english-version-of-the-tf-executable-please-ensure-an-english-version-is-properly-configured-error-message-after-configuring-tfexe-how-can-i-get-the-extension-to-work-properly";
}

export class CommandNames {
    static CommandPrefix: string = Constants.ExtensionName + ".";
    static AssociateWorkItems: string = CommandNames.CommandPrefix + "AssociateWorkItems";
    static GetPullRequests: string = CommandNames.CommandPrefix + "GetPullRequests";
    static OpenBlamePage: string = CommandNames.CommandPrefix + "OpenBlamePage";
    static OpenBuildSummaryPage: string = CommandNames.CommandPrefix + "OpenBuildSummaryPage";
    static OpenFileHistory: string = CommandNames.CommandPrefix + "OpenFileHistory";
    static OpenNewBug: string = CommandNames.CommandPrefix + "OpenNewBug";
    static OpenNewTask: string = CommandNames.CommandPrefix + "OpenNewTask";
    static OpenNewPullRequest: string = CommandNames.CommandPrefix + "OpenNewPullRequest";
    static OpenNewWorkItem: string = CommandNames.CommandPrefix + "OpenNewWorkItem";
    static OpenTeamSite: string = CommandNames.CommandPrefix + "OpenTeamSite";
    static RefreshPollingStatus: string = CommandNames.CommandPrefix + "RefreshPollingStatus";
    static Reinitialize: string = CommandNames.CommandPrefix + "Reinitialize";
    static SendFeedback: string = CommandNames.CommandPrefix + "SendFeedback";
    static Signin: string = CommandNames.CommandPrefix + "Signin";
    static Signout: string = CommandNames.CommandPrefix + "Signout";
    static ViewWorkItemQueries: string = CommandNames.CommandPrefix + "ViewWorkItemQueries";
    static ViewWorkItems: string = CommandNames.CommandPrefix + "ViewWorkItems";
    static ViewPinnedQueryWorkItems: string = CommandNames.CommandPrefix + "ViewPinnedQueryWorkItems";
}

export class DeviceFlowConstants {
    static ManualOption: string = "manual";
    static DeviceFlowOption: string = "deviceflow";
    static ClientId: string = "97877f11-0fc6-4aee-b1ff-febb0519dd00";
    static RedirectUri: string = "https://java.visualstudio.com";
}

export class TfvcCommandNames {
    static CommandPrefix: string = "tfvc.";
    static Checkin: string = TfvcCommandNames.CommandPrefix + "Checkin";
    static Delete: string = TfvcCommandNames.CommandPrefix + "Delete";
    static Exclude: string = TfvcCommandNames.CommandPrefix + "Exclude";
    static ExcludeAll: string = TfvcCommandNames.CommandPrefix + "ExcludeAll";
    static Include: string = TfvcCommandNames.CommandPrefix + "Include";
    static IncludeAll: string = TfvcCommandNames.CommandPrefix + "IncludeAll";
    static Open: string = TfvcCommandNames.CommandPrefix + "Open";
    static OpenDiff: string = TfvcCommandNames.CommandPrefix + "OpenDiff";
    static OpenFile: string = TfvcCommandNames.CommandPrefix + "OpenFile";
    static Refresh: string = TfvcCommandNames.CommandPrefix + "Refresh";
    static Rename: string = TfvcCommandNames.CommandPrefix + "Rename";
    static ResolveKeepYours: string = TfvcCommandNames.CommandPrefix + "ResolveKeepYours";
    static ResolveTakeTheirs: string = TfvcCommandNames.CommandPrefix + "ResolveTakeTheirs";
    static ShowOutput: string = TfvcCommandNames.CommandPrefix + "ShowOutput";
    static Sync: string = TfvcCommandNames.CommandPrefix + "Sync";
    static Undo: string = TfvcCommandNames.CommandPrefix + "Undo";
    static UndoAll: string = TfvcCommandNames.CommandPrefix + "UndoAll";
}

export class SettingNames {
    static SettingsPrefix: string = Constants.ExtensionName + ".";
    static PinnedQueries: string = SettingNames.SettingsPrefix + "pinnedQueries";
    static AccessTokens: string = SettingNames.SettingsPrefix + "accessTokens";
    static LoggingPrefix: string = SettingNames.SettingsPrefix + "logging.";
    static LoggingLevel: string = SettingNames.LoggingPrefix + "level";
    static PollingInterval: string = SettingNames.SettingsPrefix + "pollingInterval";
    static AppInsights: string = SettingNames.SettingsPrefix + "appInsights.";
    static AppInsightsEnabled: string = SettingNames.AppInsights + "enabled";
    static AppInsightsKey: string = SettingNames.AppInsights + "key";
    static RemoteUrl: string = SettingNames.SettingsPrefix + "remoteUrl";
    static TeamProject: string = SettingNames.SettingsPrefix + "teamProject";
    static BuildDefinitionId: string = SettingNames.SettingsPrefix + "buildDefinitionId";
    static ShowWelcomeMessage: string = SettingNames.SettingsPrefix + "showWelcomeMessage";
}

export class TelemetryEvents {
    static TelemetryPrefix: string = Constants.ExtensionName + "/";
    static AssociateWorkItems: string = TelemetryEvents.TelemetryPrefix + "associateworkitems";
    static DeviceFlowCanceled: string = TelemetryEvents.TelemetryPrefix + "deviceflowcanceled";
    static DeviceFlowFailed: string = TelemetryEvents.TelemetryPrefix + "deviceflowfailed";
    static DeviceFlowPat: string = TelemetryEvents.TelemetryPrefix + "deviceflowpat";
    static ExternalRepository: string = TelemetryEvents.TelemetryPrefix + "externalrepo";
    static Installed: string = TelemetryEvents.TelemetryPrefix + "installed";
    static ManualPat: string = TelemetryEvents.TelemetryPrefix + "manualpat";
    static OpenAdditionalQueryResults: string = TelemetryEvents.TelemetryPrefix + "openaddlqueryresults";
    static OpenBlamePage: string = TelemetryEvents.TelemetryPrefix + "openblame";
    static OpenBuildSummaryPage: string = TelemetryEvents.TelemetryPrefix + "openbuildsummary";
    static OpenFileHistory: string = TelemetryEvents.TelemetryPrefix + "openfilehistory";
    static OpenNewTask: string = TelemetryEvents.TelemetryPrefix + "opennewtask";
    static OpenNewBug: string = TelemetryEvents.TelemetryPrefix + "opennewbug";
    static OpenNewPullRequest: string = TelemetryEvents.TelemetryPrefix + "opennewpullrequest";
    static OpenNewWorkItem: string = TelemetryEvents.TelemetryPrefix + "opennewworkitem";
    static OpenRepositoryHistory: string = TelemetryEvents.TelemetryPrefix + "openrepohistory";
    static OpenTeamSite: string = TelemetryEvents.TelemetryPrefix + "openteamprojectweb";
    static ReadmeLearnMoreClick: string = TelemetryEvents.TelemetryPrefix + "readmelearnmoreclick";
    static SendAFrown: string = TelemetryEvents.TelemetryPrefix + "sendafrown";
    static SendASmile: string = TelemetryEvents.TelemetryPrefix + "sendasmile";
    static ShowMyWorkItemQueries: string = TelemetryEvents.TelemetryPrefix + "showmyworkitemqueries";
    static StartUp: string = TelemetryEvents.TelemetryPrefix + "startup";
    static TokenLearnMoreClick: string = TelemetryEvents.TelemetryPrefix + "tokenlearnmoreclick";
    static TokenShowMeClick: string = TelemetryEvents.TelemetryPrefix + "tokenshowmeclick";
    static UnsupportedServerVersion: string = TelemetryEvents.TelemetryPrefix + "unsupportedversion";
    static UnsupportedWitServerVersion: string = TelemetryEvents.TelemetryPrefix + "unsupportedwitversion";
    static ViewPullRequest: string = TelemetryEvents.TelemetryPrefix + "viewpullrequest";
    static ViewPullRequests: string = TelemetryEvents.TelemetryPrefix + "viewpullrequests";
    static ViewMyWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewmyworkitems";
    static ViewPinnedQueryWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewpinnedqueryworkitems";
    static ViewWorkItem: string = TelemetryEvents.TelemetryPrefix + "viewworkitem";
    static ViewWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewworkitems";
    static VS2015U3CSR: string = TelemetryEvents.TelemetryPrefix + "vs2015u3csr";
    static WelcomeLearnMoreClick: string = TelemetryEvents.TelemetryPrefix + "welcomelearnmoreclick";
}

//Don't export this class. TfvcTelemetryEvents is the only one which should be used when sending telemetry
class TfvcBaseTelemetryEvents {
    static TelemetryPrefix: string = "tfvc/";
    static Clc: string = TfvcBaseTelemetryEvents.TelemetryPrefix + "clc";
    static Exe: string = TfvcBaseTelemetryEvents.TelemetryPrefix + "exe";
    static Add: string = "add";
    static Checkin: string = "checkin";
    static Configured: string = "configured";
    static Connected: string = "connected";
    static Delete: string = "delete";
    static GetFileContent: string = "getfilecontent";
    static LearnMoreClick: string = "learnmoreclick";
    static NameAndContentConflict: string = "nameandcontentconflict";
    static NonEnuConfiguredMoreDetails: string = "nonenuconfiguredmoredetails";
    static OpenFileHistory: string = "openfilehistory";
    static OpenRepositoryHistory: string = "openrepohistory";
    static RenameConflict: string = "renameconflict";
    static Rename: string = "rename";
    static ResolveConflicts: string = "resolveconflicts";
    static RestrictWorkspace: string = "restrictworkspace";
    static StartUp: string = "startup";
    static Sync: string = "sync";
    static Undo: string = "undo";
    static UndoAll: string = "undoall";
    static WorkspaceAccessError: string = "workspaceaccesserror";
}

export class TfvcTelemetryEvents {
    static UsingClc: string = TfvcBaseTelemetryEvents.Clc;
    static UsingExe: string = TfvcBaseTelemetryEvents.Exe;
    static LearnMoreClick: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.LearnMoreClick;
    static NameAndContentConflict: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.NameAndContentConflict;
    static OpenFileHistory: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.OpenFileHistory;
    static OpenRepositoryHistory: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.OpenRepositoryHistory;
    static RenameConflict: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.RenameConflict;
    static RestrictWorkspace: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.RestrictWorkspace;
    static StartUp: string = TfvcBaseTelemetryEvents.TelemetryPrefix + TfvcBaseTelemetryEvents.StartUp;
    static SetupTfvcSupportClick: string = TfvcBaseTelemetryEvents.TelemetryPrefix + "setuptfvcsupportclick";
    //Begin tooling-specific telemetry (tf.exe or CLC)
    static ClcConfigured: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Configured;
    static ExeConfigured: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Configured;
    static ClcConnected: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Connected;
    static ExeConnected: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Connected;
    static AddExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Add;
    static AddClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Add;
    static CheckinExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Checkin;
    static CheckinClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Checkin;
    static DeleteExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Delete;
    static DeleteClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Delete;
    static GetFileContentExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.GetFileContent;
    static GetFileContentClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.GetFileContent;
    static RenameExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Rename;
    static RenameClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Rename;
    static ResolveConflictsExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.ResolveConflicts;
    static ResolveConflictsClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.ResolveConflicts;
    static SyncExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Sync;
    static SyncClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Sync;
    static UndoExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.Undo;
    static UndoClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.Undo;
    static UndoAllExe: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.UndoAll;
    static UndoAllClc: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.UndoAll;
    static ClcCannotAccessWorkspace: string = TfvcTelemetryEvents.UsingClc + "-" + TfvcBaseTelemetryEvents.WorkspaceAccessError;
    static ExeNonEnuConfiguredMoreDetails: string = TfvcTelemetryEvents.UsingExe + "-" + TfvcBaseTelemetryEvents.NonEnuConfiguredMoreDetails;
}

export class WellKnownRepositoryTypes {
    static TfsGit: string = "TfsGit";
}

export class WitQueries {
    static MyWorkItems: string = "select [System.Id], [System.WorkItemType], [System.Title], [System.State] " +
                                "from WorkItems where [System.TeamProject] = @project and " +
                                "[System.WorkItemType] <> '' and [System.AssignedTo] = @Me order by [System.ChangedDate] desc";
}

export class WitTypes {
    static Bug: string = "Bug";
    static Task: string = "Task";
}

export enum MessageTypes {
    Error = 0,
    Warn = 1,
    Info = 2
}
/* tslint:enable:variable-name */
