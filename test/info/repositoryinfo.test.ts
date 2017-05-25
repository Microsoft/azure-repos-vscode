/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { RepositoryInfo } from "../../src/info/repositoryinfo";

describe("RepositoryInfo", function() {

    /* Team Server URLs */
    it("should verify host, account and isTeamFoundationServer for valid remoteUrl", function() {
        const url: string = "http://jeyou-dev00000:8080/tfs/DefaultCollection/_git/GitAgile";
        const repoInfo: RepositoryInfo = new RepositoryInfo(url);
        assert.equal(repoInfo.Host, "jeyou-dev00000:8080");  //TODO: Should host on-prem contain the port number?
        assert.equal(repoInfo.Account, "jeyou-dev00000:8080");  //TODO: Should account on-prem contain the port number?
        assert.isUndefined(repoInfo.AccountUrl);  // we only get this when we pass a JSON blob
        assert.isTrue(repoInfo.IsTeamFoundation);
        assert.isTrue(repoInfo.IsTeamFoundationServer);
        assert.isFalse(repoInfo.IsTeamServices);
        assert.equal(repoInfo.RepositoryUrl, url);
        assert.equal(repoInfo.Protocol, "http:");

        // For on-prem currently, these should not be set
        assert.equal(repoInfo.CollectionId, undefined);
        assert.equal(repoInfo.CollectionName, undefined);
        assert.equal(repoInfo.CollectionUrl, undefined);
        assert.equal(repoInfo.RepositoryId, undefined);
        assert.equal(repoInfo.RepositoryName, undefined);
        assert.equal(repoInfo.TeamProject, undefined);
        assert.equal(repoInfo.TeamProjectUrl, undefined);
    });

    it("should verify valid values in repositoryInfo to RepositoryInfo constructor", function() {
        const repositoryInfo: any = {
           "serverUrl": "http://server:8080/tfs",
           "collection": {
              "id": "d543db53-9479-46c1-9d33-2cb9cb76f622",
              "name": "DefaultCollection",
              "url": "http://server:8080/tfs/_apis/projectCollections/d543db53-9479-46c1-9d33-2cb9cb76f622"
           },
           "repository": {
              "id": "23344766-d9c7-4661-856d-b2096753c5e3",
              "name": "repositoryName",
              "url": "http://server:8080/tfs/DefaultCollection/_apis/git/repositories/23344766-d9c7-4661-856d-b2096753c5e3",
              "project": {
                 "id": "ecbf2301-0e62-4b0d-a12d-1992f2ea95a8",
                 "name": "teamproject",
                 "description": "Our team project",
                 "url": "http://server:8080/tfs/DefaultCollection/_apis/projects/8c03f107-42c7-4dea-a3cc-e52972d841a9",
                 "state": 1,
                 "revision": 7
              },
              "remoteUrl": "http://server:8080/tfs/DefaultCollection/teamproject/_git/repositoryName"
           }
        };
        const repoInfo = new RepositoryInfo(repositoryInfo);
        assert.equal(repoInfo.Host, "server:8080");  //TODO: Should host on-prem contain the port number?
        assert.equal(repoInfo.Account, "server:8080");  //TODO: Should account on-prem contain the port number?
        assert.equal(repoInfo.AccountUrl, "http://server:8080/tfs");
        assert.equal(repoInfo.CollectionId, "d543db53-9479-46c1-9d33-2cb9cb76f622");
        assert.equal(repoInfo.CollectionName, "DefaultCollection");
        assert.equal(repoInfo.CollectionUrl, "http://server:8080/tfs/DefaultCollection");
        assert.isFalse(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
        assert.isTrue(repoInfo.IsTeamFoundationServer);
        assert.equal(repoInfo.RepositoryId, "23344766-d9c7-4661-856d-b2096753c5e3");
        assert.equal(repoInfo.RepositoryName, "repositoryName");
        assert.equal(repoInfo.RepositoryUrl, "http://server:8080/tfs/DefaultCollection/teamproject/_git/repositoryName");
        assert.equal(repoInfo.TeamProject, "teamproject");
        assert.equal(repoInfo.TeamProjectUrl, "http://server:8080/tfs/DefaultCollection/teamproject");
    });

    /* Team Services URLs */
    it("should verify host, account and isTeamServices for valid remoteUrl", function() {
        const repoInfo: RepositoryInfo = new RepositoryInfo("https://account.visualstudio.com/DefaultCollection/teamproject/_git/repositoryName");
        assert.equal(repoInfo.Host, "account.visualstudio.com");
        assert.equal(repoInfo.Account, "account");
        assert.equal(repoInfo.Protocol, "https:");
        assert.isTrue(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
    });

    it("should verify valid values in repositoryInfo to RepositoryInfo constructor", function() {
        let repoInfo: RepositoryInfo = new RepositoryInfo("https://account.visualstudio.com/DefaultCollection/teamproject/_git/repositoryName");
        assert.equal(repoInfo.Host, "account.visualstudio.com");
        assert.equal(repoInfo.Account, "account");
        assert.isTrue(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
        const repositoryInfo: any = {
           "serverUrl": "https://account.visualstudio.com",
           "collection": {
              "id": "5e082e28-e8b2-4314-9200-629619e91098",
              "name": "account",
              "url": "https://account.visualstudio.com/_apis/projectCollections/5e082e28-e8b2-4314-9200-629619e91098"
           },
           "repository": {
              "id": "cc015c05-de20-4e3f-b3bc-3662b6bc0e42",
              "name": "repositoryName",
              "url": "https://account.visualstudio.com/DefaultCollection/_apis/git/repositories/cc015c05-de20-4e3f-b3bc-3662b6bc0e42",
              "project": {
                 "id": "ecbf2301-0e62-4b0d-a12d-1992f2ea95a8",
                 "name": "teamproject",
                 "description": "Our team project",
                 "url": "https://account.visualstudio.com/DefaultCollection/_apis/projects/ecbf2301-0e62-4b0d-a12d-1992f2ea95a8",
                 "state": 1,
                 "revision": 14558
              },
              "remoteUrl": "https://account.visualstudio.com/teamproject/_git/repositoryName"
           }
        };
        repoInfo = new RepositoryInfo(repositoryInfo);
        assert.equal(repoInfo.Host, "account.visualstudio.com");
        assert.equal(repoInfo.Account, "account");
        assert.equal(repoInfo.AccountUrl, "https://account.visualstudio.com");
        assert.equal(repoInfo.CollectionId, "5e082e28-e8b2-4314-9200-629619e91098");
        assert.equal(repoInfo.CollectionName, "account");
        assert.equal(repoInfo.CollectionUrl, "https://account.visualstudio.com");
        assert.isTrue(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
        assert.isFalse(repoInfo.IsTeamFoundationServer);
        assert.equal(repoInfo.RepositoryId, "cc015c05-de20-4e3f-b3bc-3662b6bc0e42");
        assert.equal(repoInfo.RepositoryName, "repositoryName");
        assert.equal(repoInfo.RepositoryUrl, "https://account.visualstudio.com/teamproject/_git/repositoryName");
        assert.equal(repoInfo.TeamProject, "teamproject");
        assert.equal(repoInfo.TeamProjectUrl, "https://account.visualstudio.com/teamproject");
    });

    it("should verify 'collection in the domain' case insensitivity in repositoryInfo to RepositoryInfo constructor", function() {
        let repoInfo: RepositoryInfo = new RepositoryInfo("https://account.visualstudio.com/DefaultCollection/teamproject/_git/repositoryName");
        assert.equal(repoInfo.Host, "account.visualstudio.com");
        assert.equal(repoInfo.Account, "account");
        assert.isTrue(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
        // To properly test 'collection in the domain' case insensitivity, ensure the collection name is a different case than the account (e.g., 'ACCOUNT' versus 'account')
        const repositoryInfo: any = {
           "serverUrl": "https://account.visualstudio.com",
           "collection": {
              "id": "5e082e28-e8b2-4314-9200-629619e91098",
              "name": "ACCOUNT",
              "url": "https://account.visualstudio.com/_apis/projectCollections/5e082e28-e8b2-4314-9200-629619e91098"
           },
           "repository": {
              "id": "cc015c05-de20-4e3f-b3bc-3662b6bc0e42",
              "name": "repositoryName",
              "url": "https://account.visualstudio.com/DefaultCollection/_apis/git/repositories/cc015c05-de20-4e3f-b3bc-3662b6bc0e42",
              "project": {
                 "id": "ecbf2301-0e62-4b0d-a12d-1992f2ea95a8",
                 "name": "teamproject",
                 "description": "Our team project",
                 "url": "https://account.visualstudio.com/DefaultCollection/_apis/projects/ecbf2301-0e62-4b0d-a12d-1992f2ea95a8",
                 "state": 1,
                 "revision": 14558
              },
              "remoteUrl": "https://account.visualstudio.com/teamproject/_git/repositoryName"
           }
        };
        repoInfo = new RepositoryInfo(repositoryInfo);
        assert.equal(repoInfo.Host, "account.visualstudio.com");
        assert.equal(repoInfo.Account, "account");
        assert.equal(repoInfo.AccountUrl, "https://account.visualstudio.com");
        assert.equal(repoInfo.CollectionId, "5e082e28-e8b2-4314-9200-629619e91098");
        // CollectionName should maintain the same case as in the JSON
        assert.equal(repoInfo.CollectionName, "ACCOUNT");
        // CollectionUrl should not contain the collection name since both account and collection name are the same (case insensitive)
        assert.equal(repoInfo.CollectionUrl, "https://account.visualstudio.com");
        assert.isTrue(repoInfo.IsTeamServices);
        assert.isTrue(repoInfo.IsTeamFoundation);
        assert.isFalse(repoInfo.IsTeamFoundationServer);
        assert.equal(repoInfo.RepositoryId, "cc015c05-de20-4e3f-b3bc-3662b6bc0e42");
        assert.equal(repoInfo.RepositoryName, "repositoryName");
        assert.equal(repoInfo.RepositoryUrl, "https://account.visualstudio.com/teamproject/_git/repositoryName");
        assert.equal(repoInfo.TeamProject, "teamproject");
        assert.equal(repoInfo.TeamProjectUrl, "https://account.visualstudio.com/teamproject");
    });

});
