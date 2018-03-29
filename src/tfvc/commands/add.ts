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
 * This command adds the files passed in.
 * It returns the list of files that were successfully added.
 * add [/lock:none|checkin|checkout] [/type:<value>] [/recursive] [/silent] [/noignore] <localItemSpec>...
 */
export class Add implements ITfvcCommand<string[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];

    public constructor(serverContext: TeamServerContext, itemPaths: string[]) {
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._serverContext = serverContext;
        this._itemPaths = itemPaths;
    }

    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("add", this._serverContext)
            .AddAll(this._itemPaths);
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Example of output
     * folder1\folder2:
     * file5.txt
     * file2.java
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<string[]> {
        // Any exit code other than 0 or 1 means that something went wrong, so simply throw the error
        if (executionResult.exitCode !== 0 && executionResult.exitCode !== 1) {
            CommandHelper.ProcessErrors(executionResult);
        }

        let lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

        //Remove any lines indicating that there were no files to add (e.g., calling add on files that don't exist)
        lines = lines.filter((e) => !e.startsWith("No arguments matched any files to add."));  //CLC
        //Ex. /usr/alias/repos/Tfvc.L2VSCodeExtension.RC/file-does-not-exist.md: No file matches.
        lines = lines.filter((e) => !e.endsWith(" No file matches."));  //tf.exe

        const filesAdded: string[] = [];
        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            const line: string = lines[index];
            if (CommandHelper.IsFilePath(line)) {
                path = line;
            } else {
                const file: string = this.getFileFromLine(line);
                filesAdded.push(CommandHelper.GetFilePath(path, file));
            }
        }
        return filesAdded;
    }

    public GetExeArguments(): IArgumentProvider {
        return new ArgumentBuilder("add", this._serverContext, true /* skipCollectionOption */)
            .AddAll(this._itemPaths);
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string[]> {
        return await this.ParseOutput(executionResult);
    }

    private getFileFromLine(line: string): string {
        //There's no prefix on the filename line for the Add command
        return line;
    }

}
