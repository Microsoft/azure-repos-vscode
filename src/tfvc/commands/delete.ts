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
 * This command deletes the files passed in.
 * It returns a list of all files marked for deletion.
 * delete /detect [/lock:none|checkin|checkout] [/recursive]
 * delete [/lock:none|checkin|checkout] [/recursive] <itemSpec>...
 */
export class Delete implements ITfvcCommand<string[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];

    public constructor(serverContext: TeamServerContext, itemPaths: string[]) {
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._serverContext = serverContext;
        this._itemPaths = itemPaths;
    }

    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("delete", this._serverContext)
            .AddAll(this._itemPaths);
    }

    public GetOptions(): any {
        return {};
    }

    /* Delete returns either 0 (success) or 100 (failure).  IF we fail, simply throw.

        Sample output:
        //Single file
        tf.cmd delete folder1\folder2\file2.txt
        folder1\folder2:
        file2.txt

        //Multiple files in a folder
        tf.cmd delete folder2
        folder2:
        file2.txt
        newfile.txt
        folder2

        //Deleting a file that doesn't exist
        tf.cmd delete file2.txt
        The item C:\repos\Tfvc.L2VSCodeExtension.RC\folder1\file2.txt could not be found in your workspace, or you do not have permission to access it.
        No arguments matched any files to delete.

        //Deleting a file with existing pending changes
        tf.cmd delete file2.txt
        TF203069: $/L2.VSCodeExtension.RC/folder1/folder2/file2.txt could not be deleted because that change conflicts with one or more other pending *snip*
        No arguments matched any files to delete.
    */

    public async ParseOutput(executionResult: IExecutionResult): Promise<string[]> {
        CommandHelper.ProcessErrors(executionResult);

        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

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
        return new ArgumentBuilder("delete", this._serverContext, true /* skipCollectionOption */)
            .AddAll(this._itemPaths);
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string[]> {
        return await this.ParseOutput(executionResult);
    }

    private getFileFromLine(line: string): string {
        //There's no prefix on the filename line for the Delete command
        return line;
    }
}
