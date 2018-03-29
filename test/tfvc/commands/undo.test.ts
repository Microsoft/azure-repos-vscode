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

    //new Undo(this._serverContext, itemPaths));

    it("should verify constructor - windows", function() {
        const localPaths: string[] = ["c:\\repos\\Tfvc.L2VSCodeExtension.RC\\README.md"];
        new Undo(undefined, localPaths);
    });

    it("should verify constructor - mac/linux", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Undo(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Undo(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Undo(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(context, localPaths);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(context, localPaths);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify UndoAll arguments", function() {
        const localPaths: string[] = ["*"];
        const cmd: Undo = new Undo(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt . -recursive");
    });

    it("should verify UndoAll arguments with context", function() {
        const localPaths: string[] = ["*"];
        const cmd: Undo = new Undo(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "undo -noprompt -collection:" + collectionUrl + " ******** . -recursive");
    });

    it("should verify GetExeArguments", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "undo -noprompt " + localPaths[0]);
    });

    it("should verify GetExeArguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(context, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "undo -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify GetExeArguments UndoAll arguments", function() {
        const localPaths: string[] = ["*"];
        const cmd: Undo = new Undo(undefined, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "undo -noprompt . -recursive");
    });

    it("should verify GetExeArguments UndoAll arguments with context", function() {
        const localPaths: string[] = ["*"];
        const cmd: Undo = new Undo(context, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "undo -noprompt -collection:" + collectionUrl + " ******** . -recursive");
    });

    it("should verify parse output - no output", async function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse output - single file edit - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing edit: README.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse output - single file add - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing add: README.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse output - multiple file add - no errors", async function() {
        const localPaths: string[] = ["README.md", "README2.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing add: README.md\n" +
                    "Undoing add: README2.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 2);
        assert.equal(filesUndone[0], "README.md");
        assert.equal(filesUndone[1], "README2.md");
    });

    it("should verify parse output - single folder+file edit - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "file1.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file add - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single folder+file edit - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "file1.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file add - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "fol der2", "file2.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("fold er1", "fol der2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    //If we have at least 1 file undone but at least 1 with no pending changes, exit code is 1
    //Proceed normally but ignore the files that have no pending changes.
    it("should verify parse output - multiple files - several no pending changes", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = ["README.md"].concat(noChangesPaths);
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "Undoing add: README.md\n" +
                "No pending changes were found for " + noChangesPaths[0] + "\n" +
                "No pending changes were found for " + noChangesPaths[1] + "\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    //If all files have no pending changes, exit code is 100 but we don't want to fail
    it("should verify parse output - multiple files - all no pending changes", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "" +
                "No pending changes were found for " + noChangesPaths[0] + "\n" +
                "No pending changes were found for " + noChangesPaths[1] + "\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseOutput(executionResult);
        assert.isDefined(filesUndone);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse output - error exit code", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
        }
    });

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse EXE output - single file edit - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing edit: README.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse EXE output - single file add - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing add: README.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    it("should verify parse EXE output - multiple file add - no errors", async function() {
        const localPaths: string[] = ["README.md", "README2.md"];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Undoing add: README.md\n" +
                    "Undoing add: README2.md\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 2);
        assert.equal(filesUndone[0], "README.md");
        assert.equal(filesUndone[1], "README2.md");
    });

    it("should verify parse EXE output - single folder+file edit - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "file1.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse EXE output - single subfolder+file add - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse EXE output - single folder+file edit - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "file1.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "Undoing edit: file1.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    it("should verify parse EXE output - single subfolder+file add - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "fol der2", "file2.txt")];
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("fold er1", "fol der2") + ":\n" +
                    "Undoing edit: file2.txt\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], localPaths[0]);
    });

    //If we have at least 1 file undone but at least 1 with no pending changes, exit code is 1
    //Proceed normally but ignore the files that have no pending changes.
    it("should verify parse EXE output - multiple files - several no pending changes", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = ["README.md"].concat(noChangesPaths);
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "Undoing add: README.md\n" +
                "No pending changes were found for " + noChangesPaths[0] + ".\n" +
                "No pending changes were found for " + noChangesPaths[1] + ".\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesUndone.length, 1);
        assert.equal(filesUndone[0], "README.md");
    });

    //If all files have no pending changes, exit code is 100 but we don't want to fail
    it("should verify parse EXE output - multiple files - all no pending changes", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "" +
                "No pending changes were found for " + noChangesPaths[0] + ".\n" +
                "No pending changes were found for " + noChangesPaths[1] + ".\n",
            stderr: undefined
        };

        const filesUndone: string[] = await cmd.ParseExeOutput(executionResult);
        assert.isDefined(filesUndone);
        assert.equal(filesUndone.length, 0);
    });

    it("should verify parse EXE output - error exit code", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Undo = new Undo(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
        }
    });
});
