/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { commands, ExtensionContext } from "vscode";
import { CommandNames, TfvcCommandNames } from "./helpers/constants";
import { TeamExtension } from "./team-extension";
import { TfvcExtension } from "./tfvc/tfvc-extension";

var teamExtension: TeamExtension;
var tfvcExtension: TfvcExtension;

export function activate(context: ExtensionContext) {
    teamExtension = new TeamExtension();
    tfvcExtension = new TfvcExtension();

    context.subscriptions.push(commands.registerCommand(CommandNames.GetPullRequests, () => teamExtension.GetMyPullRequests()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Login, () => teamExtension.Login()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Logout, () => teamExtension.Logout()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBlamePage, () => teamExtension.OpenBlamePage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBuildSummaryPage, () => teamExtension.OpenBuildSummaryPage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenFileHistory, () => teamExtension.OpenFileHistory()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewBug, () => teamExtension.OpenNewBug()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewPullRequest, () => teamExtension.OpenNewPullRequest()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewTask, () => teamExtension.OpenNewTask()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewWorkItem, () => teamExtension.OpenNewWorkItem()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenPullRequestsPage, () => teamExtension.OpenPullRequestsPage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenTeamSite, () => teamExtension.OpenTeamProjectWebSite()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItems, () => teamExtension.ViewMyWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewPinnedQueryWorkItems, () => teamExtension.ViewPinnedQueryWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItemQueries, () => teamExtension.ViewWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.SendFeedback, () => teamExtension.SendFeedback()));
    context.subscriptions.push(commands.registerCommand(CommandNames.RefreshPollingStatus, () => teamExtension.RefreshPollingStatus()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Reinitialize, () => teamExtension.Reinitialize()));

    // TFVC Commands
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Status, () => tfvcExtension.TfvcStatus()));
}
