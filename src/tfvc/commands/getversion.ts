/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IArgumentProvider, IExecutionResult, ITfvcCommand } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

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
        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout);
        // Find just the version number and return it. Ex. Team Explorer Everywhere Command Line Client (Version 14.0.3.201603291047)
        if (lines && lines.length > 0) {
            return lines[0].replace(/(.*\(version )([\.\d]*)(\).*)/i, "$2");
        } else {
            return "";
        }
    }
}
