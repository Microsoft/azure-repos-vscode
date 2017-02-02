/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { GetInfo } from "../../../src/tfvc/commands/getinfo";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult, IItemInfo } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-GetInfoCommand", function() {
    let serverUrl: string = "http://server:8080/tfs";
    let repoUrl: string = "http://server:8080/tfs/collection1/_git/repo1";
    let collectionUrl: string = "http://server:8080/tfs/collection1";
    let user: string = "user1";
    let pass: string = "pass1";
    let context: TeamServerContext;

    beforeEach(function() {
        context = new TeamServerContext(repoUrl);
        context.CredentialInfo = new CredentialInfo(user, pass);
        context.RepoInfo = new RepositoryInfo({
            serverUrl: serverUrl,
            collection: {
                name: "collection1",
                id: ""
            },
            repository: {
                remoteUrl: repoUrl,
                id: "",
                name: "",
                project: {
                    name: "project1"
                }
            }
        });
    });

    it("should verify constructor", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        new GetInfo(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        new GetInfo(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new GetInfo(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify arguments", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "info -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "info -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify parse output - no output", async function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseOutput(executionResult);
        assert.equal(itemInfos.length, 0);
    });

    it("should verify parse output - no errors", async function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Local information:\n" +
                    "Local path:  /path/to/file.txt\n" +
                    "Server path: $/TFVC_1/file.txt\n" +
                    "Changeset:   18\n" +
                    "Change:      none\n" +
                    "Type:        file\n" +
                    "Server information:\n" +
                    "Server path:   $/TFVC_1/file.txt\n" +
                    "Changeset:     18\n" +
                    "Deletion ID:   0\n" +
                    "Lock:          none\n" +
                    "Lock owner:\n" +
                    "Last modified: Nov 18, 2016 11:10:20 AM\n" +
                    "Type:          file\n" +
                    "File type:     windows-1252\n" +
                    "Size:          1385\n",
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseOutput(executionResult);
        assert.equal(itemInfos.length, 1);
        assert.equal(itemInfos[0].localItem, "/path/to/file.txt");
        assert.equal(itemInfos[0].serverItem, "$/TFVC_1/file.txt");
        assert.equal(itemInfos[0].localVersion, "18");
        assert.equal(itemInfos[0].change, "none");
        assert.equal(itemInfos[0].type, "file");
        assert.equal(itemInfos[0].serverVersion, "18");
        assert.equal(itemInfos[0].deletionId, "0");
        assert.equal(itemInfos[0].lock, "none");
        assert.equal(itemInfos[0].lockOwner, "");
        assert.equal(itemInfos[0].lastModified, "Nov 18, 2016 11:10:20 AM");
        assert.equal(itemInfos[0].fileType, "windows-1252");
        assert.equal(itemInfos[0].fileSize, "1385");
    });
});
