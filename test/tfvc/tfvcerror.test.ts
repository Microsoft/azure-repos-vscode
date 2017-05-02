/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { Strings } from "../../src/helpers/strings";
import { TfvcError, TfvcErrorCodes } from "../../src/tfvc/tfvcerror";

describe("Tfvc-Error", function() {
    beforeEach(function() {
        //
    });

    it("should verify constructor - undefined", function() {
        assert.throws(() => new TfvcError(undefined), TfvcError, /Argument is required/);
    });

    it("should verify constructor - empty data", function() {
        const error: TfvcError = new TfvcError({
            error: undefined,
            exitCode: 0,
            message: undefined,
            stderr: undefined,
            stdout: undefined,
            tfvcCommand: undefined,
            tfvcErrorCode: undefined
        });
        assert.equal(error.error, undefined);
        assert.equal(error.exitCode, 0);
        assert.equal(error.message, Strings.TfExecFailedError);
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, undefined);
    });

    it("should verify constructor - error not empty", function() {
        const error: TfvcError = new TfvcError({
            error: { name: "err1", message: "error1 message" },
            exitCode: 0,
            message: undefined,
            stderr: undefined,
            stdout: undefined,
            tfvcCommand: undefined,
            tfvcErrorCode: undefined
        });
        assert.equal(error.error.name, "err1");
        assert.equal(error.error.message, "error1 message");
        assert.equal(error.exitCode, 0);
        assert.equal(error.message, "error1 message");
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, undefined);
    });

    it("should verify constructor - error.message over message", function() {
        const error: TfvcError = new TfvcError({
            error: { name: "err1", message: "error1 message" },
            exitCode: 0,
            message: "other message",
            stderr: undefined,
            stdout: undefined,
            tfvcCommand: undefined,
            tfvcErrorCode: undefined
        });
        assert.equal(error.error.name, "err1");
        assert.equal(error.error.message, "error1 message");
        assert.equal(error.exitCode, 0);
        assert.equal(error.message, "error1 message");
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, undefined);
    });

    it("should verify constructor - no error", function() {
        const error: TfvcError = new TfvcError({
            error: undefined,
            exitCode: 100,
            message: "other message",
            stderr: "standard error",
            stdout: "standard output",
            tfvcCommand: "command1",
            tfvcErrorCode: TfvcErrorCodes.LocationMissing
        });
        assert.equal(error.error, undefined);
        assert.equal(error.exitCode, 100);
        assert.equal(error.message, "other message");
        assert.equal(error.stderr, "standard error");
        assert.equal(error.stdout, "standard output");
        assert.equal(error.tfvcCommand, "command1");
        assert.equal(error.tfvcErrorCode, TfvcErrorCodes.LocationMissing);
    });

    it("should verify CreateArgumentMissingError", function() {
        const error: TfvcError = TfvcError.CreateArgumentMissingError("arg1");
        assert.equal(error.error, undefined);
        assert.equal(error.exitCode, undefined);
        assert.equal(error.message, "Argument is required: arg1");
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, TfvcErrorCodes.MissingArgument);
    });

    it("should verify CreateInvalidStateError", function() {
        const error: TfvcError = TfvcError.CreateInvalidStateError();
        assert.equal(error.error, undefined);
        assert.equal(error.exitCode, undefined);
        assert.equal(error.message, "The TFVC SCMProvider is in an invalid state for this action.");
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, TfvcErrorCodes.InInvalidState);
    });

    it("should verify CreateUnknownError", function() {
        const error: TfvcError = TfvcError.CreateUnknownError({ name: "err1", message: "error1 message" });
        assert.equal(error.error.name, "err1");
        assert.equal(error.error.message, "error1 message");
        assert.equal(error.exitCode, undefined);
        assert.equal(error.message, "error1 message");
        assert.equal(error.stderr, undefined);
        assert.equal(error.stdout, undefined);
        assert.equal(error.tfvcCommand, undefined);
        assert.equal(error.tfvcErrorCode, TfvcErrorCodes.UnknownError);
    });

    it("should verify toString", function() {
        const error: TfvcError = new TfvcError({
            error: { name: "err1", message: "error1 message", stack: "here; then there" },
            exitCode: 11,
            message: undefined,
            stderr: "standard error",
            stdout: "standard output",
            tfvcCommand: "command1",
            tfvcErrorCode: TfvcErrorCodes.MinVersionWarning
        });
        assert.equal(error.toString(), "error1 message Details: exitCode: 11, errorCode: TfvcMinVersionWarning, command: command1, stdout: standard output, stderr: standard error Stack: here; then there");
    });
});
