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
    public static get BadConfigFile(): string { return "BadConfigFile"; }
    public static get AuthenticationFailed(): string { return "AuthenticationFailed"; }
    public static get NoUserNameConfigured(): string { return "NoUserNameConfigured"; }
    public static get NoUserEmailConfigured(): string { return "NoUserEmailConfigured"; }
    public static get NoRemoteRepositorySpecified(): string { return "NoRemoteRepositorySpecified"; }
    public static get NotATfvcRepository(): string { return "NotATfvcRepository"; }
    public static get NotAtRepositoryRoot(): string { return "NotAtRepositoryRoot"; }
    public static get Conflict(): string { return "Conflict"; }
    public static get UnmergedChanges(): string { return "UnmergedChanges"; }
    public static get PushRejected(): string { return "PushRejected"; }
    public static get RemoteConnectionError(): string { return "RemoteConnectionError"; }
    public static get DirtyWorkTree(): string { return "DirtyWorkTree"; }
    public static get CantOpenResource(): string { return "CantOpenResource"; }
    public static get TfvcLocationMissing(): string { return "TfvcLocationMissing"; }
    public static get TfvcNotFound(): string { return "TfvcNotFound"; }
    public static get TfvcMinVersionWarning(): string { return "TfvcMinVersionWarning"; }
    public static get CantCreatePipe(): string { return "CantCreatePipe"; }
    public static get CantAccessRemote(): string { return "CantAccessRemote"; }
    public static get RepositoryNotFound(): string { return "RepositoryNotFound"; }
    public static get FileNotInMappings(): string { return "FileNotInMappings"; }
};
