/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Strings } from "../../../src/helpers/strings";
import { TfvcError, TfvcErrorCodes } from "../../../src/tfvc/tfvcerror";
import { FindWorkspace } from "../../../src/tfvc/commands/findworkspace";
import { IExecutionResult, IWorkspace } from "../../../src/tfvc/interfaces";

describe("Tfvc-FindWorkspaceCommand", function() {

    beforeEach(function() {
        //
    });

    it("should verify constructor", function() {
        const localPath: string = "/path/to/workspace";
        new FindWorkspace(localPath);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new FindWorkspace(undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        assert.deepEqual(cmd.GetOptions(), { cwd: "/path/to/workspace" });
    });

    it("should verify GetExeOptions", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        assert.deepEqual(cmd.GetExeOptions(), { cwd: "/path/to/workspace" });
    });

    it("should verify arguments", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "workfold -noprompt ********");
    });

    it("should verify GetExeArguments", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "workfold -noprompt ********");
    });

    it("should verify working folder", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetOptions().cwd, localPath);
    });

    it("should verify EXE working folder", function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetExeOptions().cwd, localPath);
    });

    it("should verify parse output - no output", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace, undefined);
    });

    it("should verify parse output - no errors", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
        assert.isFalse(workspace.mappings[0].cloaked);
        assert.equal(workspace.mappings[0].localPath, `/path`);
        assert.equal(workspace.mappings[0].serverPath, `$/project1`);
    });

    it("should verify parse output - no errors - cloaked folders - entire project cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                " (cloaked) $/project2\n" +
                "$/project3: /path3",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 3);
        assert.isTrue(workspace.mappings[1].cloaked);
        assert.isUndefined(workspace.mappings[1].localPath);
        assert.equal(workspace.mappings[1].serverPath, `$/project2`);
    });

    it("should verify parse output - no errors - cloaked folders - middle project sub-folder cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2\n" +
                " (cloaked) $/project2/main:\n" +
                "$/project3: /path3",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 4);
        assert.isTrue(workspace.mappings[2].cloaked);
        assert.isUndefined(workspace.mappings[2].localPath);
        assert.equal(workspace.mappings[2].serverPath, `$/project2/main`);
    });

    it("should verify parse output - no errors - cloaked folders - last project sub-folder cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2\n" +
                "$/project3: /path3\n" +
                "$/project4: /path4\n" +
                " (cloaked) $/project4/main:",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 5);
        assert.isTrue(workspace.mappings[4].cloaked);
        assert.isUndefined(workspace.mappings[4].localPath);
        assert.equal(workspace.mappings[4].serverPath, `$/project4/main`);
    });

    it("should verify parse output - German - no 'workspace' and 'collection'", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Arbeitsbereich: DESKTOP-KI56MCL (Jeff Young (TFS))\n" +
                "Sammlung      : http://java-tfs2015:8081/tfs/defaultcollection\n" +
                "$/project1: /path",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
        }
    });

    it("should verify parse output - not a tf workspace", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: "An argument error occurred: The workspace could not be determined from any argument paths or the current working directory."
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoWorkspaceMappings));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotATfvcRepository);
        }
    });

    it("should verify parse output - no mappings error", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoWorkspaceMappings));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotATfvcRepository);
        }
    });

    it("should verify parse output - no errors - restrictWorkspace", async function() {
        const localPath: string = "/path2/to/workspace/project2";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 2);
    });

    //The CLC will always return *all* server mappings in the workspace even if you pass a particular local folder
    //TF.exe will only return the server mappings in the workspace that apply to the particular local folder
    it("should verify parse output - no errors - restrictWorkspace - sub-folder", async function() {
        const localPath: string = "/path2/to/workspace/project2/sub-folder";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 2);
    });

    it("should verify parse output - no errors - restrictWorkspace - sub-folder - Windows path", async function() {
        const localPath: string = "c:\\path2\\to\\workspace\\project2\\sub-folder\\";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: c:\\path\n" +
                "$/project2: c:\\path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 2);
    });

    it("should verify parse output - no errors - encoded output", async function() {
        const localPath: string = "/path/to/workspace/project1";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/spaces%20in%20the%20name/\n" +
                "$/project1: /path",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/spaces in the name/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace, undefined);
    });

    it("should verify parse EXE output - no errors", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout:
                "=============================================================================\n" +
                "Workspace : MyWorkspace (Jason Prickett)\n" +
                "Collection: http://server:8080/tfs/\n" +
                " $/project1/subfolder: /path\n",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    it("should verify parse EXE output - no errors - cloaked folders - entire project cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                " (cloaked) $/project2\n" +
                "$/project3: /path3",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 3);
        assert.isTrue(workspace.mappings[1].cloaked);
        assert.isUndefined(workspace.mappings[1].localPath);
        assert.equal(workspace.mappings[1].serverPath, `$/project2`);
    });

    it("should verify parse EXE output - no errors - cloaked folders - middle project sub-folder cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2\n" +
                " (cloaked) $/project2/main:\n" +
                "$/project3: /path3",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 4);
        assert.isTrue(workspace.mappings[2].cloaked);
        assert.isUndefined(workspace.mappings[2].localPath);
        assert.equal(workspace.mappings[2].serverPath, `$/project2/main`);
    });

    it("should verify parse EXE output - no errors - cloaked folders - last project sub-folder cloaked", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2\n" +
                "$/project3: /path3\n" +
                "$/project4: /path4\n" +
                " (cloaked) $/project4/main:",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 5);
        assert.isTrue(workspace.mappings[4].cloaked);
        assert.isUndefined(workspace.mappings[4].localPath);
        assert.equal(workspace.mappings[4].serverPath, `$/project4/main`);
    });

    it("should verify parse EXE output - German - no 'workspace' and 'collection'", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Arbeitsbereich: DESKTOP-KI56MCL (Jeff Young (TFS))\n" +
                "Sammlung      : http://java-tfs2015:8081/tfs/defaultcollection\n" +
                "$/project1: /path",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
        }
    });

    it("should verify parse EXE output - not a tf workspace", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: "Unable to determine the source control server."
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoWorkspaceMappings));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotATfvcRepository);
        }
    });

    it("should verify parse EXE output - no mappings error", async function() {
        const localPath: string = "/path/to/workspace";
        const cmd: FindWorkspace = new FindWorkspace(localPath);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout:
                "=============================================================================\n" +
                "Workspace : MyWorkspace (Jason Prickett)\n" +
                "Collection: http://server:8080/tfs/\n",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.isTrue(err.message.startsWith(Strings.NoWorkspaceMappings));
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotATfvcRepository);
        }
    });

    it("should verify parse EXE output - no errors - restrictWorkspace", async function() {
        const localPath: string = "/path2/to/workspace/project2";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path\n" +
                "$/project2: /path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 2);
    });

    it("should verify parse EXE output - no errors - restrictWorkspace - sub-folder", async function() {
        const localPath: string = "/path2/to/workspace/project2/sub-folder";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        //TF.exe won't return "$/project1: /path1" if it's in the overall workspace (see the CLC test of the same scenario, above)
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project2: /path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    it("should verify parse EXE output - no errors - restrictWorkspace - sub-folder - Windows path", async function() {
        const localPath: string = "c:\\path2\\to\\workspace\\project2\\sub-folder\\";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        //TF.exe won't return "$/project1: c:\\path1" if it's in the overall workspace (see the CLC test of the same scenario, earlier)
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project2: c:\\path2",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        //This test should find project2 as the team project since the localPath contains project2 and we have restrictWorkspace
        assert.equal(workspace.defaultTeamProject, "project2");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    it("should verify parse EXE output - no errors - encoded output", async function() {
        const localPath: string = "/path/to/workspace/project1";
        const cmd: FindWorkspace = new FindWorkspace(localPath, true);
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/spaces%20in%20the%20name/\n" +
                "$/project1: /path",
            stderr: undefined
        };

        const workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/spaces in the name/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });
});
