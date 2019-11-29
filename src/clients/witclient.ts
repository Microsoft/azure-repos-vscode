/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { StatusBarItem, window } from "vscode";
import { QueryHierarchyItem, WorkItemType } from "vso-node-api/interfaces/WorkItemTrackingInterfaces";
import { Logger } from "../helpers/logger";
import { SimpleWorkItem, WorkItemTrackingService } from "../services/workitemtracking";
import { Telemetry } from "../services/telemetry";
import { TeamServerContext} from "../contexts/servercontext";
import { BaseQuickPickItem, VsCodeUtils, WorkItemQueryQuickPickItem } from "../helpers/vscodeutils";
import { TelemetryEvents, WitQueries, WitTypes } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { IPinnedQuery } from "../helpers/settings";
import { BaseClient } from "./baseclient";

export class WitClient extends BaseClient {
    private _pinnedQuery: IPinnedQuery;
    private _myQueriesFolder: string;

    constructor(context: TeamServerContext, pinnedQuery: IPinnedQuery, statusBarItem: StatusBarItem) {
        super(context, statusBarItem);
        this._pinnedQuery = pinnedQuery;
    }

    //Opens a browser to a new work item given the item type, title and assigned to
    public CreateNewItem(itemType: string, taskTitle: string): void {
        this.logTelemetryForWorkItem(itemType);
        Logger.LogInfo("Work item type is " + itemType);
        const newItemUrl: string = WorkItemTrackingService.GetNewWorkItemUrl(this._serverContext.RepoInfo.TeamProjectUrl, itemType, taskTitle, this.getUserName(this._serverContext));
        Logger.LogInfo("New Work Item Url: " + newItemUrl);
        Utils.OpenUrl(newItemUrl);
    }

    //Creates a new work item based on a single line of selected text
    public async CreateNewWorkItem(taskTitle: string): Promise<void> {
        try {
            Telemetry.SendEvent(TelemetryEvents.OpenNewWorkItem);
            const selectedType: BaseQuickPickItem = await window.showQuickPick(this.getWorkItemTypes(), { matchOnDescription: true, placeHolder: Strings.ChooseWorkItemType });
            if (selectedType) {
                Telemetry.SendEvent(TelemetryEvents.OpenNewWorkItem);

                Logger.LogInfo("Selected work item type is " + selectedType.label);
                const newItemUrl: string = WorkItemTrackingService.GetNewWorkItemUrl(this._serverContext.RepoInfo.TeamProjectUrl, selectedType.label, taskTitle, this.getUserName(this._serverContext));
                Logger.LogInfo("New Work Item Url: " + newItemUrl);
                Utils.OpenUrl(newItemUrl);
            }
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error creating new work item");
        }
    }

    //Navigates to a work item chosen from the results of a user-selected "My Queries" work item query
    //This method first displays the queries under "My Queries" and, when one is chosen, displays the associated work items.
    //If a work item is chosen, it is opened in the web browser.
    public async ShowMyWorkItemQueries(): Promise<void> {
        try {
            Telemetry.SendEvent(TelemetryEvents.ShowMyWorkItemQueries);
            const query: WorkItemQueryQuickPickItem = await window.showQuickPick(this.getMyWorkItemQueries(), { matchOnDescription: false, placeHolder: Strings.ChooseWorkItemQuery });
            if (query) {
                Telemetry.SendEvent(TelemetryEvents.ViewWorkItems);
                Logger.LogInfo("Selected query is " + query.label);
                Logger.LogInfo("Getting work items for query...");

                const workItem: BaseQuickPickItem = await window.showQuickPick(this.getMyWorkItems(this._serverContext.RepoInfo.TeamProject, query.wiql), { matchOnDescription: true, placeHolder: Strings.ChooseWorkItem });
                if (workItem) {
                    let url: string = undefined;
                    if (workItem.id === undefined) {
                        Telemetry.SendEvent(TelemetryEvents.OpenAdditionalQueryResults);
                        url = WorkItemTrackingService.GetMyQueryResultsUrl(this._serverContext.RepoInfo.TeamProjectUrl, this._myQueriesFolder, query.label);
                    } else {
                        Telemetry.SendEvent(TelemetryEvents.ViewWorkItem);
                        url = WorkItemTrackingService.GetEditWorkItemUrl(this._serverContext.RepoInfo.TeamProjectUrl, workItem.id);
                    }
                    Logger.LogInfo("Work Item Url: " + url);
                    Utils.OpenUrl(url);
                }
            }
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error showing work item queries");
        }
    }

    public async ShowPinnedQueryWorkItems(): Promise<void> {
        Telemetry.SendEvent(TelemetryEvents.ViewPinnedQueryWorkItems);

        try {
            const queryText: string = await this.getPinnedQueryText();
            await this.showWorkItems(queryText);
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error showing pinned query work items");
        }
    }

    public async ShowMyWorkItems(): Promise<void> {
        Telemetry.SendEvent(TelemetryEvents.ViewMyWorkItems);

        try {
            await this.showWorkItems(WitQueries.MyWorkItems);
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error showing my work items");
        }
    }

    public async ChooseWorkItems(): Promise<string[]> {
        Logger.LogInfo("Getting work items to choose from...");
        try {
            const query: string = await this.getPinnedQueryText(); //gets either MyWorkItems, queryText or wiql of queryPath of PinnedQuery
            // TODO: There isn't a way to do a multi select pick list right now, but when there is we should change this to use it.
            const workItem: BaseQuickPickItem = await window.showQuickPick(this.getMyWorkItems(this._serverContext.RepoInfo.TeamProject, query), { matchOnDescription: true, placeHolder: Strings.ChooseWorkItem });
            if (workItem) {
                return ["#" + workItem.id + " - " + workItem.description];
            } else {
                return [];
            }
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error showing my work items in order to choose (associate)");
            return [];
        }
    }

    private async showWorkItems(wiql: string): Promise<void> {
        Logger.LogInfo("Getting work items...");
        const workItem: BaseQuickPickItem = await window.showQuickPick(this.getMyWorkItems(this._serverContext.RepoInfo.TeamProject, wiql), { matchOnDescription: true, placeHolder: Strings.ChooseWorkItem });
        if (workItem) {
            let url: string = undefined;
            if (workItem.id === undefined) {
                Telemetry.SendEvent(TelemetryEvents.OpenAdditionalQueryResults);
                url = WorkItemTrackingService.GetWorkItemsBaseUrl(this._serverContext.RepoInfo.TeamProjectUrl);
            } else {
                Telemetry.SendEvent(TelemetryEvents.ViewWorkItem);
                url = WorkItemTrackingService.GetEditWorkItemUrl(this._serverContext.RepoInfo.TeamProjectUrl, workItem.id);
            }
            Logger.LogInfo("Work Item Url: " + url);
            Utils.OpenUrl(url);
        }
    }

    public async GetPinnedQueryResultCount(): Promise<number> {
        try {
            Logger.LogInfo("Running pinned work item query to get count (" + this._serverContext.RepoInfo.TeamProject + ")...");
            const queryText: string = await this.getPinnedQueryText();

            const svc: WorkItemTrackingService = new WorkItemTrackingService(this._serverContext);
            return svc.GetQueryResultCount(this._serverContext.RepoInfo.TeamProject, queryText);
        } catch (err) {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), false, "Error getting pinned query result count");
        }
    }

    private async getPinnedQueryText(): Promise<string> {
        const promise: Promise<string> = new Promise<string>(async (resolve, reject) => {
            try {
                if (this._pinnedQuery.queryText && this._pinnedQuery.queryText.length > 0) {
                    resolve(this._pinnedQuery.queryText);
                } else if (this._pinnedQuery.queryPath && this._pinnedQuery.queryPath.length > 0) {
                    Logger.LogInfo("Getting my work item query (" + this._serverContext.RepoInfo.TeamProject + ")...");
                    Logger.LogInfo("QueryPath: " + this._pinnedQuery.queryPath);
                    const svc: WorkItemTrackingService = new WorkItemTrackingService(this._serverContext);

                    const queryItem: QueryHierarchyItem = await svc.GetWorkItemQuery(this._serverContext.RepoInfo.TeamProject, this._pinnedQuery.queryPath);
                    resolve(queryItem.wiql);
                }
            } catch (err) {
                reject(err);
            }
        });
        return promise;
    }

    private async getMyWorkItemQueries(): Promise<WorkItemQueryQuickPickItem[]> {
        const queries: WorkItemQueryQuickPickItem[] = [];
        const svc: WorkItemTrackingService = new WorkItemTrackingService(this._serverContext);
        Logger.LogInfo("Getting my work item queries (" + this._serverContext.RepoInfo.TeamProject + ")...");
        const hierarchyItems: QueryHierarchyItem[] = await svc.GetWorkItemHierarchyItems(this._serverContext.RepoInfo.TeamProject);
        Logger.LogInfo("Retrieved " + hierarchyItems.length + " hierarchyItems");
        hierarchyItems.forEach((folder) => {
            if (folder && folder.isFolder === true && folder.isPublic === false) {
                // Because "My Queries" is localized and there is no API to get the name of the localized
                // folder, we need to save off the localized name when constructing URLs.
                this._myQueriesFolder = folder.name;
                if (folder.hasChildren === true) {
                    //Gets all of the queries under "My Queries" and gets their name and wiql
                    for (let index: number = 0; index < folder.children.length; index++) {
                        queries.push({
                            id: folder.children[index].id,
                            label: folder.children[index].name,
                            description: "",
                            wiql: folder.children[index].wiql
                        });
                    }
                }
            }
        });
        return queries;
    }

    private async getMyWorkItems(teamProject: string, wiql: string): Promise<BaseQuickPickItem[]> {
        const workItems: BaseQuickPickItem[] = [];
        const svc: WorkItemTrackingService = new WorkItemTrackingService(this._serverContext);
        Logger.LogInfo("Getting my work items (" + this._serverContext.RepoInfo.TeamProject + ")...");
        const simpleWorkItems: SimpleWorkItem[] = await svc.GetWorkItems(teamProject, wiql);
        Logger.LogInfo("Retrieved " + simpleWorkItems.length + " work items");
        simpleWorkItems.forEach((wi) => {
            workItems.push({ label: wi.label, description: wi.description, id: wi.id});
        });
        if (simpleWorkItems.length === WorkItemTrackingService.MaxResults) {
            workItems.push({
                id: undefined,
                label: Strings.BrowseAdditionalWorkItems,
                description: Strings.BrowseAdditionalWorkItemsDescription
            });
        }
        return workItems;
    }

    private getUserName(context: TeamServerContext): string {
        let userName: string = undefined;
        Logger.LogDebug("UserCustomDisplayName: " + context.UserInfo.CustomDisplayName);
        Logger.LogDebug("UserProviderDisplayName: " + context.UserInfo.ProviderDisplayName);
        if (context.UserInfo.CustomDisplayName !== undefined) {
            userName = context.UserInfo.CustomDisplayName;
        } else {
            userName = context.UserInfo.ProviderDisplayName;
        }
        Logger.LogDebug("User is " + userName);
        return userName;
    }

    private async getWorkItemTypes(): Promise<BaseQuickPickItem[]> {
        const svc: WorkItemTrackingService = new WorkItemTrackingService(this._serverContext);
        const types: WorkItemType[] = await svc.GetWorkItemTypes(this._serverContext.RepoInfo.TeamProject);
        const workItemTypes: BaseQuickPickItem[] = [];
        types.forEach((type) => {
            workItemTypes.push({ label: type.name, description: type.description, id: undefined });
        });
        workItemTypes.sort((t1, t2) => {
            return (t1.label.localeCompare(t2.label));
        });
        return workItemTypes;
    }

    private handleWitError(err: Error, offlineText: string, polling: boolean, infoMessage?: string): void {
        if (err.message.includes("Failed to find api location for area: wit id:")) {
            Telemetry.SendEvent(TelemetryEvents.UnsupportedWitServerVersion);
            const msg: string = Strings.UnsupportedWitServerVersion;
            Logger.LogError(msg);
            if (this._statusBarItem !== undefined) {
                this._statusBarItem.text = `$(bug) $(x)`;
                this._statusBarItem.tooltip = msg;
                this._statusBarItem.command = undefined; //Clear the existing command
            }
            if (!polling) {
                VsCodeUtils.ShowErrorMessage(msg);
            }
        } else {
            this.handleError(err, offlineText, polling, infoMessage);
        }
    }

    private logTelemetryForWorkItem(wit: string): void {
        switch (wit) {
            case WitTypes.Bug:
                Telemetry.SendEvent(TelemetryEvents.OpenNewBug);
                break;
            case WitTypes.Task:
                Telemetry.SendEvent(TelemetryEvents.OpenNewTask);
                break;
            default:
                break;
        }
    }

    public PollPinnedQuery(): void {
        this.GetPinnedQueryResultCount().then((numberOfItems) => {
            this._statusBarItem.tooltip = Strings.ViewYourPinnedQuery;
            this._statusBarItem.text = WitClient.GetPinnedQueryStatusText(numberOfItems.toString());
        }).catch((err) => {
            this.handleWitError(err, WitClient.GetOfflinePinnedQueryStatusText(), true, "Failed to get pinned query count during polling");
        });
    }

   public static GetOfflinePinnedQueryStatusText() : string {
        return `$(bug) ???`;
    }

    public static GetPinnedQueryStatusText(total?: string) : string {
        if (!total) {
            return `$(bug) $(dash)`;
        }
        return `$(bug) ${total.toString()}`;
    }
}
