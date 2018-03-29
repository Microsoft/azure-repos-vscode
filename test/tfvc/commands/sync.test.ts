/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";
import { Strings } from "../../../src/helpers/strings";
import { Sync } from "../../../src/tfvc/commands/sync";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult, ISyncResults, SyncType } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-SyncCommand", function() {
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
        const localPaths: string[] = ["/usr/alias/repo1"];
        new Sync(undefined, localPaths, true);
    });

    it("should verify constructor with context", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        new Sync(context, localPaths, true);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Sync(undefined, undefined, false), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, false);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, false);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, false);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "get -noprompt -nosummary " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(context, localPaths, false);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "get -noprompt -collection:" + collectionUrl + " ******** -nosummary " + localPaths[0]);
    });

    it("should verify arguments with context and recursive", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(context, localPaths, true);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "get -noprompt -collection:" + collectionUrl + " ******** -nosummary " + localPaths[0] + " -recursive");
    });

    it("should verify getExeArguments", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, false);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "get -noprompt -nosummary " + localPaths[0]);
    });

    it("should verify getExeArguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(context, localPaths, false);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "get -noprompt ******** -nosummary " + localPaths[0]);
    });

    it("should verify getExeArguments with context and recursive", function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(context, localPaths, true);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "get -noprompt ******** -nosummary " + localPaths[0] + " -recursive");
    });

    it("should verify parse output - no output", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 0);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
    });

    it("should verify parse output - up to date", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "All files up to date.",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 0);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
    });

    it("should verify parse output - single file edit - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo1/test:\n" +
                    "Replacing test1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.Updated);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1/test", "test1.txt"));
    });

    it("should verify parse output - single file add - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo1/test:\n" +
                    "Getting test1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1/test", "test1.txt"));
    });

    it("should verify parse output - single file add - spaces - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo 1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo 1/test:\n" +
                    "Getting test 1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo 1/test", "test 1.txt"));
    });

    it("should verify parse output - multiple files - with conflict", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n" +
                    "Getting addFold\n" +
                    "Getting addFold-branch\n" +
                    "\n" +
                    "/usr/alias/repo1/addFold-branch:\n" +
                    "Replacing testHereRename.txt\n" +
                    "\n" +
                    "/usr/alias/repo1/addFold:\n" +
                    "Getting testHere3\n" +
                    "Replacing testHereRename7.txt\n" +
                    "\n" +
                    "/usr/alias/repo1/last:\n" +
                    "Deleting Rename2.txt\n" +
                    "Replacing test3.txt\n" +
                    "Getting TestAdd.txt\n" +
                    "\n",
            stderr: "Conflict test_renamed.txt - Unable to perform the get operation because you have a conflicting rename, edit\n"
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 9);
        assert.equal(results.hasConflicts, true);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1", "addFold"));
        assert.equal(results.itemResults[1].syncType, SyncType.New);
        assert.equal(results.itemResults[1].itemPath, path.join("/usr/alias/repo1", "addFold-branch"));
        assert.equal(results.itemResults[2].syncType, SyncType.Updated);
        assert.equal(results.itemResults[2].itemPath, path.join("/usr/alias/repo1/addFold-branch", "testHereRename.txt"));
        assert.equal(results.itemResults[3].syncType, SyncType.New);
        assert.equal(results.itemResults[3].itemPath, path.join("/usr/alias/repo1/addFold", "testHere3"));
        assert.equal(results.itemResults[4].syncType, SyncType.Updated);
        assert.equal(results.itemResults[4].itemPath, path.join("/usr/alias/repo1/addFold", "testHereRename7.txt"));
        assert.equal(results.itemResults[5].syncType, SyncType.Deleted);
        assert.equal(results.itemResults[5].itemPath, path.join("/usr/alias/repo1/last", "Rename2.txt"));
        assert.equal(results.itemResults[6].syncType, SyncType.Updated);
        assert.equal(results.itemResults[6].itemPath, path.join("/usr/alias/repo1/last", "test3.txt"));
        assert.equal(results.itemResults[7].syncType, SyncType.New);
        assert.equal(results.itemResults[7].itemPath, path.join("/usr/alias/repo1/last", "TestAdd.txt"));
        //stderr lines always come last
        assert.equal(results.itemResults[8].syncType, SyncType.Conflict);
        assert.equal(results.itemResults[8].itemPath, "test_renamed.txt");
        assert.equal(results.itemResults[8].message, "Unable to perform the get operation because you have a conflicting rename, edit");
    });

    it("should verify parse output - errors - exit code 1", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n",
            stderr: "Conflict new.txt - Unable to perform the get operation because you have a conflicting edit\n" +
                    "new4.txt - Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)\n" +
                    "Warning new111.txt - Unable to perform the get operation because it is writable"
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 3);
        assert.equal(results.hasConflicts, true);
        assert.equal(results.hasErrors, true);
        assert.equal(results.itemResults[0].syncType, SyncType.Conflict);
        assert.equal(results.itemResults[0].itemPath, "new.txt");
        assert.equal(results.itemResults[0].message, "Unable to perform the get operation because you have a conflicting edit");
        assert.equal(results.itemResults[1].syncType, SyncType.Error);
        assert.equal(results.itemResults[1].itemPath, "new4.txt");
        assert.equal(results.itemResults[1].message, "Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)");
        assert.equal(results.itemResults[2].syncType, SyncType.Warning);
        assert.equal(results.itemResults[2].itemPath, "new111.txt");
        assert.equal(results.itemResults[2].message, "Unable to perform the get operation because it is writable");
    });

    it("should verify parse output - errors - no conflicts", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n",
            stderr: "new4.txt - Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)\n" +
                    "Warning new111.txt - Unable to perform the get operation because it is writable\n" +
                    "/usr/alias/repo1/folder cannot be deleted because it is not empty"
        };

        const results: ISyncResults = await cmd.ParseOutput(executionResult);
        assert.equal(results.itemResults.length, 3);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, true);
        assert.equal(results.itemResults[0].syncType, SyncType.Error);
        assert.equal(results.itemResults[0].itemPath, "new4.txt");
        assert.equal(results.itemResults[0].message, "Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)");
        assert.equal(results.itemResults[1].syncType, SyncType.Warning);
        assert.equal(results.itemResults[1].itemPath, "new111.txt");
        assert.equal(results.itemResults[1].message, "Unable to perform the get operation because it is writable");
        assert.equal(results.itemResults[2].syncType, SyncType.Warning);
        assert.equal(results.itemResults[2].itemPath, "/usr/alias/repo1/folder");
        assert.equal(results.itemResults[2].message, "/usr/alias/repo1/folder cannot be deleted because it is not empty");
    });

    it("should verify parse output - errors - exit code 100", async function() {
        const localPaths: string[] = ["/usr/alias/repo 1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
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

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 0);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
    });

    it("should verify parse EXE output - up to date", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "All files are up to date.",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 0);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
    });

    it("should verify parse EXE output - single file edit - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo1/test:\n" +
                    "Replacing test1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.Updated);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1/test", "test1.txt"));
    });

    it("should verify parse EXE output - single file add - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo1/test:\n" +
                    "Getting test1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1/test", "test1.txt"));
    });

    it("should verify parse EXE output - single file add - spaces - no errors", async function() {
        const localPaths: string[] = ["/usr/alias/repo 1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/usr/alias/repo 1/test:\n" +
                    "Getting test 1.txt\n",
            stderr: undefined
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 1);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo 1/test", "test 1.txt"));
    });

    it("should verify parse EXE output - multiple files - with conflict", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n" +
                    "Getting addFold\n" +
                    "Getting addFold-branch\n" +
                    "\n" +
                    "/usr/alias/repo1/addFold-branch:\n" +
                    "Replacing testHereRename.txt\n" +
                    "\n" +
                    "/usr/alias/repo1/addFold:\n" +
                    "Getting testHere3\n" +
                    "Replacing testHereRename7.txt\n" +
                    "\n" +
                    "/usr/alias/repo1/last:\n" +
                    "Deleting Rename2.txt\n" +
                    "Replacing test3.txt\n" +
                    "Getting TestAdd.txt\n" +
                    "\n",
            stderr: "Conflict test_renamed.txt - Unable to perform the get operation because you have a conflicting rename, edit\n"
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 9);
        assert.equal(results.hasConflicts, true);
        assert.equal(results.hasErrors, false);
        assert.equal(results.itemResults[0].syncType, SyncType.New);
        assert.equal(results.itemResults[0].itemPath, path.join("/usr/alias/repo1", "addFold"));
        assert.equal(results.itemResults[1].syncType, SyncType.New);
        assert.equal(results.itemResults[1].itemPath, path.join("/usr/alias/repo1", "addFold-branch"));
        assert.equal(results.itemResults[2].syncType, SyncType.Updated);
        assert.equal(results.itemResults[2].itemPath, path.join("/usr/alias/repo1/addFold-branch", "testHereRename.txt"));
        assert.equal(results.itemResults[3].syncType, SyncType.New);
        assert.equal(results.itemResults[3].itemPath, path.join("/usr/alias/repo1/addFold", "testHere3"));
        assert.equal(results.itemResults[4].syncType, SyncType.Updated);
        assert.equal(results.itemResults[4].itemPath, path.join("/usr/alias/repo1/addFold", "testHereRename7.txt"));
        assert.equal(results.itemResults[5].syncType, SyncType.Deleted);
        assert.equal(results.itemResults[5].itemPath, path.join("/usr/alias/repo1/last", "Rename2.txt"));
        assert.equal(results.itemResults[6].syncType, SyncType.Updated);
        assert.equal(results.itemResults[6].itemPath, path.join("/usr/alias/repo1/last", "test3.txt"));
        assert.equal(results.itemResults[7].syncType, SyncType.New);
        assert.equal(results.itemResults[7].itemPath, path.join("/usr/alias/repo1/last", "TestAdd.txt"));
        //stderr lines always come last
        assert.equal(results.itemResults[8].syncType, SyncType.Conflict);
        assert.equal(results.itemResults[8].itemPath, "test_renamed.txt");
        assert.equal(results.itemResults[8].message, "Unable to perform the get operation because you have a conflicting rename, edit");
    });

    it("should verify parse EXE output - errors - exit code 1", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n",
            stderr: "Conflict new.txt - Unable to perform the get operation because you have a conflicting edit\n" +
                    "new4.txt - Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)\n" +
                    "Warning new111.txt - Unable to perform the get operation because it is writable"
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 3);
        assert.equal(results.hasConflicts, true);
        assert.equal(results.hasErrors, true);
        assert.equal(results.itemResults[0].syncType, SyncType.Conflict);
        assert.equal(results.itemResults[0].itemPath, "new.txt");
        assert.equal(results.itemResults[0].message, "Unable to perform the get operation because you have a conflicting edit");
        assert.equal(results.itemResults[1].syncType, SyncType.Error);
        assert.equal(results.itemResults[1].itemPath, "new4.txt");
        assert.equal(results.itemResults[1].message, "Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)");
        assert.equal(results.itemResults[2].syncType, SyncType.Warning);
        assert.equal(results.itemResults[2].itemPath, "new111.txt");
        assert.equal(results.itemResults[2].message, "Unable to perform the get operation because it is writable");
    });

    it("should verify parse EXE output - errors - no conflicts", async function() {
        const localPaths: string[] = ["/usr/alias/repo1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "/usr/alias/repo1:\n",
            stderr: "new4.txt - Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)\n" +
                    "Warning new111.txt - Unable to perform the get operation because it is writable\n" +
                    "/usr/alias/repo1/folder cannot be deleted because it is not empty"
        };

        const results: ISyncResults = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.itemResults.length, 3);
        assert.equal(results.hasConflicts, false);
        assert.equal(results.hasErrors, true);
        assert.equal(results.itemResults[0].syncType, SyncType.Error);
        assert.equal(results.itemResults[0].itemPath, "new4.txt");
        assert.equal(results.itemResults[0].message, "Unable to perform the get operation because you have a conflicting rename (to be moved from /path/new5.txt)");
        assert.equal(results.itemResults[1].syncType, SyncType.Warning);
        assert.equal(results.itemResults[1].itemPath, "new111.txt");
        assert.equal(results.itemResults[1].message, "Unable to perform the get operation because it is writable");
        assert.equal(results.itemResults[2].syncType, SyncType.Warning);
        assert.equal(results.itemResults[2].itemPath, "/usr/alias/repo1/folder");
        assert.equal(results.itemResults[2].message, "/usr/alias/repo1/folder cannot be deleted because it is not empty");
    });

    it("should verify parse EXE output - errors - exit code 100", async function() {
        const localPaths: string[] = ["/usr/alias/repo 1"];
        const cmd: Sync = new Sync(undefined, localPaths, true);
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
