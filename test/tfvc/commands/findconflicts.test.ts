/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import { Strings } from "../../../src/helpers/strings";
import { FindConflicts } from "../../../src/tfvc/commands/findconflicts";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult, IConflict } from "../../../src/tfvc/interfaces";
import { ConflictType } from "../../../src/tfvc/scm/status";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-FindConflictsCommand", function() {
    const serverUrl: string = "http://server:8080/tfs";
    const repoUrl: string = "http://server:8080/tfs/collection1/_git/repo1";
    const collectionUrl: string = "http://server:8080/tfs/collection1";
    const user: string = "user1";
    const pass: string = "pass1";
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
        const localPath: string = "/usr/alias/repo1";
        new FindConflicts(undefined, localPath);
    });

    it("should verify constructor with context", function() {
        const localPath: string = "/usr/alias/repo1";
        new FindConflicts(context, localPath);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new FindConflicts(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt " + localPath + " -recursive -preview");
    });

    it("should verify Exe arguments", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "resolve -noprompt " + localPath + " -recursive -preview");
    });

    it("should verify arguments with context", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(context, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt -collection:" + collectionUrl + " ******** " + localPath + " -recursive -preview");
    });

    it("should verify Exe arguments with context", function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(context, localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "resolve -noprompt ******** " + localPath + " -recursive -preview");
    });

    it("should verify parse output - no output", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse output - one of each type", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: "contentChange.txt: The item content has changed\n" +
                    "addConflict.txt: Another item with the same name exists on the server\n" +
                    "nameChange.txt: The item name has changed\n" +
                    "nameAndContentChange.txt: The item name and content have changed\n" +
                    "anotherNameAndContentChange.txt: You have a conflicting pending change\n" +
                    "contentChange2.txt: The item content has changed\n" +
                    "deleted.txt: The item has already been deleted\n" +
                    "branchEdit.txt: The source and target both have changes\n" +
                    "branchDelete.txt: The item has been deleted in the target branch"
        };

        const results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 9);
        assert.equal(results[0].localPath, "contentChange.txt");
        assert.equal(results[0].type, ConflictType.CONTENT);
        assert.equal(results[1].localPath, "addConflict.txt");
        assert.equal(results[1].type, ConflictType.CONTENT);
        assert.equal(results[2].localPath, "nameChange.txt");
        assert.equal(results[2].type, ConflictType.RENAME);
        assert.equal(results[3].localPath, "nameAndContentChange.txt");
        assert.equal(results[3].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[4].localPath, "anotherNameAndContentChange.txt");
        assert.equal(results[4].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[5].localPath, "contentChange2.txt");
        assert.equal(results[5].type, ConflictType.CONTENT);
        assert.equal(results[6].localPath, "deleted.txt");
        assert.equal(results[6].type, ConflictType.DELETE);
        assert.equal(results[7].localPath, "branchEdit.txt");
        assert.equal(results[7].type, ConflictType.MERGE);
        assert.equal(results[8].localPath, "branchDelete.txt");
        assert.equal(results[8].type, ConflictType.DELETE_TARGET);
    });

    //With _JAVA_OPTIONS set and there are conflicts, _JAVA_OPTIONS will appear in stderr along with the results also in stderr (and stdout will be empty)
    it("should verify parse output - one of each type - _JAVA_OPTIONS", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: "contentChange.txt: The item content has changed\n" +
                    "addConflict.txt: Another item with the same name exists on the server\n" +
                    "nameChange.txt: The item name has changed\n" +
                    "nameAndContentChange.txt: The item name and content have changed\n" +
                    "anotherNameAndContentChange.txt: You have a conflicting pending change\n" +
                    "contentChange2.txt: The item content has changed\n" +
                    "deleted.txt: The item has already been deleted\n" +
                    "branchEdit.txt: The source and target both have changes\n" +
                    "branchDelete.txt: The item has been deleted in the target branch\n" +
                    "Picked up _JAVA_OPTIONS: -Xmx1024M"
        };

        const results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 9);
        assert.equal(results[0].localPath, "contentChange.txt");
        assert.equal(results[0].type, ConflictType.CONTENT);
        assert.equal(results[1].localPath, "addConflict.txt");
        assert.equal(results[1].type, ConflictType.CONTENT);
        assert.equal(results[2].localPath, "nameChange.txt");
        assert.equal(results[2].type, ConflictType.RENAME);
        assert.equal(results[3].localPath, "nameAndContentChange.txt");
        assert.equal(results[3].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[4].localPath, "anotherNameAndContentChange.txt");
        assert.equal(results[4].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[5].localPath, "contentChange2.txt");
        assert.equal(results[5].type, ConflictType.CONTENT);
        assert.equal(results[6].localPath, "deleted.txt");
        assert.equal(results[6].type, ConflictType.DELETE);
        assert.equal(results[7].localPath, "branchEdit.txt");
        assert.equal(results[7].type, ConflictType.MERGE);
        assert.equal(results[8].localPath, "branchDelete.txt");
        assert.equal(results[8].type, ConflictType.DELETE_TARGET);
    });

    //With _JAVA_OPTIONS set and there are no conflicts, _JAVA_OPTIONS is in stderr but the result we want to process is moved to stdout
    it("should verify parse output - no conflicts - _JAVA_OPTIONS", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "There are no conflicts to resolve.\n",
            stderr: "Picked up _JAVA_OPTIONS: -Xmx1024M\n"
        };

        const results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse output - errors - exit code 100", async function() {
        const localPath: string = "/usr/alias/repo 1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
        }
    });

    it("should verify parse Exe output - no output", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const results: IConflict[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse Exe output - one of each type", async function() {
        const localPath: string = "/usr/alias/repo1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "",
            stderr: "folder1\\anothernewfile2.txt: A newer version exists on the server.\n" +
                    "folder1\\anothernewfile4.txt: The item has been deleted from the server.\n"
        };

        const results: IConflict[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.length, 2);
        assert.equal(results[0].localPath, "folder1\\anothernewfile2.txt");
        assert.equal(results[0].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[1].localPath, "folder1\\anothernewfile4.txt");
        assert.equal(results[1].type, ConflictType.DELETE);
    });

    it("should verify parse Exe output - errors - exit code 100", async function() {
        const localPath: string = "/usr/alias/repo 1";
        const cmd: FindConflicts = new FindConflicts(undefined, localPath);
        const executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
        }
    });

});
