/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { commands, Disposable, ExtensionContext } from "vscode";
import { CommandNames, TfvcCommandNames } from "./helpers/constants";
import { ExtensionManager } from "./extensionmanager";
import { TfvcSCMProvider } from "./tfvc/tfvcscmprovider";

let _extensionManager: ExtensionManager;
let _scmProvider: TfvcSCMProvider;

export async function activate(context: ExtensionContext) {
    // Construct the extension manager that handles Team and Tfvc commands
    _extensionManager = new ExtensionManager();
    await _extensionManager.Initialize();

    // Initialize the SCM provider for TFVC
    const disposables: Disposable[] = [];
    context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));
    _scmProvider = new TfvcSCMProvider(_extensionManager);
    _scmProvider.Initialize(disposables)
        .catch(err => console.error(err));

    context.subscriptions.push(commands.registerCommand(CommandNames.GetPullRequests, () => _extensionManager.Team.GetMyPullRequests()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Signin, () => _extensionManager.Team.Signin()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Signout, () => _extensionManager.Team.Signout()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBlamePage, () => _extensionManager.Team.OpenBlamePage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBuildSummaryPage, () => _extensionManager.Team.OpenBuildSummaryPage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenFileHistory, () => _extensionManager.Team.OpenFileHistory()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewBug, () => _extensionManager.Team.OpenNewBug()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewPullRequest, () => _extensionManager.Team.OpenNewPullRequest()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewTask, () => _extensionManager.Team.OpenNewTask()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewWorkItem, () => _extensionManager.Team.OpenNewWorkItem()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenPullRequestsPage, () => _extensionManager.Team.OpenPullRequestsPage()));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenTeamSite, () => _extensionManager.Team.OpenTeamProjectWebSite()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItems, () => _extensionManager.Team.ViewMyWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewPinnedQueryWorkItems, () => _extensionManager.Team.ViewPinnedQueryWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItemQueries, () => _extensionManager.Team.ViewWorkItems()));
    context.subscriptions.push(commands.registerCommand(CommandNames.SendFeedback, () => _extensionManager.Team.SendFeedback()));
    context.subscriptions.push(commands.registerCommand(CommandNames.RefreshPollingStatus, () => _extensionManager.Team.RefreshPollingStatus()));
    context.subscriptions.push(commands.registerCommand(CommandNames.Reinitialize, () => _extensionManager.Reinitialize()));

    // TFVC Commands
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Status, () => _extensionManager.Tfvc.TfvcStatus()));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Undo, () => _extensionManager.Tfvc.TfvcUndo()));
}
