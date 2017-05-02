/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { WorkItemFields, WorkItemTrackingService } from "../../src/services/workitemtracking";

describe("WorkItemTrackingService", function() {

    beforeEach(function() {
        //
    });

    it("should verify GetEditWorkItemUrl", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";
        const id: string = "42";

        assert.equal(WorkItemTrackingService.GetEditWorkItemUrl(url, id), url + "/_workitems" + "/edit/" + id);
    });

    it("should verify GetNewWorkItemUrl with only url and issueType", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";
        const issueType: string = "Bug";

        assert.equal(WorkItemTrackingService.GetNewWorkItemUrl(url, issueType), url + "/_workitems" + "/create/" + issueType);
    });

    it("should verify GetNewWorkItemUrl with url, issueType and title", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";
        const issueType: string = "Bug";
        const title: string = "Fix this bug!";

        assert.equal(WorkItemTrackingService.GetNewWorkItemUrl(url, issueType, title), url + "/_workitems" + "/create/" + issueType + "?[" + WorkItemFields.Title + "]=" + title);
    });

    it("should verify GetNewWorkItemUrl with url, issueType, title and assignedTo", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";
        const issueType: string = "Bug";
        const title: string = "Fix this bug!";
        const assignedTo: string = "raisap@outlook.com";

        assert.equal(WorkItemTrackingService.GetNewWorkItemUrl(url, issueType, title, assignedTo), url + "/_workitems" + "/create/" + issueType + "?[" + WorkItemFields.Title + "]=" + title + "&" + "[" + WorkItemFields.AssignedTo + "]=" + assignedTo);
    });

    it("should verify GetMyQueryResultsUrl with url and queryName", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";
        const queryName: string = "My Favorite Query";

        assert.equal(WorkItemTrackingService.GetMyQueryResultsUrl(url, "My Queries", queryName), url + "/_workitems" + "?path=" + encodeURIComponent("My Queries/") + encodeURIComponent(queryName) + "&_a=query");
    });

    it("should verify GetWorkItemsBaseUrl with url", function() {
        const url: string = "https://account.visualstudio.com/DefaultCollection/project";

        assert.equal(WorkItemTrackingService.GetWorkItemsBaseUrl(url), url + "/_workitems");
    });
});
