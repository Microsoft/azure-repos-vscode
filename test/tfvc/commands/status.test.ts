/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Status } from "../../../src/tfvc/commands/status";
import { IPendingChange, IExecutionResult } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";
import { Strings } from "../../../src/helpers/strings";

describe("Tfvc-StatusCommand", function() {
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
        const localPaths: string[] = ["/path/to/workspace"];
        new Status(undefined, true, localPaths);
    });

    it("should verify constructor - no paths", function() {
        new Status(undefined, true);
    });

    it("should verify constructor with context", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        new Status(context, true, localPaths);
    });

    it("should verify constructor with context - no paths", function() {
        new Status(context, true);
    });

    it("should verify GetOptions", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "status -noprompt -format:xml -recursive " + localPaths[0]);
    });

    it("should verify Exe arguments", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "status -noprompt -format:detailed -recursive " + localPaths[0]);
    });

    it("should verify arguments - no paths", function() {
        const cmd: Status = new Status(undefined, true);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "status -noprompt -format:xml -recursive");
    });

    it("should verify Exe arguments - no paths", function() {
        const cmd: Status = new Status(undefined, true);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "status -noprompt -format:detailed -recursive");
    });

    it("should verify arguments - multiple paths", function() {
        const localPaths: string[] = ["/path/to/workspace", "/path/to/workspace2"];
        const cmd: Status = new Status(undefined, true, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "status -noprompt -format:xml -recursive " + localPaths[0] + " " + localPaths[1]);
    });

    it("should verify Exe arguments - multiple paths", function() {
        const localPaths: string[] = ["/path/to/workspace", "/path/to/workspace2"];
        const cmd: Status = new Status(undefined, true, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "status -noprompt -format:detailed -recursive " + localPaths[0] + " " + localPaths[1]);
    });

    it("should verify arguments with context", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(context, true, localPaths);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "status -noprompt -collection:" + collectionUrl + " ******** -format:xml -recursive " + localPaths[0]);
    });

    it("should verify Exe arguments with context", function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(context, true, localPaths);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "status -noprompt -collection:" + collectionUrl + " ******** -format:detailed -recursive " + localPaths[0]);
    });

    it("should verify parse output - no output", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseOutput(executionResult);
        assert.equal(changes.length, 0);
    });

    it("should verify parse Exe output - no output", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 0);
    });

    it("should verify parse output - valid json", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const stdout: string = `<?xml version="1.0" encoding="utf-8"?>
     <status>
     <pending-changes>
     <pending-change server-item="$/tfsTest_03/Folder333/DemandEquals_renamed.java" version="217" owner="NORTHAMERICA\\jpricket" date="2017-02-08T11:12:06.766-0500" lock="none" change-type="rename" workspace="Folder1_00" source-item="$/tfsTest_03/Folder333/DemandEquals.java" computer="JPRICKET-DEV2" local-item="/tmp/tfsTest03_44/Folder333/DemandEquals_renamed.java" file-type="windows-1252"/>
     </pending-changes>
     <candidate-pending-changes>
     <pending-change server-item="$/tfsTest_01/test.txt" version="0" owner="jason" date="2016-07-13T12:36:51.060-0400" lock="none" change-type="add" workspace="Folder1_00" computer="JPRICKET-DEV2" local-item="/tmp/test/test.txt"/>
     </candidate-pending-changes>
     </status>`;

        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: `${stdout}`,
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseOutput(executionResult);
        assert.equal(changes.length, 2);
        assert.equal(changes[0].changeType, "rename");
        assert.equal(changes[0].computer, "JPRICKET-DEV2");
        assert.equal(changes[0].date, "2017-02-08T11:12:06.766-0500");
        assert.isFalse(changes[0].isCandidate);
        assert.equal(changes[0].localItem, "/tmp/tfsTest03_44/Folder333/DemandEquals_renamed.java");
        assert.equal(changes[0].lock, "none");
        assert.equal(changes[0].owner, "NORTHAMERICA\\jpricket");
        assert.equal(changes[0].serverItem, "$/tfsTest_03/Folder333/DemandEquals_renamed.java");
        assert.equal(changes[0].sourceItem, "$/tfsTest_03/Folder333/DemandEquals.java");
        assert.equal(changes[0].version, "217");
        assert.equal(changes[0].workspace, "Folder1_00");

        assert.equal(changes[1].changeType, "add");
        assert.equal(changes[1].computer, "JPRICKET-DEV2");
        assert.equal(changes[1].date, "2016-07-13T12:36:51.060-0400");
        assert.isTrue(changes[1].isCandidate);
        assert.equal(changes[1].localItem, "/tmp/test/test.txt");
        assert.equal(changes[1].lock, "none");
        assert.equal(changes[1].owner, "jason");
        assert.equal(changes[1].serverItem, "$/tfsTest_01/test.txt");
        assert.isUndefined(changes[1].sourceItem);  //It's not a rename
        assert.equal(changes[1].version, "0");
        assert.equal(changes[1].workspace, "Folder1_00");
    });

    it("should verify parse Exe output - pending changes only - no errors", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "$/jeyou/README.md;C19\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : edit\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\README.md\n" +
                    "  File type  : utf-8\n" +
                    "\n" +
                    "  1 change(s), 0 detected change(s)\n",
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 1);
        assert.equal(changes[0].changeType, "edit");
        assert.equal(changes[0].computer, "JEYOU-DEV00");
        assert.equal(changes[0].date, "Wednesday, February 22, 2017 1:47:26 PM");
        assert.isFalse(changes[0].isCandidate);
        assert.equal(changes[0].localItem, "C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\README.md");
        assert.equal(changes[0].lock, "none");
        assert.equal(changes[0].owner, "Jeff Young (TFS)");
        assert.equal(changes[0].serverItem, "$/jeyou/README.md");
        assert.isUndefined(changes[0].sourceItem);  //It's not a rename
        assert.equal(changes[0].version, "19");
        assert.equal(changes[0].workspace, "jeyou-dev00-tfexe-OnPrem");
    });

    it("should verify parse Exe output - pending and detected changes - no errors", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "$/jeyou/README.md;C19\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : edit\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\README.md\n" +
                    "  File type  : utf-8\n" +
                    "\n" +
                    "-----------------\n" +
                    "Detected Changes:\n" +
                    "-----------------\n" +
                    "$/jeyou/therightstuff.txt\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : add\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\therightstuff.txt\n" +
                    "\n" +
                    "  1 change(s), 1 detected change(s)\n",
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 2);
        assert.equal(changes[0].changeType, "edit");
        assert.equal(changes[0].computer, "JEYOU-DEV00");
        assert.equal(changes[0].date, "Wednesday, February 22, 2017 1:47:26 PM");
        assert.isFalse(changes[0].isCandidate);
        assert.equal(changes[0].localItem, "C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\README.md");
        assert.equal(changes[0].lock, "none");
        assert.equal(changes[0].owner, "Jeff Young (TFS)");
        assert.equal(changes[0].serverItem, "$/jeyou/README.md");
        assert.isUndefined(changes[0].sourceItem);  //It's not a rename
        assert.equal(changes[0].version, "19");
        assert.equal(changes[0].workspace, "jeyou-dev00-tfexe-OnPrem");
        assert.equal(changes[1].changeType, "add");
        assert.equal(changes[1].computer, "JEYOU-DEV00");
        assert.equal(changes[1].date, "Wednesday, February 22, 2017 1:47:26 PM");
        assert.isTrue(changes[1].isCandidate);
        assert.equal(changes[1].localItem, "C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\therightstuff.txt");
        assert.equal(changes[1].lock, "none");
        assert.equal(changes[1].owner, "Jeff Young (TFS)");
        assert.equal(changes[1].serverItem, "$/jeyou/therightstuff.txt");
        assert.isUndefined(changes[1].sourceItem);  //It's not a rename
        assert.equal(changes[1].version, "0");
        assert.equal(changes[1].workspace, "jeyou-dev00-tfexe-OnPrem");
    });

    it("should verify parse Exe output - detected changes only - no errors", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "-----------------\n" +
                    "Detected Changes:\n" +
                    "-----------------\n" +
                    "$/jeyou/therightstuff.txt\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : add\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\therightstuff.txt\n" +
                    "\n" +
                    "  0 change(s), 1 detected change(s)\n",
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 1);
        assert.equal(changes[0].changeType, "add");
        assert.equal(changes[0].computer, "JEYOU-DEV00");
        assert.equal(changes[0].date, "Wednesday, February 22, 2017 1:47:26 PM");
        assert.isTrue(changes[0].isCandidate);
        assert.equal(changes[0].localItem, "C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\therightstuff.txt");
        assert.equal(changes[0].lock, "none");
        assert.equal(changes[0].owner, "Jeff Young (TFS)");
        assert.equal(changes[0].serverItem, "$/jeyou/therightstuff.txt");
        assert.isUndefined(changes[0].sourceItem);  //It's not a rename
        assert.equal(changes[0].version, "0");
        assert.equal(changes[0].workspace, "jeyou-dev00-tfexe-OnPrem");
    });

    it("should verify parse Exe output - multiple pending and multiple detected changes - no errors", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "$/jeyou/README.md;C19\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : edit\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\README.md\n" +
                    "  File type  : utf-8\n" +
                    "\n" +
                    "$/jeyou/folder1/READU.md;C42\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : edit\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\folder1\\READU.md\n" +
                    "  File type  : utf-8\n" +
                    "\n" +
                    "-----------------\n" +
                    "Detected Changes:\n" +
                    "-----------------\n" +
                    "$/jeyou/therightstuff.txt\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : add\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\therightstuff.txt\n" +
                    "\n" +
                    "$/jeyou/folder1/nkotb.txt\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : add\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\folder1\\nkotb.txt\n" +
                    "\n" +
                    "  2 change(s), 2 detected change(s)\n",
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 4);
        //Other tests verify the actual values (so skip them here)
    });

    it("should verify parse Exe output - pending rename only - no errors", async function() {
        const localPaths: string[] = ["/path/to/workspace"];
        const cmd: Status = new Status(undefined, true, localPaths);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "$/jeyou/READU.md;C19\n" +
                    "  User       : Jeff Young (TFS)\n" +
                    "  Date       : Wednesday, February 22, 2017 1:47:26 PM\n" +
                    "  Lock       : none\n" +
                    "  Change     : rename\n" +
                    "  Workspace  : jeyou-dev00-tfexe-OnPrem\n" +
                    "  Source item: $/jeyou/README.md\n" +
                    "  Local item : [JEYOU-DEV00] C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\READU.md\n" +
                    "  File type  : utf-8\n" +
                    "\n" +
                    "  1 change(s), 0 detected change(s)\n",
            stderr: undefined
        };

        const changes: IPendingChange[] = await cmd.ParseExeOutput(executionResult);
        assert.equal(changes.length, 1);
        assert.equal(changes[0].changeType, "rename");
        assert.equal(changes[0].computer, "JEYOU-DEV00");
        assert.equal(changes[0].date, "Wednesday, February 22, 2017 1:47:26 PM");
        assert.isFalse(changes[0].isCandidate);
        assert.equal(changes[0].localItem, "C:\\repos\\TfExe.Tfvc.L2VSCodeExtension.RC.TFS\\READU.md");
        assert.equal(changes[0].lock, "none");
        assert.equal(changes[0].owner, "Jeff Young (TFS)");
        assert.equal(changes[0].serverItem, "$/jeyou/READU.md");
        assert.equal(changes[0].sourceItem, "$/jeyou/README.md");
        assert.equal(changes[0].version, "19");
        assert.equal(changes[0].workspace, "jeyou-dev00-tfexe-OnPrem");
    });

    it("should verify parse output - error exit code", async function() {
        const localPaths: string[] = ["folder1/file1.txt", "folder2/file2.txt"];
        const cmd: Status = new Status(undefined, true, localPaths);
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

    it("should verify parse Exe output - error exit code", async function() {
        const localPaths: string[] = ["folder1/file1.txt", "folder2/file2.txt"];
        const cmd: Status = new Status(undefined, true, localPaths);
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
