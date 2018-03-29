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
 * This command renames the file passed in.
 * It returns...
 * rename [/lock:none|checkin|checkout] <oldItem> <newItem>
 */
export class Rename implements ITfvcCommand<string> {
    private _serverContext: TeamServerContext;
    private _sourcePath: string;
    private _destinationPath: string;

    public constructor(serverContext: TeamServerContext, sourcePath: string, destinationPath: string) {
        CommandHelper.RequireStringArgument(sourcePath, "sourcePath");
        CommandHelper.RequireStringArgument(destinationPath, "destinationPath");
        this._serverContext = serverContext;
        this._sourcePath = sourcePath;
        this._destinationPath = destinationPath;
    }

    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("rename", this._serverContext)
            .Add(this._sourcePath)
            .Add(this._destinationPath);
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Example of output
        //Zero or one argument
        //An argument error occurred: rename requires exactly two local or server path arguments.
        //100

        //Source file doesn't exist
        //The item C:\repos\Tfvc.L2VSCodeExtension.RC\team-extension.log could not be found in your workspace, or you do not have permission to access it.
        //100

        //Single file (no path)
        //file11.txt
        //0

        //Single file (with path)
        //folder1:
        //file11.txt
        //0
    */
    public async ParseOutput(executionResult: IExecutionResult): Promise<string> {
        //Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(executionResult);

        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            const line: string = lines[index];
            if (CommandHelper.IsFilePath(line)) {
                path = line;
            } else {
                const file: string = this.getFileFromLine(line);
                return CommandHelper.GetFilePath(path, file);
            }
        }
        return "";
    }

    public GetExeArguments(): IArgumentProvider {
        return new ArgumentBuilder("rename", this._serverContext, true /* skipCollectionOption */)
            .Add(this._sourcePath)
            .Add(this._destinationPath);
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string> {
        return await this.ParseOutput(executionResult);
    }

    private getFileFromLine(line: string): string {
        //There's no prefix on the filename line for the Add command
        return line;
    }

}
