/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamContext } from "vso-node-api/interfaces/CoreInterfaces";
import { WebApi } from "vso-node-api/WebApi";
import { IWorkItemTrackingApi } from "vso-node-api/WorkItemTrackingApi";
import { QueryExpand, QueryHierarchyItem, QueryResultType, Wiql, WorkItem,
         WorkItemExpand, WorkItemQueryResult, WorkItemType, WorkItemTypeCategory,
         WorkItemTypeReference } from "vso-node-api/interfaces/WorkItemTrackingInterfaces";
import { TeamServerContext } from "../contexts/servercontext";
import { CredentialManager } from "../helpers/credentialmanager";

export class WorkItemTrackingService {
    private _witApi: IWorkItemTrackingApi;

    constructor(context: TeamServerContext) {
        this._witApi = new WebApi(context.RepoInfo.CollectionUrl, CredentialManager.GetCredentialHandler()).getWorkItemTrackingApi();
    }

    //Returns a Promise containing the WorkItem that was created
    public async CreateWorkItem(context: TeamServerContext, itemType: string, taskTitle: string): Promise<WorkItem> {
        let newWorkItem = [{ op: "add", path: "/fields/" + WorkItemFields.Title, value: taskTitle }];
        /* tslint:disable:no-null-keyword */
        return await this._witApi.createWorkItem(null, newWorkItem, context.RepoInfo.TeamProject, itemType, false, false);
        /* tslint:enable:no-null-keyword */
    }

    //Returns a Promise containing an array of SimpleWorkItems based on the passed in wiql
    public async GetWorkItems(teamProject: string, wiql: string): Promise<SimpleWorkItem[]> {
        return await this.execWorkItemQuery(teamProject, { query: wiql});
    }

    //Returns a Promise containing an array of QueryHierarchyItems (either folders or work item queries)
    public async GetWorkItemHierarchyItems(teamProject: string): Promise<QueryHierarchyItem[]> {
        return await this._witApi.getQueries(teamProject, QueryExpand.Wiql, 1, false);
    }

    //Returns a Promise containing a specific query item
    public async GetWorkItemQuery(teamProject: string, queryPath: string): Promise<QueryHierarchyItem> {
        return await this._witApi.getQuery(teamProject, queryPath, QueryExpand.Wiql, 1, false);
    }

    //Returns a Promise containing the array of work item types available for the team project
    public async GetWorkItemTypes(teamProject: string): Promise<WorkItemType[]> {
        let types: WorkItemType[] = await this._witApi.getWorkItemTypes(teamProject);
        let workItemTypes: WorkItemType[] = [];
        let hiddenTypes: WorkItemTypeReference[] = [];
        types.forEach(type => {
            workItemTypes.push(type);
        });
        let category: WorkItemTypeCategory = await this._witApi.getWorkItemTypeCategory(teamProject, "Microsoft.HiddenCategory");
        category.workItemTypes.forEach(hiddenType => {
            hiddenTypes.push(hiddenType);
        });
        let filteredTypes: WorkItemType[] = workItemTypes.filter(function (el) {
            for (let index = 0; index < hiddenTypes.length; index++) {
                if (el.name === hiddenTypes[index].name) {
                    return false;
                }
            }
            return true;
        });
        return filteredTypes;
    }

    //Returns a Promise containing a SimpleWorkItem representing the work item specified by id
    public async GetWorkItemById(id: string): Promise<SimpleWorkItem> {
        let workItem: WorkItem = await this._witApi.getWorkItem(parseInt(id), [WorkItemFields.Id, WorkItemFields.Title]);
        let result: SimpleWorkItem = new SimpleWorkItem();
        result.id = workItem.id.toString();
        result.label = workItem.fields[WorkItemFields.Title];
        return result;
    }

    //Returns a Promise containing an array of SimpleWorkItems that are the results of the passed in wiql
    private async execWorkItemQuery(teamProject: string, wiql: Wiql): Promise<SimpleWorkItem[]> {
        //Querying WIT requires a TeamContext
        let teamContext: TeamContext = {
            projectId: undefined,
            project: teamProject,
            teamId: undefined,
            team: undefined
        };

        // Execute the wiql and get the work item ids
        let queryResult: WorkItemQueryResult = await this._witApi.queryByWiql(wiql, teamContext);
        let results: SimpleWorkItem[] = [];
        let workItemIds: number[] = [];
        if (queryResult.queryResultType === QueryResultType.WorkItem) {
            workItemIds = queryResult.workItems.map(function(w) {return w.id; });
        } else if (queryResult.queryResultType === QueryResultType.WorkItemLink) {
            workItemIds = queryResult.workItemRelations.map(function(w) {return w.target.id; });
        }
        if (workItemIds.length === 0) {
            return results;
        }
        //Only request the maximum number of work items the API documents that we should
        if (workItemIds.length >= WorkItemTrackingService.MaxResults) {
            workItemIds = workItemIds.slice(0, WorkItemTrackingService.MaxResults);
        }

        /* tslint:disable:no-null-keyword */
        let workItems: WorkItem[] = await this._witApi.getWorkItems(workItemIds,
                                                                    [WorkItemFields.Id, WorkItemFields.Title, WorkItemFields.WorkItemType],
                                                                    null,
                                                                    WorkItemExpand.None);
        /* tslint:enable:no-null-keyword */

        //Keep original sort order that wiql specified
        for (let index = 0; index < workItemIds.length; index++) {
            let item: WorkItem = workItems.find(i => i.id === workItemIds[index]);
            results.push({
                id: item.fields[WorkItemFields.Id],
                label: item.fields[WorkItemFields.Id] + "  [" + item.fields[WorkItemFields.WorkItemType] + "]",
                description: item.fields[WorkItemFields.Title]
            });
        }

        return results;
    }

     public async GetQueryResultCount(teamProject: string, wiql: string): Promise<number> {
        //Querying WIT requires a TeamContext
        let teamContext: TeamContext = {
            projectId: undefined,
            project: teamProject,
            teamId: undefined,
            team: undefined
        };

        // Execute the wiql and get count of results
        let queryResult: WorkItemQueryResult = await this._witApi.queryByWiql({ query: wiql}, teamContext);
        //If a Promise is returned here, then() will return that Promise
        //If not, it will wrap the value within a Promise and return that
        return queryResult.workItems.length;
    }

    //Construct the url to the individual work item edit page
    public static GetEditWorkItemUrl(teamProjectUrl: string, workItemId: string) : string {
        return this.GetWorkItemsBaseUrl(teamProjectUrl) + "/edit/" + workItemId;
    }

    //Construct the url to the creation page for new work item type
    public static GetNewWorkItemUrl(teamProjectUrl: string, issueType: string, title?: string, assignedTo?: string) : string {
        //This form will redirect to the form below so let's use this one
        let url: string = this.GetWorkItemsBaseUrl(teamProjectUrl) + "/create/" + issueType;
        let separator: string = "?";
        if (title !== undefined) {
            //title may need to be encoded (issues if first character is '#', for instance)
            url += separator + "[" + WorkItemFields.Title + "]=" + title;
            separator = "&";
        }
        if (assignedTo !== undefined) {
            url += separator + "[" + WorkItemFields.AssignedTo + "]=" + assignedTo;
            separator = "&";
        }
        return url;
    }

    //Construct the url to the particular query results page
    public static GetMyQueryResultsUrl(teamProjectUrl: string, folderName: string, queryName: string) : string {
        return this.GetWorkItemsBaseUrl(teamProjectUrl) + "?path=" + encodeURIComponent(folderName + "/" + queryName) + "&_a=query";
    }

    //Returns the base url for work items
    public static GetWorkItemsBaseUrl(teamProjectUrl: string) {
        return teamProjectUrl + "/_workitems";
    }

/* tslint:disable:variable-name */
    public static MaxResults: number = 200;
/* tslint:enable:variable-name */
}

export class SimpleWorkItem {
    label: string;
    description: string;
    id: string;
}

/* tslint:disable:variable-name */
export class WorkItemFields {
    static AssignedTo: string = "System.AssignedTo";
    static Id: string = "System.Id";
    static Title: string = "System.Title";
    static WorkItemType: string = "System.WorkItemType";
}
/* tslint:enable:variable-name */
