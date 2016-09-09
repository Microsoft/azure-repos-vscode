/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Mocks } from "../helpers-integration/mocks";
import { TestSettings } from "../helpers-integration/testsettings";

import { WitQueries } from "../../src/helpers/constants";
import { CredentialManager } from "../../src/helpers/credentialmanager";
import { TeamServerContext } from "../../src/contexts/servercontext";
import { WorkItemTrackingService }  from "../../src/services/workitemtracking";

var chai = require("chai");
/* tslint:disable:no-unused-variable */
var expect = chai.expect;
/* tslint:enable:no-unused-variable */
var assert = chai.assert;
chai.should();

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
    it("should verify WorkItemTrackingService.CreateWorkItem", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let itemType : string = "Bug";
        let today: Date = new Date();
        let title: string = "Work item created by integration test (" + today.toLocaleString() + ")";
        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.CreateWorkItem(ctx, itemType, title).then(
            function (item) {
                assert.isNotNull(item, "item was null when it shouldn't have been");
                done();
            },
            function (err) {
                //This will occur if the PAT used by the integration tests don't have RW on WIT
                //assert.contains(err, "401");
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItems", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItems(TestSettings.TeamProject(), WitQueries.MyWorkItems).then(
            function (items) {
                assert.isNotNull(items, "items was null when it shouldn't have been");
                //console.log(items);
                done();
            },
            function (err) {
                //assert.contains(err, "401");
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetQueryResultCount", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetQueryResultCount(TestSettings.TeamProject(), WitQueries.MyWorkItems).then(
            function (count) {
                //console.log("count = " + count);
                expect(count).to.equal(0);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItemHierarchyItems", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemHierarchyItems(TestSettings.TeamProject()).then(
            function (items) {
                assert.isNotNull(items);
                //console.log(items.length);
                expect(items.length).to.equal(2);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItemQuery", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemQuery(TestSettings.TeamProject(), TestSettings.WorkItemQueryPath()).then(
            function (query) {
                assert.isNotNull(query);
                //console.log(query);
                expect(query.id).to.equal(TestSettings.WorkItemQueryId());
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItemTypes", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemTypes(TestSettings.TeamProject()).then(
            function (items) {
                assert.isNotNull(items);
                //console.log(items.length);
                expect(items.length).to.equal(7);
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

    it("should verify WorkItemTrackingService.GetWorkItemById", function(done) {
        this.timeout(TestSettings.TestTimeout()); //http://mochajs.org/#timeouts

        var ctx: TeamServerContext = Mocks.TeamServerContext(TestSettings.RemoteRepositoryUrl());
        ctx.CredentialHandler = CredentialManager.GetCredentialHandler();
        ctx.RepoInfo = Mocks.RepositoryInfo();
        ctx.UserInfo = undefined;

        let svc: WorkItemTrackingService = new WorkItemTrackingService(ctx);
        svc.GetWorkItemById(TestSettings.TeamProject(), TestSettings.WorkItemId().toString()).then(
            function (item) {
                assert.isNotNull(item);
                //console.log(items.length);
                expect(item.id).to.equal(TestSettings.WorkItemId().toString());
                done();
            },
            function (err) {
                done(err);
            }
        );
    });

});
