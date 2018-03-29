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

    it("should verify constructor - windows", function() {
        const localPaths: string[] = ["c:\\repos\\Tfvc.L2VSCodeExtension.RC\\README.md"];
        new Delete(undefined, localPaths);
    });

    it("should verify constructor - mac/linux", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Delete(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Delete(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Delete(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "delete -noprompt " + localPaths[0]);
    });

    it("should verify Exe arguments", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "delete -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "delete -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify Exe arguments with context", function() {
        const localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        const cmd: Delete = new Delete(context, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "delete -noprompt ******** " + localPaths[0]);
    });

    it("should verify parse output - single file - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "README.md\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], "README.md");
    });

    it("should verify parse output - single empty folder - no errors", async function() {
        const localPaths: string[] = ["empty-folder"];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "empty-folder:\n" +
                    "empty-folder\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        //In this case, the CLC returns:
        //empty-folder:
        //empty-folder
        //So we will have to return empty-folder\empty-folder.  Not ideal but let's ensure we're getting that.
        assert.equal(filesDeleted[0], path.join(localPaths[0], localPaths[0]));
    });

    it("should verify parse output - single folder+file - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "file1.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "file2.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - single folder+file - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "file1.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse output - multiple files", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "file1.txt") + ":\n" +
                "file1.txt\n" +
                path.join("folder2", "file2.txt") + ":\n" +
                "file2.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseOutput(executionResult);
        assert.isDefined(filesDeleted);
        assert.equal(filesDeleted.length, 2);
    });

//
//
//
//
    it("should verify parse Exe output - single file - no errors", async function() {
        const localPaths: string[] = ["README.md"];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "README.md\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], "README.md");
    });

    it("should verify parse Exe output - single empty folder - no errors", async function() {
        const localPaths: string[] = ["empty-folder"];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "empty-folder:\n" +
                    "empty-folder\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        //In this case, the CLC returns:
        //empty-folder:
        //empty-folder
        //So we will have to return empty-folder\empty-folder.  Not ideal but let's ensure we're getting that.
        assert.equal(filesDeleted[0], path.join(localPaths[0], localPaths[0]));
    });

    it("should verify parse Exe output - single folder+file - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "file1.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse Exe output - single subfolder+file - no errors", async function() {
        const localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "file2.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse Exe output - single folder+file - spaces - no errors", async function() {
        const localPaths: string[] = [path.join("fold er1", "file1.txt")];
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(filesDeleted.length, 1);
        assert.equal(filesDeleted[0], localPaths[0]);
    });

    it("should verify parse Exe output - multiple files", async function() {
        const noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        const localPaths: string[] = noChangesPaths;
        const cmd: Delete = new Delete(undefined, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "file1.txt") + ":\n" +
                "file1.txt\n" +
                path.join("folder2", "file2.txt") + ":\n" +
                "file2.txt\n",
            stderr: undefined
        };

        const filesDeleted: string[] = await cmd.ParseExeOutput(executionResult);
        assert.isDefined(filesDeleted);
        assert.equal(filesDeleted.length, 2);
    });
});
