/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import * as path from "path";
import { Strings } from "../../../src/helpers/strings";
import { Add } from "../../../src/tfvc/commands/add";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";

describe("Tfvc-AddCommand", function() {
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
        new Add(undefined, localPaths);
    });

    it("should verify constructor - mac/linux", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Add(undefined, localPaths);
    });

    it("should verify constructor with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        new Add(context, localPaths);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new Add(undefined, undefined), TfvcError, /Argument is required/);
    });

    it("should verify arguments", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Add = new Add(undefined, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "add -noprompt " + localPaths[0]);
    });

    it("should verify arguments with context", function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md"];
        let cmd: Add = new Add(context, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "add -noprompt -collection:" + collectionUrl + " ******** " + localPaths[0]);
    });

    it("should verify parse output - no files to add", async function() {
        let localPaths: string[] = ["/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/file-does-not-exist.md"];
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "No arguments matched any files to add.",
            stderr: undefined
        };

        let filesAdded: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesAdded.length, 0);
    });

    it("should verify parse output - single empty folder - no errors", async function() {
        let localPaths: string[] = ["empty-folder"];
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "empty-folder:\n" +
                    "empty-folder\n",
            stderr: undefined
        };

        let filesAdded: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesAdded.length, 1);
        //In this case, the CLC returns:
        //empty-folder:
        //empty-folder
        //So we will have to return empty-folder\empty-folder.  Not ideal but let's ensure we're getting that.
        assert.equal(filesAdded[0], path.join(localPaths[0], localPaths[0]));
    });

    it("should verify parse output - single folder+file - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "file1.txt")];
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "folder1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        let filesAdded: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesAdded.length, 1);
        assert.equal(filesAdded[0], localPaths[0]);
    });

    it("should verify parse output - single subfolder+file - no errors", async function() {
        let localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: path.join("folder1", "folder2") + ":\n" +
                    "file2.txt\n",
            stderr: undefined
        };

        let filesAdded: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesAdded.length, 1);
        assert.equal(filesAdded[0], localPaths[0]);
    });

    it("should verify parse output - single folder+file - spaces - no errors", async function() {
        let localPaths: string[] = [path.join("fold er1", "file1.txt")];
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "fold er1:\n" +
                    "file1.txt\n",
            stderr: undefined
        };

        let filesAdded: string[] = await cmd.ParseOutput(executionResult);
        assert.equal(filesAdded.length, 1);
        assert.equal(filesAdded[0], localPaths[0]);
    });

    it("should verify parse output - error exit code, stdout", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "add");
            assert.equal(err.message.indexOf(Strings.TfExecFailedError), 0);
            assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
        }
    });

    it("should verify parse output - error exit code, stderr", async function() {
        let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
        let localPaths: string[] = noChangesPaths;
        let cmd: Add = new Add(undefined, localPaths);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: undefined,
            stderr: "Something bad this way comes."
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "add");
            assert.equal(err.message.indexOf(Strings.TfExecFailedError), 0);
            assert.equal(err.stderr.indexOf("Something bad this way comes."), 0);
        }
    });

});
