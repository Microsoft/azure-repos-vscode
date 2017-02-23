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
        let localPath: string = "/usr/alias/repo1";
        new FindConflicts(undefined, localPath);
    });

    it("should verify constructor with context", function() {
        let localPath: string = "/usr/alias/repo1";
        new FindConflicts(context, localPath);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new FindConflicts(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        let localPath: string = "/usr/alias/repo1";
        let cmd: FindConflicts = new FindConflicts(undefined, localPath);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify arguments", function() {
        let localPath: string = "/usr/alias/repo1";
        let cmd: FindConflicts = new FindConflicts(undefined, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt " + localPath + " -recursive -preview");
    });

    it("should verify arguments with context", function() {
        let localPath: string = "/usr/alias/repo1";
        let cmd: FindConflicts = new FindConflicts(context, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "resolve -noprompt -collection:" + collectionUrl + " ******** " + localPath + " -recursive -preview");
    });

    it("should verify parse output - no output", async function() {
        let localPath: string = "/usr/alias/repo1";
        let cmd: FindConflicts = new FindConflicts(undefined, localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 0);
    });

    it("should verify parse output - one of each type", async function() {
        let localPath: string = "/usr/alias/repo1";
        let cmd: FindConflicts = new FindConflicts(undefined, localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: "contentChange.txt: The item content has changed\n" +
                    "addConflict.txt: Another item with the same name exists on the server\n" +
                    "nameChange.txt: The item name has changed\n" +
                    "nameAndContentChange.txt: The item name and content have changed\n" +
                    "contentChange2.txt: The item content has changed\n" +
                    "deleted.txt: The item has already been deleted\n" +
                    "branchEdit.txt: The source and target both have changes\n" +
                    "branchDelete.txt: The item has been deleted in the target branch"
        };

        let results: IConflict[] = await cmd.ParseOutput(executionResult);
        assert.equal(results.length, 8);
        assert.equal(results[0].localPath, "contentChange.txt");
        assert.equal(results[0].type, ConflictType.CONTENT);
        assert.equal(results[1].localPath, "addConflict.txt");
        assert.equal(results[1].type, ConflictType.CONTENT);
        assert.equal(results[2].localPath, "nameChange.txt");
        assert.equal(results[2].type, ConflictType.RENAME);
        assert.equal(results[3].localPath, "nameAndContentChange.txt");
        assert.equal(results[3].type, ConflictType.NAME_AND_CONTENT);
        assert.equal(results[4].localPath, "contentChange2.txt");
        assert.equal(results[4].type, ConflictType.CONTENT);
        assert.equal(results[5].localPath, "deleted.txt");
        assert.equal(results[5].type, ConflictType.DELETE);
        assert.equal(results[6].localPath, "branchEdit.txt");
        assert.equal(results[6].type, ConflictType.MERGE);
        assert.equal(results[7].localPath, "branchDelete.txt");
        assert.equal(results[7].type, ConflictType.DELETE_TARGET);
    });

    it("should verify parse output - errors - exit code 100", async function() {
        let localPath: string = "/usr/alias/repo 1";
        let cmd: FindConflicts = new FindConflicts(undefined, localPath);
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
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            assert.isTrue(err.stdout.startsWith("Something bad this way comes."));
        }
    });
});
