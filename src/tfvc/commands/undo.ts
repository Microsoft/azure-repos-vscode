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
 * This command undoes the changes to the files passed in.
 * It returns a list of all files undone.
 * undo [/recursive] <itemSpec>...
 */
export class Undo implements ITfvcCommand<string[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];

    public constructor(serverContext: TeamServerContext, itemPaths: string[]) {
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._serverContext = serverContext;
        this._itemPaths = itemPaths;
    }

    public GetArguments(): IArgumentProvider {
        // If exactly 1 and it is our wildcard, undo all
        if (this._itemPaths.length === 1 && this._itemPaths[0] === "*") {
            return new ArgumentBuilder("undo", this._serverContext)
                .Add(".")
                .AddSwitch("recursive");
        }
        return new ArgumentBuilder("undo", this._serverContext)
            .AddAll(this._itemPaths);
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Example of output
     * Undoing edit: file1.java
     * Undoing add: file2.java
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<string[]> {
        let lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

        //If we didn't succeed without any issues, we have a bit of work to do.
        //'tf undo' can return a non-zero exit code when:
        //  * Some of the files have no pending changes (exitCode === 1)
        //  * All of the files have no pending changes (exitCode === 100)
        //If some of the files have no pending changes, we want to process the ones that did.
        //If all of the files have no pending changes, return []
        //Otherwise, we assume some error occurred so allow that to be thrown.
        if (executionResult.exitCode !== 0) {
            //Remove any entries for which there were no pending changes
            lines = lines.filter((e) => !e.startsWith("No pending changes "));
            if (executionResult.exitCode === 100 && lines.length === 0) {
                //All of the files had no pending changes, return []
                return [];
            } else if (executionResult.exitCode !== 1) {
                //Otherwise, some other error occurred, const that be thrown.
                CommandHelper.ProcessErrors(executionResult);
            }
        }

        const filesUndone: string[] = [];
        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            const line: string = lines[index];
            if (CommandHelper.IsFilePath(line)) {
                path = line;
            } else if (line) {
                const file: string = this.getFileFromLine(line);
                filesUndone.push(CommandHelper.GetFilePath(path, file));
            }
        }
        return filesUndone;
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string[]> {
        return await this.ParseOutput(executionResult);
    }

    //line could be 'Undoing edit: file1.txt', 'Undoing add: file1.txt'
    private getFileFromLine(line: string): string {
        const prefix: string = ": "; //"Undoing edit: ", "Undoing add: ", etc.
        const idx: number = line.indexOf(prefix);
        if (idx > 0) {
            return line.substring(idx + prefix.length);
        }
    }
}
