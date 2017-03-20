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
        let localPath: string = "/path/to/workspace";
        new FindWorkspace(localPath);
    });

    it("should verify constructor - undefined args", function() {
        assert.throws(() => new FindWorkspace(undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetOptions", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        assert.deepEqual(cmd.GetOptions(), { cwd: "/path/to/workspace" });
    });

    it("should verify GetExeOptions", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        assert.deepEqual(cmd.GetExeOptions(), { cwd: "/path/to/workspace" });
    });

    it("should verify arguments", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "workfold -noprompt ********");
    });

    it("should verify GetExeArguments", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "workfold -noprompt ********");
    });

    it("should verify working folder", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetOptions().cwd, localPath);
    });

    it("should verify EXE working folder", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetExeOptions().cwd, localPath);
    });

    it("should verify parse output - no output", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace, undefined);
    });

    it("should verify parse output - no errors", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "=====================================================================================================================================================\n" +
                "Workspace:  MyWorkspace\n" +
                "Collection: http://server:8080/tfs/\n" +
                "$/project1: /path",
            stderr: undefined
        };

        let workspace: IWorkspace = await cmd.ParseOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    it("should verify parse output - German - no 'workspace' and 'collection'", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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

    /***********************************************************************************************
     * The methods below are duplicates of the parse output methods but call the parseExeOutput.
     ***********************************************************************************************/

    it("should verify parse EXE output - no output", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: undefined,
            stderr: undefined
        };

        let workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace, undefined);
    });

    it("should verify parse EXE output - no errors", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout:
                "=============================================================================\n" +
                "Workspace : MyWorkspace (Jason Prickett)\n" +
                "Collection: http://server:8080/tfs/\n" +
                " $/project1/subfolder: /path\n",
            stderr: undefined
        };

        let workspace: IWorkspace = await cmd.ParseExeOutput(executionResult);
        assert.equal(workspace.name, "MyWorkspace");
        assert.equal(workspace.server, "http://server:8080/tfs/");
        assert.equal(workspace.defaultTeamProject, "project1");
        assert.equal(workspace.comment, undefined);
        assert.equal(workspace.computer, undefined);
        assert.equal(workspace.owner, undefined);
        assert.equal(workspace.mappings.length, 1);
    });

    it("should verify parse EXE output - German - no 'workspace' and 'collection'", async function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);
        let executionResult: IExecutionResult = {
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
});
