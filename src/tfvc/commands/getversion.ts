/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IArgumentProvider, IExecutionResult, ITfvcCommand } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";
import { TfvcError, TfvcErrorCodes } from "../tfvcerror";
import { Strings } from "../../helpers/strings";

/**
 * This command calls the command line doing a simple call to get the help for the add command.
 * The first line of all commands is the version info...
 * Team Explorer Everywhere Command Line Client (version 14.0.3.201603291047)
 */
export class GetVersion implements ITfvcCommand<string> {
    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("add")
            .AddSwitch("?");
    }

    public GetOptions(): any {
        return {};
    }

    public async ParseOutput(executionResult: IExecutionResult): Promise<string> {
        //Ex. Team Explorer Everywhere Command Line Client (Version 14.0.3.201603291047)
        return await this.getVersion(executionResult, /(.*\(version )([\.\d]*)(\).*)/i);
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string> {
        //Ex. Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0
        return await this.getVersion(executionResult, /(.*version )([\.\d]*)(.*)/i);
    }

    private async getVersion(executionResult: IExecutionResult, expression: RegExp): Promise<string> {
        // Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult);

        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout);
        // Find just the version number and return it. Ex. Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0
        if (lines && lines.length > 0) {
            let value: string = lines[0].replace(expression, "$2");  //Example: 14.111.1.201612142018
            //Spanish tf.exe example: "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0"
                //value = "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0"
            //French  tf.exe example: "Microsoft (R) TF�- Outil Team Foundation Version Control, version�14.102.25619.0"
                //value = ""
            //German  tf.exe example: "Microsoft (R) TF - Team Foundation-Versionskontrolltool, Version 14.102.25619.0"
                //value = "14.102.25619.0"
            //Check to see if we have either less or more than the version string. Less is the French case (and the like). More is
            //the Spanish case (and the like). If we do, we assume that we are using a non-ENU tf executable. So if we get here,
            //we were able to run tf but we might not have gotten the version fron an ENU tf. So even if we did get a version string,
            //we will still need to check later if this version is from a non-ENU SKU.
            let items: string[] = value.split(" ");
            if (!value || items.length > 1) {
                //This error is an early-out in the cases of Spanish and French (which translate version).  German will continue normally.
                throw new TfvcError({
                    message: Strings.NotAnEnuTfCommandLine,
                    tfvcErrorCode: TfvcErrorCodes.NotAnEnuTfCommandLine
                });
            }
            return value;
        } else {
            return "";
        }
    }
}
