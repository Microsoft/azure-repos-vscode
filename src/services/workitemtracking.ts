/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamContext } from "vso-node-api/interfaces/CoreInterfaces";
import { WebApi } from "vso-node-api/WebApi";
import { IQWorkItemTrackingApi } from "vso-node-api/WorkItemTrackingApi";
import { QueryExpand, QueryHierarchyItem, QueryResultType, Wiql, WorkItem,
         WorkItemExpand, WorkItemType, WorkItemTypeReference } from "vso-node-api/interfaces/WorkItemTrackingInterfaces";
import { TeamServerContext } from "../contexts/servercontext";
import { CredentialManager } from "../helpers/credentialmanager";

import Q = require("q");

export class WorkItemTrackingService {
    private _witApi: IQWorkItemTrackingApi;

    constructor(context: TeamServerContext) {
        this._witApi = new WebApi(context.RepoInfo.CollectionUrl, CredentialManager.GetCredentialHandler()).getQWorkItemTrackingApi();
    }

    //Returns a Q.Promise containing the WorkItem that was created
    public CreateWorkItem(context: TeamServerContext, itemType: string, taskTitle: string): Q.Promise<WorkItem> {
        let newWorkItem = [{ op: "add", path: "/fields/" + WorkItemFields.Title, value: taskTitle }];

        return this._witApi.createWorkItem(null, newWorkItem, context.RepoInfo.TeamProject, itemType, false, false);
    }

    //Returns a Q.Promise containing an array of SimpleWorkItems based on the passed in wiql
    public GetWorkItems(teamProject: string, wiql: string): Q.Promise<Array<SimpleWorkItem>> {
        return this.execWorkItemQuery(teamProject, { query: wiql});
    }

    //Returns a Q.Promise containing an array of QueryHierarchyItems (either folders or work item queries)
    public GetWorkItemHierarchyItems(teamProject: string): Q.Promise<Array<QueryHierarchyItem>> {
        let promiseToReturn: Q.Promise<Array<QueryHierarchyItem>>;
        let deferred = Q.defer<Array<QueryHierarchyItem>>();
        promiseToReturn = deferred.promise;

        this._witApi.getQueries(teamProject, QueryExpand.Wiql, 1, false).then((queryHierarchy) => {
            deferred.resolve(queryHierarchy);
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

    //Returns a Q.Promise containing a specific query item
    public GetWorkItemQuery(teamProject: string, queryPath: string): Q.Promise<QueryHierarchyItem> {
        let promiseToReturn: Q.Promise<QueryHierarchyItem>;
        let deferred = Q.defer<QueryHierarchyItem>();
        promiseToReturn = deferred.promise;

        this._witApi.getQuery(teamProject, queryPath, QueryExpand.Wiql, 1, false).then((queryHierarchy) => {
            deferred.resolve(queryHierarchy);
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

    //Returns a Q.Promise containing the array of work item types available for the team project
    public GetWorkItemTypes(teamProject: string): Q.Promise<Array<WorkItemType>> {
        let promiseToReturn: Q.Promise<Array<WorkItemType>>;
        let deferred = Q.defer<Array<WorkItemType>>();
        promiseToReturn = deferred.promise;

        let workItemTypes: Array<WorkItemType> = [];
        let hiddenTypes: Array<WorkItemTypeReference> = [];
        this._witApi.getWorkItemTypes(teamProject).then((types) => {
            types.forEach(type => {
                workItemTypes.push(type);
            });
            this._witApi.getWorkItemTypeCategory(teamProject, "Microsoft.HiddenCategory").then((category) => {
                category.workItemTypes.forEach(hiddenType => {
                    hiddenTypes.push(hiddenType);
                });
                let types: Array<WorkItemType> = workItemTypes.filter(function (el) {
                    for (let index = 0; index < hiddenTypes.length; index++) {
                        if (el.name === hiddenTypes[index].name) {
                            return false;
                        }
                    }
                    return true;
                });
                deferred.resolve(types);
            }).fail((reason) => {
                deferred.reject(reason);
            });
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

    //Returns a Q.Promise containing a SimpleWorkItem representing the work item specifid by teamProject and id
    public GetWorkItemById(teamProject: string, id: string): Q.Promise<SimpleWorkItem> {
        let promiseToReturn: Q.Promise<SimpleWorkItem>;
        let deferred = Q.defer<SimpleWorkItem>();
        promiseToReturn = deferred.promise;

        this._witApi.getWorkItem(parseInt(id), [WorkItemFields.Id, WorkItemFields.Title]).then((workItem) => {
            let result: SimpleWorkItem = new SimpleWorkItem();
            result.id = workItem.id.toString();
            result.label = workItem.fields[WorkItemFields.Title];
            deferred.resolve(result);
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

    //Returns a Q.Promise containing an array of SimpleWorkItems that are the results of the passed in wiql
    private execWorkItemQuery(teamProject: string, wiql: Wiql): Q.Promise<Array<SimpleWorkItem>> {
        let promiseToReturn: Q.Promise<Array<SimpleWorkItem>>;
        let deferred = Q.defer<Array<SimpleWorkItem>>();
        promiseToReturn = deferred.promise;

        //Querying WIT requires a TeamContext
        let teamContext: TeamContext = {
            projectId: undefined,
            project: teamProject,
            teamId: undefined,
            team: undefined
        };

        // Execute the wiql and get the work item ids
        this._witApi.queryByWiql(wiql, teamContext).then((queryResult) => {
            let results: Array<SimpleWorkItem> = [];
            let workItemIds: Array<number> = [];
            if (queryResult.queryResultType === QueryResultType.WorkItem) {
                workItemIds = queryResult.workItems.map(function(w) {return w.id; });
            } else if (queryResult.queryResultType === QueryResultType.WorkItemLink) {
                workItemIds = queryResult.workItemRelations.map(function(w) {return w.target.id; });
            }
            if (workItemIds.length === 0) {
                deferred.resolve(results);
                return promiseToReturn;
            }
            //Only request the maximum number of work items the API documents that we should
            if (workItemIds.length >= WorkItemTrackingService.MaxResults) {
                workItemIds = workItemIds.slice(0, WorkItemTrackingService.MaxResults);
            }

            this._witApi.getWorkItems(workItemIds,
                                      [WorkItemFields.Id, WorkItemFields.Title, WorkItemFields.WorkItemType],
                                      null,
                                      WorkItemExpand.None)
            .then((workItems) => {
                //Keep original sort order that wiql specified
                for (let index = 0; index < workItemIds.length; index++) {
                    let item: WorkItem = workItems.find(i => i.id === workItemIds[index]);
                    results.push({
                        id: item.fields[WorkItemFields.Id],
                        label: item.fields[WorkItemFields.Id] + "  [" + item.fields[WorkItemFields.WorkItemType] + "]",
                        description: item.fields[WorkItemFields.Title]
                    });
                }

                deferred.resolve(results);
            }).fail((reason) => {
                deferred.reject(reason);
            });
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

     public GetQueryResultCount(teamProject: string, wiql: string): Q.Promise<number> {
        let promiseToReturn: Q.Promise<number>;
        let deferred = Q.defer<number>();
        promiseToReturn = deferred.promise;

        //Querying WIT requires a TeamContext
        let teamContext: TeamContext = {
            projectId: undefined,
            project: teamProject,
            teamId: undefined,
            team: undefined
        };

        // Execute the wiql and get count of results
        this._witApi.queryByWiql({ query: wiql}, teamContext).then((queryResult) => {
            deferred.resolve(queryResult.workItems.length);
            return promiseToReturn;
        }).fail((reason) => {
            deferred.reject(reason);
        });

        return promiseToReturn;
    }

    //Construct the url to the individual work item edit page
    public static GetEditWorkItemUrl(teamProjectUrl: string, workItemId: string) : string {
        return this.GetWorkItemsBaseUrl(teamProjectUrl) + "/edit/" + workItemId;
    }

    //Construct the url to the creation page for new work item type
    public static GetNewWorkItemUrl(teamProjectUrl: string, issueType: string, title?: string, assignedTo?: string) : string {
        //This form will redirect to the form below so let's use this one
        let url:string = this.GetWorkItemsBaseUrl(teamProjectUrl) + "/create/" + issueType;
        let separator: string = "?";
        if (title !== undefined) {
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
