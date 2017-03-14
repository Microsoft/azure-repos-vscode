/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

export class TestSettings {

    public static get SuiteTimeout(): number {
        let timeout : string = process.env.MSVSTS_TEAM_SUITE_TIMEOUT;
        return (timeout ? Number(timeout) : 30000);
    }

    public static get TestTimeout(): number {
        let timeout : string = process.env.MSVSTS_TEAM_TEST_TIMEOUT;
        return (timeout ? Number(timeout) : 8000);
    }

    public static get Password() : string {
        let token : string = process.env.MSVSTS_TEAM_ACCESS_TOKEN;
        let password: string = process.env.MSVSTS_TEAM_ACCESS_PASSWORD;
        if (password) {
            return password;
        }
        //Token should have READ for build, code and wit
        //Token should have READ,WRITE for wit (to test CreateWorkItem which is not exposed to user)
        return (token || "undefined-password");
    }

    //Returns just any old token (doesn't have to be an env var)
    public static get SettingsPassword() : string {
        return "kegnf4wasx3n5nwdj5lkutvjavtbbfblygsxcggvpphpmfwvjjov";
    }

    public static get Account() : string {
        let account : string = process.env.MSVSTS_TEAM_ACCOUNT;
        return (account || "undefined-account");
    }

    public static get AccountUrl() : string {
        let accountUrl : string = process.env.MSVSTS_TEAM_ACCOUNT_URL;
        return (accountUrl || "undefined-account-url");
    }

    public static get AccountUser() : string {
        let accountUser : string = process.env.MSVSTS_TEAM_ACCOUNT_USER;
        return (accountUser || "OAuth-integration-tests");
    }

    public static get BuildDefinitionId() : number {
        let id : string = process.env.MSVSTS_TEAM_BUILD_DEFINITION_ID;
        return (id ? Number(id) : -1);
    }

    public static get BuildId() : number {
        let id : string = process.env.MSVSTS_TEAM_BUILD_ID;
        return (id ? Number(id) : -1);
    }

    public static get CollectionName() : string {
        let collectionName : string = process.env.MSVSTS_TEAM_COLLECTION_NAME;
        return (collectionName || "undefined-collection-name");
    }

    public static get RemoteRepositoryUrl() : string {
        let remoteRepositoryUrl : string = process.env.MSVSTS_TEAM_REMOTE_REPOSITORY_URL;
        return (remoteRepositoryUrl || "undefined-remote-repository-url");
    }

    public static get RemoteTfvcRepositoryUrl() : string {
        let remoteRepositoryUrl : string = process.env.MSVSTS_TEAM_REMOTE_TFVC_REPOSITORY_URL;
        return (remoteRepositoryUrl || "undefined-remote-tfvc-repository-url");
    }

    public static get RepositoryId(): string {
        let repositoryId : string = process.env.MSVSTS_TEAM_REPOSITORY_ID;
        return (repositoryId || "undefined-repository-id");
    }

    public static get RepositoryName(): string {
        let repositoryName : string = process.env.MSVSTS_TEAM_REPOSITORY_NAME;
        return (repositoryName || "undefined-repository-name");
    }

    public static get TeamProject(): string {
        let teamProject : string = process.env.MSVSTS_TEAM_TEAM_PROJECT;
        return (teamProject || "undefined-team-project");
    }

    public static get WorkItemId() : number {
        let id : string = process.env.MSVSTS_TEAM_WORK_ITEM_ID;
        return (id ? Number(id) : -1);
    }

    public static get WorkItemQueryId() : string {
        let workItemQueryId : string = process.env.MSVSTS_TEAM_WORK_ITEM_QUERY_ID;
        return (workItemQueryId || "undefined-workitem-query-id");
    }

    public static get WorkItemLinkQueryPath(): string {
        let workItemQueryPath : string = process.env.MSVSTS_TEAM_WORK_ITEM_LINK_QUERY_PATH;
        return (workItemQueryPath || "undefined-workitem-link-query-id");
    }

    public static get WorkItemQueryPath(): string {
        let workItemQueryPath : string = process.env.MSVSTS_TEAM_WORK_ITEM_QUERY_PATH;
        return (workItemQueryPath || "undefined-workitem-query-path");
    }

    public static get WorkItemTwoHundredTasksQueryPath(): string {
        let workItemQueryPath : string = process.env.MSVSTS_TEAM_WORK_ITEM_TWO_HUNDRED_QUERY_PATH;
        return (workItemQueryPath || "undefined-workitem-twohundredtasks-query-path");
    }

    public static get ProjectGuid() : string {
        let remoteRepositoryUrl : string = process.env.MSVSTS_TEAM_PROJECT_GUID;
        return (remoteRepositoryUrl || "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    }

    public static get CollectionGuid() : string {
        let remoteRepositoryUrl : string = process.env.MSVSTS_TEAM_COLLECTION_GUID;
        return (remoteRepositoryUrl || "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    }
}
