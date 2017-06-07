/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { commands, ExtensionContext } from "vscode";
import { CommandNames, TfvcCommandNames } from "./helpers/constants";
import { ExtensionManager } from "./extensionmanager";
import { AutoResolveType } from "./tfvc/interfaces";

let _extensionManager: ExtensionManager;

export async function activate(context: ExtensionContext) {
    // Construct the extension manager that handles Team and Tfvc commands
    _extensionManager = new ExtensionManager();
    await _extensionManager.Initialize();
    // Register the ext manager for disposal
    context.subscriptions.push(_extensionManager);

    context.subscriptions.push(commands.registerCommand(CommandNames.AssociateWorkItems, () => _extensionManager.RunCommand(() => _extensionManager.Team.AssociateWorkItems())));
    context.subscriptions.push(commands.registerCommand(CommandNames.GetPullRequests, () => _extensionManager.RunCommand(() => _extensionManager.Team.GetMyPullRequests())));
    context.subscriptions.push(commands.registerCommand(CommandNames.Signin, () => _extensionManager.RunCommand(() => _extensionManager.Team.Signin())));
    context.subscriptions.push(commands.registerCommand(CommandNames.Signout, () => _extensionManager.RunCommand(() => _extensionManager.Team.Signout())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBlamePage, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenBlamePage())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenBuildSummaryPage, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenBuildSummaryPage())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenFileHistory, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenFileHistory())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewBug, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenNewBug())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewPullRequest, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenNewPullRequest())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewTask, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenNewTask())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenNewWorkItem, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenNewWorkItem())));
    context.subscriptions.push(commands.registerCommand(CommandNames.OpenTeamSite, () => _extensionManager.RunCommand(() => _extensionManager.Team.OpenTeamProjectWebSite())));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItems, () => _extensionManager.RunCommand(() => _extensionManager.Team.ViewMyWorkItems())));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewPinnedQueryWorkItems, () => _extensionManager.RunCommand(() => _extensionManager.Team.ViewPinnedQueryWorkItems())));
    context.subscriptions.push(commands.registerCommand(CommandNames.ViewWorkItemQueries, () => _extensionManager.RunCommand(() => _extensionManager.Team.ViewWorkItems())));
    context.subscriptions.push(commands.registerCommand(CommandNames.SendFeedback, () => _extensionManager.RunCommand(() => _extensionManager.SendFeedback())));
    context.subscriptions.push(commands.registerCommand(CommandNames.RefreshPollingStatus, () => _extensionManager.RunCommand(() => _extensionManager.Team.RefreshPollingStatus())));
    context.subscriptions.push(commands.registerCommand(CommandNames.Reinitialize, () => _extensionManager.Reinitialize()));

    // TFVC Commands
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Delete, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Delete(args ? args[0] : undefined))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.UndoAll, () => _extensionManager.RunCommand(() => _extensionManager.Tfvc.UndoAll())));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Undo, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Undo(args))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Exclude, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Exclude(args))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Include, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Include(args))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Rename, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Rename(args ? args[0] : undefined))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Open, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Open(args ? args[0] : undefined))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.OpenDiff, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.OpenDiff(args ? args[0] : undefined))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.OpenFile, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.OpenFile(args ? args[0] : undefined))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.ResolveKeepYours, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Resolve(args ? args[0] : undefined, AutoResolveType.KeepYours))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.ResolveTakeTheirs, (...args) => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Resolve(args ? args[0] : undefined, AutoResolveType.TakeTheirs))));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Refresh, () => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Refresh())));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.ShowOutput, () => _extensionManager.RunCommand(() => _extensionManager.Tfvc.ShowOutput())));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Checkin, () => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Checkin())));
    context.subscriptions.push(commands.registerCommand(TfvcCommandNames.Sync, () => _extensionManager.RunCommand(() => _extensionManager.Tfvc.Sync())));
}
