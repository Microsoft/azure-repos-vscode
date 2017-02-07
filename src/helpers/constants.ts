/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

/* tslint:disable:variable-name */
export class Constants {
    static ExtensionName: string = "team";
    static OAuth: string = "OAuth";
    static TokenLearnMoreUrl: string = "https://aka.ms/v9r4jt";
    static ReadmeLearnMoreUrl: string = "https://aka.ms/jkapah";
}

export class CommandNames {
    static CommandPrefix: string = Constants.ExtensionName + ".";
    static GetPullRequests: string = CommandNames.CommandPrefix + "GetPullRequests";
    static Login: string = CommandNames.CommandPrefix + "Login";
    static Logout: string = CommandNames.CommandPrefix + "Logout";
    static OpenBlamePage: string = CommandNames.CommandPrefix + "OpenBlamePage";
    static OpenBuildSummaryPage: string = CommandNames.CommandPrefix + "OpenBuildSummaryPage";
    static OpenFileHistory: string = CommandNames.CommandPrefix + "OpenFileHistory";
    static OpenNewBug: string = CommandNames.CommandPrefix + "OpenNewBug";
    static OpenNewTask: string = CommandNames.CommandPrefix + "OpenNewTask";
    static OpenNewPullRequest: string = CommandNames.CommandPrefix + "OpenNewPullRequest";
    static OpenNewWorkItem: string = CommandNames.CommandPrefix + "OpenNewWorkItem";
    static OpenPullRequestsPage: string = CommandNames.CommandPrefix + "OpenPullRequestsPage";
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

export class TfvcCommandNames {
    static CommandPrefix: string = "tfvc.";
    static Status: string = TfvcCommandNames.CommandPrefix + "Status";
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
}

export class TelemetryEvents {
    static TelemetryPrefix: string = Constants.ExtensionName + "/";
    static ExternalRepository: string = TelemetryEvents.TelemetryPrefix + "externalrepo";
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
    static OpenPullRequestsPage: string = TelemetryEvents.TelemetryPrefix + "openpullrequestspage";
    static ReadmeLearnMoreClick: string = TelemetryEvents.TelemetryPrefix + "readmelearnmoreclick";
    static SendAFrown: string = TelemetryEvents.TelemetryPrefix + "sendafrown";
    static SendASmile: string = TelemetryEvents.TelemetryPrefix + "sendasmile";
    static ShowMyWorkItemQueries: string = TelemetryEvents.TelemetryPrefix + "showmyworkitemqueries";
    static StartUp: string = TelemetryEvents.TelemetryPrefix + "startup";
    static TokenLearnMoreClick: string = TelemetryEvents.TelemetryPrefix + "tokenlearnmoreclick";
    static ViewPullRequest: string = TelemetryEvents.TelemetryPrefix + "viewpullrequest";
    static ViewPullRequests: string = TelemetryEvents.TelemetryPrefix + "viewpullrequests";
    static ViewMyWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewmyworkitems";
    static ViewPinnedQueryWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewpinnedqueryworkitems";
    static ViewWorkItem: string = TelemetryEvents.TelemetryPrefix + "viewworkitem";
    static ViewWorkItems: string = TelemetryEvents.TelemetryPrefix + "viewworkitems";
}

export class TfvcTelemetryEvents {
    static TelemetryPrefix: string = "tfvc/";
    static OpenFileHistory: string = TfvcTelemetryEvents.TelemetryPrefix + "openfilehistory";
    static OpenRepositoryHistory: string = TfvcTelemetryEvents.TelemetryPrefix + "openrepohistory";
    static Status: string = TfvcTelemetryEvents.TelemetryPrefix + "status";
    static StartUp: string = TfvcTelemetryEvents.TelemetryPrefix + "startup";
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
/* tslint:enable:variable-name */
