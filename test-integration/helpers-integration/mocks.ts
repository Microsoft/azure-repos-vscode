/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext } from "../../src/contexts/servercontext";
import { RepositoryInfo } from "../../src/info/repositoryinfo";
import { TestSettings } from "./testsettings";

export class Mocks {

    public static TeamServerContext(repositoryUrl: string): TeamServerContext {
        return new TeamServerContext(repositoryUrl);
    }

    public static RepositoryInfo(): RepositoryInfo {
        const repositoryInfo: any = {
            "serverUrl":"undefined",
            "collection":{
                "id":"undefined",
                "name":"undefined",
                "url":"undefined"
            },
            "repository":{
                "id":"undefined",
                "name":"undefined",
                "url":"undefined",
                "project":{
                    "id":"undefined",
                    "name":"undefined",
                    "url":"undefined",
                    "state":1,
                    "revision":115
                },
                "remoteUrl":"undefined"
            }
        };
        repositoryInfo.serverUrl = TestSettings.AccountUrl;
        repositoryInfo.collection.name = TestSettings.CollectionName;
        repositoryInfo.collection.url = TestSettings.AccountUrl + "/_apis/projectCollections/" + TestSettings.CollectionGuid;
        repositoryInfo.repository.id = TestSettings.RepositoryId;
        repositoryInfo.repository.name = TestSettings.RepositoryName;
        repositoryInfo.repository.url = TestSettings.AccountUrl + "/DefaultCollection/_apis/git/repositories/" + TestSettings.RepositoryId;
        repositoryInfo.repository.project.name = TestSettings.TeamProject;
        repositoryInfo.repository.project.url = TestSettings.AccountUrl + "/DefaultCollection/_apis/projects/" + + TestSettings.ProjectGuid;
        repositoryInfo.repository.remoteUrl = TestSettings.RemoteRepositoryUrl;

        return new RepositoryInfo(repositoryInfo);
    }
}
