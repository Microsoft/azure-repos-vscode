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

    //Delete returns either 0 (success) or 100 (failure).  IF we fail, simply throw.
    public async ParseOutput(executionResult: IExecutionResult): Promise<string[]> {
        let lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

        if (executionResult.exitCode === 100) {
            CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult, true);
        }

        let filesUndone: string[] = [];
        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            let line: string = lines[index];
            if (CommandHelper.IsFilePath(line)) {
                path = line;
            } else if (line) {
                let file: string = this.getFileFromLine(line);
                filesUndone.push(CommandHelper.GetFilePath(path, file));
            }
        }
        return filesUndone;
    }

    private getFileFromLine(line: string): string {
        //There's no prefix on the filename line for the Delete command
        return line;
    }
}
