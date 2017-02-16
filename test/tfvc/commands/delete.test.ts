/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";
import { Delete } from "../../../src/tfvc/commands/delete";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-DeleteCommand", function() {
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

    it("should verify constructor - windows", function() {
        let localPaths: string[] = ["c:\\repos\\Tfvc.L2VSCodeExtension.RC\\README.md"];
        new Delete(undefined, localPaths);
    });

    it("should verify constructor - mac/linux", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Delete(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Delete(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Delete(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify arguments", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Delete = new Delete(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "delete -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Delete = new Delete(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "delete -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify parse output - single file - no errors", async function() {
        let localPaths: string[] = ["README.md"];
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "README.md\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], "README.md");
    });

    it("should verify parse output - single empty folder - no errors", async function() {
        let localPaths: string[] = ["empty-folder"];
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "empty-folder:\n" +
                    "empty-folder\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        //In this case, the CLC returns:
        //empty-folder:
        //empty-folder
        //So we will have to return empty-folder\empty-folder.  Not ideal but let's ensure we're getting that.
        assert.equal(filesDeleted[0], path.join(localPaths[0], localPaths[0]));
    });

    it("should verify parse output - single folder+file - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "file1.txt")];
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "file2.txt\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - single folder+file - spaces - no errors", async function() {
        let localPaths: string[] = [path.join("fold er1", "file1.txt")];
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - multiple files", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "file1.txt") + ":\n" +
                "file1.txt\n" +
                path.join("folder2", "file2.txt") + ":\n" +
                "file2.txt\n",
            stderr: undefined
        };

        let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.isDefined(filesDeleted);
        assert.equal(filesDeleted.length, 2);
    });

    it("should verify parse output - error exit code", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "delete");
            assert.equal(err.message.indexOf("Something bad this way comes."), 0);
            assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
        }
    });

    // TF203069: $/L2.VSCodeExtension.RC/folder1/folder2 could not be deleted because that change conflicts with one or more other pending changes to that item. To delete it, undo all pending changes to that item, delete it, and then check in the change.
    // No arguments matched any files to delete.
    it("should verify parse output - deletion conflict - error exit code", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "folder2")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "// TF203069: $/L2.VSCodeExtension.RC/folder1/folder2 could not be deleted because that change " +
                "conflicts with one or more other pending changes to that item. To delete it, undo all pending changes " +
                "to that item, delete it, and then check in the change.\n" +
                "No arguments matched any files to delete.\n",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.equal(err.tfvcCommand, "delete");
            assert.isAtLeast(err.stdout.indexOf("TF203069: "), 0);
            assert.isAtLeast(err.stdout.indexOf("No arguments matched any files to delete"), 0);
        }
    });

    //The item C:\repos\Tfvc.L2VSCodeExtension.RC\folder1\folder2\foo.txt could not be found in your workspace, or you do not have permission to access it.
    //No arguments matched any files to delete.
    it("should verify parse output - delete a file that doesn't exist - error exit code", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "folder2", "foo.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Delete = new Delete(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 100,
            stdout: "The item C:\\repos\\Tfvc.L2VSCodeExtension.RC\\folder1\\folder2\\foo.txt could not be found in your workspace, or you do not have permission to access it.\n" +
                "No arguments matched any files to delete.\n",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 100);
            assert.equal(err.tfvcCommand, "delete");
            assert.isAtLeast(err.stdout.indexOf("could not be found in your workspace"), 0);
            assert.isAtLeast(err.stdout.indexOf("No arguments matched any files to delete"), 0);
        }
    });
});
