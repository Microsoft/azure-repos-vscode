/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert, expect } from "chai";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { QueryHierarchyItem, WorkItem, WorkItemType } from "vso-node-api/interfaces/WorkItemTrackingInterfaces";

import { WitQueries } from "../../src/helpers/constants";
import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { SimpleWorkItem, WorkItemTrackingService }  from "../../src/services/workitemtracking";

describe("WorkItemTrackingService-Integration", function() {
    this.timeout(TestSettings.SuiteTimeout());

    var credentialManager: CredentialManager = new CredentialManager();
    var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());

    before(function() {
        return credentialManager.StoreCredentials(TestSettings.Account(), TestSettings.AccountUser(), TestSettings.Password());
    });
    beforeEach(function() {
        return credentialManager.GetCredentialHandler(ctx, undefined);
    });
    // afterEach(function() { });
    after(function() {
        return credentialManager.RemoveCredentials(TestSettings.Account());
    });

    //Even though CreateWorkItem isn't exposed in the extension, run it so we can get to 200, then 20,000
    //work items in the team project.  At that point, we can test other scenarios around WIT.
    it("should verify WorkItemTrackingService.CreateWorkItem", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let itemType : string = "Bug";
            let today: Date = new Date();
            let title: string = "Work item created by integration test (" + today.toLocaleString() + ")";
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let item: WorkItem = await svc.CreateWorkItem(ctx, itemType, title);
            assert.isNotNull(item, "item was null when it shouldn't have been");
            done();
        } catch (err) {
            //This will occur if the PAT used by the integration tests don't have RW on WIT
            //assert.contains(err, "401");
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItems", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let items: SimpleWorkItem[] = await svc.GetWorkItems(TestSettings.TeamProject(), WitQueries.MyWorkItems);
            assert.isNotNull(items, "items was null when it shouldn't have been");
            //console.log(items);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetQueryResultCount", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let query: QueryHierarchyItem = await svc.GetWorkItemQuery(TestSettings.TeamProject(), TestSettings.WorkItemQueryPath());
            assert.isNotNull(query);
            //console.log(query);
            expect(query.id).to.equal(TestSettings.WorkItemQueryId());
            let count: number = await svc.GetQueryResultCount(TestSettings.TeamProject(), query.wiql);
            //console.log("count = " + count);
            expect(count).to.be.at.least(2);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItemHierarchyItems", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let items: QueryHierarchyItem[] = await svc.GetWorkItemHierarchyItems(TestSettings.TeamProject());
            assert.isNotNull(items);
            //console.log(items.length);
            expect(items.length).to.equal(2);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItemQuery", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let query: QueryHierarchyItem = await svc.GetWorkItemQuery(TestSettings.TeamProject(), TestSettings.WorkItemQueryPath());
            assert.isNotNull(query);
            //console.log(query);
            expect(query.id).to.equal(TestSettings.WorkItemQueryId());
            let items: SimpleWorkItem[] = await svc.GetWorkItems(TestSettings.TeamProject(), query.wiql);
            assert.isTrue(items.length > 0);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItemTypes", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let items: WorkItemType[] = await svc.GetWorkItemTypes(TestSettings.TeamProject());
            assert.isNotNull(items);
            //console.log(items.length);
            expect(items.length).to.equal(7);
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItemById", async function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        try {
            let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
            let item: SimpleWorkItem = await svc.GetWorkItemById(TestSettings.TeamProject(), TestSettings.WorkItemId().toString());
            assert.isNotNull(item);
            //console.log(items.length);
            expect(item.id).to.equal(TestSettings.WorkItemId().toString());
            done();
        } catch (err) {
            done(err);
        }
    });

    it("should verify WorkItemTrackingService.GetWorkItemQuery with a Link query", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemQuery(TestSettings.TeamProject(), TestSettings.WorkItemLinkQueryPath()).then(
            function (query) {
                assert.isNotNull(query);
                //console.log(query);
                svc.GetWorkItems(TestSettings.TeamProject(), query.wiql).then((items) => {
                    assert.isTrue(items.length > 0, "Expected at least 1 result but didn't get any.");
                    //assert.isTrue(items.length === 200, "Expected the maximum of 200 work items but didn't get that amount.");  // current maximum work items returned
                    done();
                }).catch((err) => {
                    done(err);
                });
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItemQuery with maximum 200 results", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemQuery(TestSettings.TeamProject(), TestSettings.WorkItemTwoHundredTasksQueryPath()).then(
            function (query) {
                assert.isNotNull(query);
                //console.log(query);
                svc.GetWorkItems(TestSettings.TeamProject(), query.wiql).then((items) => {
                    assert.isTrue(items.length > 0, "Expected at least 1 result but didn't get any.");
                    // current maximum work items returned
                    assert.isTrue(items.length === 200, "Expected the maximum of 200 work items but didn't get that amount.");
                    done();
                }).catch((err) => {
                    done(err);
                });
            },
            function (err) {
                done(err);
            }
        );
    });

});
