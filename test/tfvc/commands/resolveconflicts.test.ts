/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import { Strings } from "../../../src/helpers/strings";
import { ResolveConflicts } from "../../../src/tfvc/commands/resolveconflicts";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { AutoResolveType, IExecutionResult, IConflict } from "../../../src/tfvc/interfaces";
import { ConflictType } from "../../../src/tfvc/scm/status";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-ResolveConflictsCommand", function() {
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
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
    });

    it("should verify constructor with context", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        new ResolveConflicts(context, localPaths, AutoResolveType.KeepYours);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new ResolveConflicts(undefined, undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt " + localPaths[0] + " -auto:KeepYours");
    });

    it("should verify arguments with context", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(context, localPaths, AutoResolveType.KeepYours);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0] + " -auto:KeepYours");
    });

    it("should verify arguments with TakeTheirs", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(context, localPaths, AutoResolveType.TakeTheirs);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0] + " -auto:TakeTheirs");
    });

    it("should verify GetExeArguments", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "resolve -noprompt " + localPaths[0] + " -auto:KeepYours");
    });

    it("should verify GetExeArguments with context", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(context, localPaths, AutoResolveType.KeepYours);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "resolve -noprompt ******** " + localPaths[0] + " -auto:KeepYours");
    });

    it("should verify GetExeArguments with TakeTheirs", function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(context, localPaths, AutoResolveType.TakeTheirs);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "resolve -noprompt ******** " + localPaths[0] + " -auto:TakeTheirs");
    });

    it("should verify parse output - no output", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse output - no errors", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt", "/usr/alias/repo1/file2.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Resolved /usr/alias/repo1/file.txt as KeepYours\n" +
                    "Resolved /usr/alias/repo1/file2.txt as KeepYours",
            stderr: undefined
        };

        let results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 2);
        assert.equal(results[0].localPath, "/usr/alias/repo1/file.txt");
        assert.equal(results[0].type, ConflictType.RESOLVED);
        assert.equal(results[1].localPath, "/usr/alias/repo1/file2.txt");
        assert.equal(results[1].type, ConflictType.RESOLVED);
    });

    it("should verify parse output - errors - exit code 100", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.equal(err.tfvcCommand, "resolve");
            assert.equal(err.message.indexOf(Strings.TfExecFailedError), 0);
            assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
        }
    });

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let results: IConflict[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse EXE output - no errors", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt", "/usr/alias/repo1/file2.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Resolved /usr/alias/repo1/file.txt as KeepYours\n" +
                    "Resolved /usr/alias/repo1/file2.txt as KeepYours",
            stderr: undefined
        };

        let results: IConflict[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(results.length, 2);
        assert.equal(results[0].localPath, "/usr/alias/repo1/file.txt");
        assert.equal(results[0].type, ConflictType.RESOLVED);
        assert.equal(results[1].localPath, "/usr/alias/repo1/file2.txt");
        assert.equal(results[1].type, ConflictType.RESOLVED);
    });

    it("should verify parse EXE output - errors - exit code 100", async function() {
        let localPaths: string[] = ["/usr/alias/repo1/file.txt"];
        let cmd: ResolveConflicts = new ResolveConflicts(undefined, localPaths, AutoResolveType.KeepYours);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.equal(err.tfvcCommand, "resolve");
            assert.equal(err.message.indexOf(Strings.TfExecFailedError), 0);
            assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
        }
    });
});
