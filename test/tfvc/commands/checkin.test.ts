/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Checkin } from "../../../src/tfvc/commands/checkin";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-CheckinCommand", function() {
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
        let files: string[] = ["/path/to/workspace/file.txt"];
        new Checkin(undefined, files);
    });

    it("should verify constructor with context", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        new Checkin(context, files);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Checkin(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(undefined, files);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify arguments", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(undefined, files);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "checkin -noprompt " + files[0]);
    });

    it("should verify arguments with context", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(context, files);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "checkin -noprompt -collection:" + collectionUrl + " ******** " + files[0]);
    });

    it("should verify arguments with workitems", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(context, files, undefined, [1, 2, 3]);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "checkin -noprompt -collection:" + collectionUrl + " ******** " + files[0] + " -associate:1,2,3");
    });

    it("should verify arguments with comment", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(context, files, "a comment\nthat has\r\nmultiple lines");

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "checkin -noprompt -collection:" + collectionUrl + " ******** " + files[0] + " -comment:a comment that has multiple lines");
    });

    it("should verify arguments with all params", function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(context, files, "a comment", [1, 2, 3]);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "checkin -noprompt -collection:" + collectionUrl + " ******** " + files[0] + " -comment:a comment -associate:1,2,3");
    });

    it("should verify parse output - no output", async function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(undefined, files);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let result: string = await cmd.ParseOutput(executionResult);
        assert.equal(result, "");
    });

    it("should verify parse output - no errors", async function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(undefined, files);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "/Users/leantk/tfvc-tfs/tfsTest_01/addFold:\n" +
                    "Checking in edit: testHere.txt\n" +
                    "\n" +
                    "/Users/leantk/tfvc-tfs/tfsTest_01:\n" +
                    "Checking in edit: test3.txt\n" +
                    "Checking in edit: TestAdd.txt\n" +
                    "\n" +
                    "Changeset #23 checked in.\n",
            stderr: undefined
        };

        let result: string = await cmd.ParseOutput(executionResult);
        assert.equal(result, "23");
    });

    it("should verify parse output - with error", async function() {
        let files: string[] = ["/path/to/workspace/file.txt"];
        let cmd: Checkin = new Checkin(undefined, files);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "/Users/leantk/tfvc-tfs/tfsTest_01:\n" +
                    "Checking in edit: test3.txt\n" +
                    "Checking in edit: TestAdd.txt\n" +
                    "No files checked in.\n",
            stderr: "A resolvable conflict was flagged by the server: No files checked in due to conflicting changes.  Resolve the conflicts and try the check-in again.\n"
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.equal(err.tfvcCommand, "checkin");
        }
    });

});
