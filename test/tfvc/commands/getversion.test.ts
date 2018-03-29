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
        const cmd: GetVersion = new GetVersion();
        assert.deepEqual(cmd.GetOptions(), {});
    });

    it("should verify GetExeOptions", function() {
        const cmd: GetVersion = new GetVersion();
        assert.deepEqual(cmd.GetExeOptions(), {});
    });

    it("should verify arguments", function() {
        const cmd: GetVersion = new GetVersion();
        assert.equal(cmd.GetArguments().GetArgumentsForDisplay(), "add -noprompt -?");
    });

    it("should verify Exe arguments", function() {
        const cmd: GetVersion = new GetVersion();
        assert.equal(cmd.GetExeArguments().GetArgumentsForDisplay(), "add -noprompt -?");
    });

    it("should verify parse output - no version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            threw = true;
        } finally {
            assert.isTrue(threw);
        }
    });

    it("should verify parse Exe output - no version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            threw = true;
        } finally {
            assert.isTrue(threw);
        }
    });

    it("should verify parse output - valid version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Team Explorer Everywhere Command Line Client (version 14.0.3.201603291047)",
            stderr: undefined
        };

        const version: string = await cmd.ParseOutput(executionResult);
        assert.equal(version, "14.0.3.201603291047");
    });

    it("should verify parse EXE output - valid version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0",
            stderr: undefined
        };

        const version: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(version, "14.102.25619.0");
    });

    it("should verify parse output - error exit code", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            threw = true;
        } finally {
            assert.isTrue(threw);
        }
    });

    it("should verify parse output - java object heap error", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 1,
            stdout: "Error occurred during initialization of VM\r\nCould not reserve enough space for 2097152KB object heap\r\n",
            stderr: undefined
        };

        let threw: boolean = false;

        try {
            await cmd.ParseOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotFound);
            assert.isTrue(err.message.startsWith(Strings.TfInitializeFailureError));
            threw = true;
        } finally {
            assert.isTrue(threw, "Checking for Java object heap error did not throw an error.");
        }
    });

    it("should verify parse Exe output - error exit code", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 42,
            stdout: "Something bad this way comes.",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.exitCode, 42);
            assert.isTrue(err.message.startsWith(Strings.TfExecFailedError));
            threw = true;
        } finally {
            assert.isTrue(threw);
        }
    });

    it("should verify parse EXE output - Spanish version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            threw = true;
        } finally {
            assert.isTrue(threw, "Checking Spanish version did not throw an error.");
        }
    });

    it("should verify parse EXE output - French version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF�- Outil Team Foundation Version Control, version�14.102.25619.0",
            stderr: undefined
        };
        let threw: boolean = false;

        try {
            await cmd.ParseExeOutput(executionResult);
        } catch (err) {
            assert.equal(err.tfvcErrorCode, TfvcErrorCodes.NotAnEnuTfCommandLine);
            assert.isTrue(err.message.startsWith(Strings.NotAnEnuTfCommandLine));
            threw = true;
        } finally {
            assert.isTrue(threw, "Checking French version did not throw an error.");
        }
    });

    it("should verify parse EXE output - German version", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "Microsoft (R) TF - Team Foundation-Versionskontrolltool, Version 14.102.25619.0",
            stderr: undefined
        };

        const version: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(version, "14.102.25619.0");
    });

    it("should verify parse EXE output - version is not in the first line", async function() {
        const cmd: GetVersion = new GetVersion();
        const executionResult: IExecutionResult = {
            exitCode: 0,
            stdout: "\r\nc:\\TFS\\folder1\\folder two\\folder3\\folder4\\folder5> add -noprompt -?\r\n" +
                    "Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.98.25331.0\r\n" +
                    "Copyright (c) Microsoft Corporation.  All rights reserved.\r\n" +
                    "Adds new files and folders from a local file system location to Team Foundation\r\n" +
                    "version control.\r\n" +
                    "\r\n" +
                    "tf vc add [itemspec] [/lock:(none|checkin|checkout)] [/encoding:filetype]\r\n" +
                    "          [/noprompt] [/recursive] [/noignore] [/login:username,[password]]\r\n" +
                    "\r\n",
            stderr: undefined
        };

        const version: string = await cmd.ParseExeOutput(executionResult);
        assert.equal(version, "14.98.25331.0");
    });
});
