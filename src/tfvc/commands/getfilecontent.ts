/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { IArgumentProvider, IExecutionResult, ITfvcCommand } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command calls Print to get the contents of the file at the version provided and returns them as a string
 * file.
 * <p/>
 * This command actually wraps the print command:
 * print [/version:<value>] <itemSpec>
 */
export class GetFileContent implements ITfvcCommand<string> {
    private _serverContext: TeamServerContext;
    private _localPath: string;
    private _versionSpec: string;
    private _ignoreFileNotFound: boolean;

    public constructor(serverContext: TeamServerContext, localPath: string, versionSpec?: string, ignoreFileNotFound?: boolean) {
        CommandHelper.RequireStringArgument(localPath, "localPath");

        this._serverContext = serverContext;
        this._localPath = localPath;
        this._versionSpec = versionSpec;
        this._ignoreFileNotFound = ignoreFileNotFound;
    }

    public GetArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("print", this._serverContext)
            .Add(this._localPath);
        if (this._versionSpec) {
            builder.AddSwitchWithValue("version", this._versionSpec, false);
        }
        return builder;
    }

    public GetOptions(): any {
        return {};
    }

    public async ParseOutput(executionResult: IExecutionResult): Promise<string> {
        // Check for "The specified file does not exist at the specified version" (or "No file matches" in case of the EXE)
        // and write out empty string
        if (this._ignoreFileNotFound &&
            (CommandHelper.HasError(executionResult, "The specified file does not exist at the specified version") ||
             CommandHelper.HasError(executionResult, "No file matches"))) {
            // The file doesn't exist, but the ignore flag is set, so we will simply return an emtpy string
            return "";
        }

        // Throw if any OTHER errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(executionResult);

        // Split the lines to take advantage of the WARNing skip logic and rejoin them to return
        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout);
        return lines.join(CommandHelper.GetNewLineCharacter(executionResult.stdout));
    }

    public GetExeArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("view", this._serverContext)
            .Add(this._localPath);
        if (this._versionSpec) {
            builder.AddSwitchWithValue("version", this._versionSpec, false);
        }
        return builder;
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string> {
        return await this.ParseOutput(executionResult);
    }
}
