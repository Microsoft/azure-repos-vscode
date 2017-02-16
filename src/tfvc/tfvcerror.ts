/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Strings } from "../helpers/strings";
import { ITfvcErrorData } from "./interfaces";

export class TfvcError {
    error: Error;
    message: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    tfvcErrorCode: string;
    tfvcCommand: string;

    public static CreateArgumentMissingError(argumentName: string): TfvcError {
        return new TfvcError({
                // This is a developer error - no need to localize
                message: `Argument is required: ${argumentName}`,
                tfvcErrorCode: TfvcErrorCodes.MissingArgument
            });
    }

    /**
     * Only throw this error in the case where you detect an invalid state and cannot continue.
     */
    public static CreateInvalidStateError(): TfvcError {
        return new TfvcError({
            message: "The TFVC SCMProvider is in an invalid state for this action.",
            tfvcErrorCode: TfvcErrorCodes.TfvcInInvalidState
        });
    }

    public static CreateUnknownError(err: Error) {
        return new TfvcError({
                error: err,
                message: err.message,
                tfvcErrorCode: TfvcErrorCodes.UnknownError
            });
    }

    public constructor(data: ITfvcErrorData) {
        if (data.error) {
            this.error = data.error;
            this.message = data.error.message;
        } else {
            this.error = undefined;
        }

        this.message = this.message || data.message || Strings.TfExecFailedError;
        this.stdout = data.stdout;
        this.stderr = data.stderr;
        this.exitCode = data.exitCode;
        this.tfvcErrorCode = data.tfvcErrorCode;
        this.tfvcCommand = data.tfvcCommand;
    }

    public toString(): string {
        let result = this.message + " " +
            JSON.stringify(
                {
                    exitCode: this.exitCode,
                    TfvcErrorCode: this.tfvcErrorCode,
                    gitCommand: this.tfvcCommand,
                    stdout: this.stdout,
                    stderr: this.stderr
                },
                [],
                2);

        if (this.error) {
            result += (<any>this.error).stack;
        }

        return result;
    }
}

export class TfvcErrorCodes {
    public static get MissingArgument(): string { return "MissingArgument"; }
    public static get AuthenticationFailed(): string { return "AuthenticationFailed"; }
    public static get NotATfvcRepository(): string { return "NotATfvcRepository"; }
    public static get TfvcLocationMissing(): string { return "TfvcLocationMissing"; }
    public static get TfvcNotFound(): string { return "TfvcNotFound"; }
    public static get TfvcMinVersionWarning(): string { return "TfvcMinVersionWarning"; }
    public static get RepositoryNotFound(): string { return "RepositoryNotFound"; }
    public static get FileNotInMappings(): string { return "FileNotInMappings"; }
    public static get FileNotInWorkspace(): string { return "FileNotInWorkspace"; }
    public static get TfvcInInvalidState(): string { return "TfvcInInvalidState"; }
    public static get UnknownError(): string { return "UnknownError"; }
};
