/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";
import { GetVersion } from "../../../src/tfvc/commands/getversion";
import { IExecutionResult } from "../../../src/tfvc/interfaces";
import { TfvcErrorCodes } from "../../../src/tfvc/tfvcerror";
import { Strings } from "../../../src/helpers/strings";

describe("Tfvc-GetVersionCommand", function() {

    it("should verify GetOptions", function() {
        let cmd: GetVersion = new GetVersion();
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        let cmd: GetVersion = new GetVersion();
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        let cmd: GetVersion = new GetVersion();
        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "add -noprompt -?");
    });

    it("should verify Exe arguments", function() {
        let cmd: GetVersion = new GetVersion();
        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "add -noprompt -?");
    });

    it("should verify parse output - no version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: undefined
        };

        let version: string = await cmd.ParseOutput(executionResult);
        assert.equal(version, "");
    });

    it("should verify parse Exe output - no version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: undefined
        };

        let version: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(version, "");
    });

    it("should verify parse output - valid version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Team Explorer Everywhere Command Line Client (version 14.0.3.201603291047)",
            stderr: undefined
        };

        let version: string = await cmd.ParseOutput(executionResult);
        assert.equal(version, "14.0.3.201603291047");
    });

    it("should verify parse output - non-ENU version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0",
            stderr: undefined
        };

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            //assert.equal(err.exitCode, 0);
            //assert.equal(err.tfvcCommand, "add");
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
        }
    });

    it("should verify parse EXE output - non-ENU version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
        }
    });

    it("should verify parse EXE output - valid version", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0",
            stderr: undefined
        };

        let version: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(version, "14.102.25619.0");
    });

    it("should verify parse output - error exit code", async function() {
        let cmd: GetVersion = new GetVersion();
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
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            assert.isTrue(err.stdout.startsWith("Something bad this way comes."));
        }
    });

    it("should verify parse Exe output - error exit code", async function() {
        let cmd: GetVersion = new GetVersion();
        let executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.equal(err.tfvcCommand, "add");
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            assert.isTrue(err.stdout.startsWith("Something bad this way comes."));
        }
    });

});
