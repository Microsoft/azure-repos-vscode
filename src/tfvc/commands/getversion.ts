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
import { IButtonMessageItem } from "../../helpers/vscodeutils.interfaces";
import { Constants, TfvcTelemetryEvents } from "../../helpers/constants";

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
        return await this.getVersion(executionResult, /version\s+([\.\d]+)/i);
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string> {
        //Ex. Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0
        return await this.getVersion(executionResult, /version\s+([\.\d]+)/i);
    }

    private async getVersion(executionResult: IExecutionResult, expression: RegExp): Promise<string> {
        // Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(executionResult);

        //Find just the version number and return it. Ex. Microsoft (R) TF - Team Foundation Version Control Tool, Version 14.102.25619.0
        //Spanish tf.exe example: "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0"
            //value = "Microsoft (R) TF - Herramienta Control de versiones de Team Foundation, versi�n 14.102.25619.0"
        //French  tf.exe example: "Microsoft (R) TF�- Outil Team Foundation Version Control, version�14.102.25619.0"
            //value = ""
        //German  tf.exe example: "Microsoft (R) TF - Team Foundation-Versionskontrolltool, Version 14.102.25619.0"
            //value = "14.102.25619.0"
        const matches: string[] = executionResult.stdout.match(expression);
        if (matches) {
            //Sample tf.exe matches:
            // Version 15.112.2641.0
            // 15.112.2641.0
            //Sample tf.cmd matches:
            // Version 14.114.0.201703081734
            // 14.114.0.201703081734
            return matches[matches.length - 1];
        } else {
            //If we can't find a version, that's pretty important. Therefore, we throw in this instance.
            const messageOptions: IButtonMessageItem[] = [{ title : Strings.MoreDetails,
                                url : Constants.NonEnuTfExeConfiguredUrl,
                                telemetryId: TfvcTelemetryEvents.ExeNonEnuConfiguredMoreDetails }];
            throw new TfvcError({
                message: Strings.NotAnEnuTfCommandLine,
                messageOptions: messageOptions,
                tfvcErrorCode: TfvcErrorCodes.NotAnEnuTfCommandLine
            });
        }
    }
}
