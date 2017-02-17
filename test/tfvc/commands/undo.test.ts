/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";
import { Strings } from "../../../src/helpers/strings";
import { Undo } from "../../../src/tfvc/commands/undo";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-UndoCommand", function() {
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

    //new Undo(this._serverContext, itemPaths));

    it("should verify constructor - windows", function() {
        let localPaths: string[] = ["c:\\repos\\Tfvc.L2VSCodeExtension.RC\\README.md"];
        new Undo(undefined, localPaths);
    });

    it("should verify constructor - mac/linux", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Undo(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Undo(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Undo(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Undo = new Undo(context, localPaths);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify arguments", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Undo = new Undo(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Undo = new Undo(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify parse output - no output", async function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse output - single file edit - no errors", async function() {
        let localPaths: string[] = ["README.md"];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing edit: README.md\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse output - single file add - no errors", async function() {
        let localPaths: string[] = ["README.md"];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing add: README.md\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse output - single folder+file edit - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "file1.txt")];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file add - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single folder+file edit - spaces - no errors", async function() {
        let localPaths: string[] = [path.join("fold er1", "file1.txt")];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file add - spaces - no errors", async function() {
        let localPaths: string[] = [path.join("fold er1", "fol der2", "file2.txt")];
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("fold er1", "fol der2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    //If we have at least 1 file undone but at least 1 with no pending changes, exit code is 1
    //Proceed normally but ignore the files that have no pending changes.
    it("should verify parse output - multiple files - several no pending changes", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = ["README.md"].concat(noChangesPaths);
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "Undoing add: README.md\n" +
                "No pending changes were found for " + noChangesPaths[0] + "\n" +
                "No pending changes were found for " + noChangesPaths[1] + "\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    //If all files have no pending changes, exit code is 100 but we don't want to fail
    it("should verify parse output - multiple files - all no pending changes", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "" +
                "No pending changes were found for " + noChangesPaths[0] + "\n" +
                "No pending changes were found for " + noChangesPaths[1] + "\n",
            stderr: undefined
        };

        let filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.isDefined(filesUndone);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse output - error exit code", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Undo = new Undo(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "undo");
            assert.equal(err.message.indexOf(Strings.TfExecFailedError), 0);
            assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
        }
    });

});
