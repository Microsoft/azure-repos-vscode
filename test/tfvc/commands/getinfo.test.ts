/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Strings } from "../../../src/helpers/strings";
import { GetInfo } from "../../../src/tfvc/commands/getinfo";
import { TfvcError, TfvcErrorCodes } from "../../../src/tfvc/tfvcerror";
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

    it("should verify GetOptions", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        assert.deepEqual(cmd.GetExeOptions(), {});
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

    it("should verify GetExeArguments", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "info -noprompt " + localPaths[0]);
    });

    it("should verify GetExeArguments with context", function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(context, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "info -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
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

    it("should verify parse output - single item", async function() {
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

    it("should verify parse output - multiple items", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "/path/to/workspace/file2.txt"];
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
                    "Size:          1385\n" +
                    "\n" +
                    "Local information:\n" +
                    "Local path:  /path/to/file2.txt\n" +
                    "Server path: $/TFVC_1/file2.txt\n" +
                    "Changeset:   19\n" +
                    "Change:      none\n" +
                    "Type:        file\n" +
                    "Server information:\n" +
                    "Server path:   $/TFVC_1/file2.txt\n" +
                    "Changeset:     19\n" +
                    "Deletion ID:   0\n" +
                    "Lock:          none\n" +
                    "Lock owner:\n" +
                    "Last modified: Nov 19, 2016 11:10:20 AM\n" +
                    "Type:          file\n" +
                    "File type:     windows-1252\n" +
                    "Size:          1386\n",
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseOutput(executionResult);
        assert.equal(itemInfos.length, 2);
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
        assert.equal(itemInfos[1].localItem, "/path/to/file2.txt");
        assert.equal(itemInfos[1].serverItem, "$/TFVC_1/file2.txt");
        assert.equal(itemInfos[1].localVersion, "19");
        assert.equal(itemInfos[1].change, "none");
        assert.equal(itemInfos[1].type, "file");
        assert.equal(itemInfos[1].serverVersion, "19");
        assert.equal(itemInfos[1].deletionId, "0");
        assert.equal(itemInfos[1].lock, "none");
        assert.equal(itemInfos[1].lockOwner, "");
        assert.equal(itemInfos[1].lastModified, "Nov 19, 2016 11:10:20 AM");
        assert.equal(itemInfos[1].fileType, "windows-1252");
        assert.equal(itemInfos[1].fileSize, "1386");
    });

    it("should verify parse output - multiple items with errors", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "nomatch", "/path/to/workspace/file2.txt"];
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
                    "Size:          1385\n" +
                    "\n" +
                    "No items match nomatch\n" +
                    "\n" +
                    "Local information:\n" +
                    "Local path:  /path/to/file2.txt\n" +
                    "Server path: $/TFVC_1/file2.txt\n" +
                    "Changeset:   19\n" +
                    "Change:      none\n" +
                    "Type:        file\n" +
                    "Server information:\n" +
                    "Server path:   $/TFVC_1/file2.txt\n" +
                    "Changeset:     19\n" +
                    "Deletion ID:   0\n" +
                    "Lock:          none\n" +
                    "Lock owner:\n" +
                    "Last modified: Nov 19, 2016 11:10:20 AM\n" +
                    "Type:          file\n" +
                    "File type:     windows-1252\n" +
                    "Size:          1386\n",
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseOutput(executionResult);
        assert.equal(itemInfos.length, 3);
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
        assert.equal(itemInfos[1].localItem, undefined); // This indicates that the file could not be found, but other files could
        assert.equal(itemInfos[2].localItem, "/path/to/file2.txt");
        assert.equal(itemInfos[2].serverItem, "$/TFVC_1/file2.txt");
        assert.equal(itemInfos[2].localVersion, "19");
        assert.equal(itemInfos[2].change, "none");
        assert.equal(itemInfos[2].type, "file");
        assert.equal(itemInfos[2].serverVersion, "19");
        assert.equal(itemInfos[2].deletionId, "0");
        assert.equal(itemInfos[2].lock, "none");
        assert.equal(itemInfos[2].lockOwner, "");
        assert.equal(itemInfos[2].lastModified, "Nov 19, 2016 11:10:20 AM");
        assert.equal(itemInfos[2].fileType, "windows-1252");
        assert.equal(itemInfos[2].fileSize, "1386");
    });

    it("should verify parse output - all errors", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "/path/to/workspace/file2.txt"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "No items match /path/to/workspace/file.txt\n" +
                    "\n" +
                    "No items match /path/to/workspace/file2.txt\n",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoMatchesFound));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NoItemsMatch);
        }
    });

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        let localPaths: string[] = ["/path/to/workspace"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(itemInfos.length, 0);
    });

    it("should verify parse EXE output - single item", async function() {
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

        let itemInfos: IItemInfo[] = await cmd.ParseExeOutput(executionResult);
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

    it("should verify parse EXE output - multiple items", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "/path/to/workspace/file2.txt"];
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
                    "Size:          1385\n" +
                    "Local information:\n" +
                    "Local path:  /path/to/file2.txt\n" +
                    "Server path: $/TFVC_1/file2.txt\n" +
                    "Changeset:   19\n" +
                    "Change:      none\n" +
                    "Type:        file\n" +
                    "Server information:\n" +
                    "Server path:   $/TFVC_1/file2.txt\n" +
                    "Changeset:     19\n" +
                    "Deletion ID:   0\n" +
                    "Lock:          none\n" +
                    "Lock owner:\n" +
                    "Last modified: Nov 19, 2016 11:10:20 AM\n" +
                    "Type:          file\n" +
                    "File type:     windows-1252\n" +
                    "Size:          1386\n",
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(itemInfos.length, 2);
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
        assert.equal(itemInfos[1].localItem, "/path/to/file2.txt");
        assert.equal(itemInfos[1].serverItem, "$/TFVC_1/file2.txt");
        assert.equal(itemInfos[1].localVersion, "19");
        assert.equal(itemInfos[1].change, "none");
        assert.equal(itemInfos[1].type, "file");
        assert.equal(itemInfos[1].serverVersion, "19");
        assert.equal(itemInfos[1].deletionId, "0");
        assert.equal(itemInfos[1].lock, "none");
        assert.equal(itemInfos[1].lockOwner, "");
        assert.equal(itemInfos[1].lastModified, "Nov 19, 2016 11:10:20 AM");
        assert.equal(itemInfos[1].fileType, "windows-1252");
        assert.equal(itemInfos[1].fileSize, "1386");
    });

    it("should verify parse EXE output - multiple items with errors", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "nomatch", "/path/to/workspace/file2.txt"];
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
                    "Size:          1385\n" +
                    "No items match nomatch\n" +
                    "Local information:\n" +
                    "Local path:  /path/to/file2.txt\n" +
                    "Server path: $/TFVC_1/file2.txt\n" +
                    "Changeset:   19\n" +
                    "Change:      none\n" +
                    "Type:        file\n" +
                    "Server information:\n" +
                    "Server path:   $/TFVC_1/file2.txt\n" +
                    "Changeset:     19\n" +
                    "Deletion ID:   0\n" +
                    "Lock:          none\n" +
                    "Lock owner:\n" +
                    "Last modified: Nov 19, 2016 11:10:20 AM\n" +
                    "Type:          file\n" +
                    "File type:     windows-1252\n" +
                    "Size:          1386\n",
            stderr: undefined
        };

        let itemInfos: IItemInfo[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(itemInfos.length, 3);
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
        assert.equal(itemInfos[1].localItem, undefined); // This indicates that the file could not be found, but other files could
        assert.equal(itemInfos[2].localItem, "/path/to/file2.txt");
        assert.equal(itemInfos[2].serverItem, "$/TFVC_1/file2.txt");
        assert.equal(itemInfos[2].localVersion, "19");
        assert.equal(itemInfos[2].change, "none");
        assert.equal(itemInfos[2].type, "file");
        assert.equal(itemInfos[2].serverVersion, "19");
        assert.equal(itemInfos[2].deletionId, "0");
        assert.equal(itemInfos[2].lock, "none");
        assert.equal(itemInfos[2].lockOwner, "");
        assert.equal(itemInfos[2].lastModified, "Nov 19, 2016 11:10:20 AM");
        assert.equal(itemInfos[2].fileType, "windows-1252");
        assert.equal(itemInfos[2].fileSize, "1386");
    });

    it("should verify parse EXE output - all errors", async function() {
        let localPaths: string[] = ["/path/to/workspace/file.txt", "/path/to/workspace/file2.txt"];
        let cmd: GetInfo = new GetInfo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "No items match /path/to/workspace/file.txt\n" +
                    "No items match /path/to/workspace/file2.txt\n",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoMatchesFound));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NoItemsMatch);
        }
    });
});
