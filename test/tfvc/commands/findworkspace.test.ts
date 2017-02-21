/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { FindWorkspace } from "../../../src/tfvc/commands/findworkspace";
import { TfvcError } from "../../../src/tfvc/tfvcerror";
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

    it("should verify arguments", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "workfold -noprompt ********");
    });

    it("should verify working folder", function() {
        let localPath: string = "/path/to/workspace";
        let cmd: FindWorkspace = new FindWorkspace(localPath);

        assert.equal(cmd.GetOptions().cwd, localPath);
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
});
