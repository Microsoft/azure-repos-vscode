/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
//import * as path from "path";
import { GetFileContent } from "../../../src/tfvc/commands/getfilecontent";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";
import { Strings } from "../../../src/helpers/strings";

describe("Tfvc-GetFileContentCommand", function() {
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
        let localPath: string = "c:\\repos\\Tfvc.L2VSCodeExtension.RC\\README.md";
        new GetFileContent(undefined, localPath);
    });

    it("should verify constructor - mac/linux", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        new GetFileContent(undefined, localPath);
    });

    it("should verify constructor with context", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        new GetFileContent(context, localPath);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new GetFileContent(undefined, undefined), TfvcError, /Argument is required/);
    });

//TODO: Test when versionSpec is passed, TEst when ignore is passed

    it("should verify GetOptions", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetArguments", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "print -noprompt " + localPath);
    });

    it("should verify GetArguments with context", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(context, localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "print -noprompt -collection:" + collectionUrl + " ******** " + localPath);
    });

    it("should verify GetArguments + versionSpec", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath, "42");

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "print -noprompt " + localPath + " -version:42");
    });

    it("should verify GetArguments + versionSpec with context", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(context, localPath, "42");

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "print -noprompt -collection:" + collectionUrl + " ******** " + localPath + " -version:42");
    });

//
//
//
//
//
    it("should verify GetExeOptions", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify GetExeArguments", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "view -noprompt " + localPath);
    });

    it("should verify GetExeArguments with context", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(context, localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "view -noprompt -collection:" + collectionUrl + " ******** " + localPath);
    });

    it("should verify GetExeArguments + versionSpec", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath, "42");

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "view -noprompt " + localPath + " -version:42");
    });

    it("should verify GetExeArguments + versionSpec with context", function() {
        let localPath: string = "/usr/alias/repos/Tfvc.L2VSCodeExtension.RC/README.md";
        let cmd: GetFileContent = new GetFileContent(context, localPath, "42");

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "view -noprompt -collection:" + collectionUrl + " ******** " + localPath + " -version:42");
    });

    it("should verify parse output - single file - no errors", async function() {
        let localPath: string = "README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        let fileContent: string = "This is the content of the README.md file\n...and I mean that.\n";
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: fileContent,
            stderr: undefined
        };

        let content: string = await cmd.ParseOutput(executionResult);
        assert.equal(content, fileContent);
    });

    it("should verify parse output - no file matches", async function() {
        let localPath: string = "folder1/file1.txt";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath, undefined, true); //ignoring file not found
        let executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: undefined,
            stderr: "No file matches what you passed."
        };

        let content: string = await cmd.ParseOutput(executionResult);
        assert.equal(content, "");
    });

    it("should verify parse output - file doesn't exist", async function() {
        let localPath: string = "folder1/file1.txt";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath, "66", true); //ignoring file not found
        let executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: undefined,
            stderr: "The specified file does not exist at the specified version or something..."
        };

        let content: string = await cmd.ParseOutput(executionResult);
        assert.equal(content, "");
    });

    it("should verify parse output - error exit code", async function() {
        let localPath: string = "folder1/file1.txt";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "print");
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            assert.isTrue(err.stdout.startsWith("Something bad this way comes."));
        }
    });

    it("should verify parse Exe output - single file - no errors", async function() {
        let localPath: string = "README.md";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        let fileContent: string = "This is the content of the README.md file\n...and I mean that.\n";
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: fileContent,
            stderr: undefined
        };

        let content: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(content, fileContent);
    });

    it("should verify parse Exe output - error exit code", async function() {
        let localPath: string = "folder1/file1.txt";
        let cmd: GetFileContent = new GetFileContent(undefined, localPath);
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            //ParseExeOutput calls GetArguments via ParseOutput (so 'print' is returned instead of 'view')
            assert.equal(err.tfvcCommand, "print");
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            assert.isTrue(err.stdout.startsWith("Something bad this way comes."));
        }
    });

    // it("should verify parse output - single empty folder - no errors", async function() {
    //     let localPaths: string[] = ["empty-folder"];
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 0,
    //         stdout: "empty-folder:\n" +
    //                 "empty-folder\n",
    //         stderr: undefined
    //     };

    //     let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
    //     assert.equal(filesDeleted.length, 1);
    //     //In this case, the CLC returns:
    //     //empty-folder:
    //     //empty-folder
    //     //So we will have to return empty-folder\empty-folder.  Not ideal but let's ensure we're getting that.
    //     assert.equal(filesDeleted[0], path.join(localPaths[0], localPaths[0]));
    // });

    // it("should verify parse output - single folder+file - no errors", async function() {
    //     let localPaths: string[] = [path.join("folder1", "file1.txt")];
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 0,
    //         stdout: "folder1:\n" +
    //                 "file1.txt\n",
    //         stderr: undefined
    //     };

    //     let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
    //     assert.equal(filesDeleted.length, 1);
    //     assert.equal(filesDeleted[0], localPaths[0]);
    // });

    // it("should verify parse output - single subfolder+file - no errors", async function() {
    //     let localPaths: string[] = [path.join("folder1", "folder2", "file2.txt")];
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 0,
    //         stdout: path.join("folder1", "folder2") + ":\n" +
    //                 "file2.txt\n",
    //         stderr: undefined
    //     };

    //     let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
    //     assert.equal(filesDeleted.length, 1);
    //     assert.equal(filesDeleted[0], localPaths[0]);
    // });

    // it("should verify parse output - single folder+file - spaces - no errors", async function() {
    //     let localPaths: string[] = [path.join("fold er1", "file1.txt")];
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 0,
    //         stdout: "fold er1:\n" +
    //                 "file1.txt\n",
    //         stderr: undefined
    //     };

    //     let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
    //     assert.equal(filesDeleted.length, 1);
    //     assert.equal(filesDeleted[0], localPaths[0]);
    // });

    // it("should verify parse output - multiple files", async function() {
    //     let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
    //     let localPaths: string[] = noChangesPaths;
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 0,
    //         stdout: path.join("folder1", "file1.txt") + ":\n" +
    //             "file1.txt\n" +
    //             path.join("folder2", "file2.txt") + ":\n" +
    //             "file2.txt\n",
    //         stderr: undefined
    //     };

    //     let filesDeleted: string[] = await cmd.ParseOutput(executionResult);
    //     assert.isDefined(filesDeleted);
    //     assert.equal(filesDeleted.length, 2);
    // });

    // it("should verify parse output - error exit code", async function() {
    //     let noChangesPaths: string[] = [path.join("folder1", "file1.txt"), path.join("folder2", "file2.txt")];
    //     let localPaths: string[] = noChangesPaths;
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 42,
    //         stdout: "Something bad this way comes.",
    //         stderr: undefined
    //     };

    //     try {
    //         await cmd.ParseOutput(executionResult);
    //     } catch (err) {
    //         assert.equal(err.exitCode, 42);
    //         assert.equal(err.tfvcCommand, "delete");
    //         assert.equal(err.message.indexOf("Something bad this way comes."), 0);
    //         assert.equal(err.stdout.indexOf("Something bad this way comes."), 0);
    //     }
    // });

    // // TF203069: $/L2.VSCodeExtension.RC/folder1/folder2 could not be deleted because that change conflicts with one or more other pending changes to that item. To delete it, undo all pending changes to that item, delete it, and then check in the change.
    // // No arguments matched any files to delete.
    // it("should verify parse output - deletion conflict - error exit code", async function() {
    //     let noChangesPaths: string[] = [path.join("folder1", "folder2")];
    //     let localPaths: string[] = noChangesPaths;
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 100,
    //         stdout: "// TF203069: $/L2.VSCodeExtension.RC/folder1/folder2 could not be deleted because that change " +
    //             "conflicts with one or more other pending changes to that item. To delete it, undo all pending changes " +
    //             "to that item, delete it, and then check in the change.\n" +
    //             "No arguments matched any files to delete.\n",
    //         stderr: undefined
    //     };

    //     try {
    //         await cmd.ParseOutput(executionResult);
    //     } catch (err) {
    //         assert.equal(err.exitCode, 100);
    //         assert.equal(err.tfvcCommand, "delete");
    //         assert.isAtLeast(err.stdout.indexOf("TF203069: "), 0);
    //         assert.isAtLeast(err.stdout.indexOf("No arguments matched any files to delete"), 0);
    //     }
    // });

    // //The item C:\repos\Tfvc.L2VSCodeExtension.RC\folder1\folder2\foo.txt could not be found in your workspace, or you do not have permission to access it.
    // //No arguments matched any files to delete.
    // it("should verify parse output - delete a file that doesn't exist - error exit code", async function() {
    //     let noChangesPaths: string[] = [path.join("folder1", "folder2", "foo.txt")];
    //     let localPaths: string[] = noChangesPaths;
    //     let cmd: Delete = new Delete(undefined, localPaths);
    //     let executionResult: IExecutionResult = {
    //         exitCode: 100,
    //         stdout: "The item C:\\repos\\Tfvc.L2VSCodeExtension.RC\\folder1\\folder2\\foo.txt could not be found in your workspace, or you do not have permission to access it.\n" +
    //             "No arguments matched any files to delete.\n",
    //         stderr: undefined
    //     };

    //     try {
    //         await cmd.ParseOutput(executionResult);
    //     } catch (err) {
    //         assert.equal(err.exitCode, 100);
    //         assert.equal(err.tfvcCommand, "delete");
    //         assert.isAtLeast(err.stdout.indexOf("could not be found in your workspace"), 0);
    //         assert.isAtLeast(err.stdout.indexOf("No arguments matched any files to delete"), 0);
    //     }
    // });
});
