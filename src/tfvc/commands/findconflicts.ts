/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { IArgumentProvider, IExecutionResult, ITfvcCommand, IConflict } from "../interfaces";
import { ConflictType } from "../scm/status";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command finds conflicts existing in the workspace by calling tf resolve -preview
 * 
 * tf resolve [itemspec]
 * [/auto:(AutoMerge|TakeTheirs|KeepYours|OverwriteLocal|DeleteConflict|KeepYoursRenameTheirs)]
 * [/preview] [(/overridetype:overridetype | /converttotype:converttype] [/recursive] [/newname:path] [/noprompt] [/login:username, [password]]
 */
export class FindConflicts implements ITfvcCommand<IConflict[]> {
    private _serverContext: TeamServerContext;
    private _itemPath: string;

    public constructor(serverContext: TeamServerContext, itemPath: string) {
        this._serverContext = serverContext;
        CommandHelper.RequireStringArgument(itemPath, "itemPath");
        this._itemPath = itemPath;
    }

    public GetArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("resolve", this._serverContext)
            .Add(this._itemPath)
            .AddSwitch("recursive")
            .AddSwitch("preview");
        return builder;
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Outputs the conflicts found in the workspace in the following format:
     *
     * tfsTest_01/addFold/testHere2: The item content has changed
     * tfsTest_01/TestAdd.txt: The item content has changed
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<IConflict[]> {
        // Any exit code other than 0 or 1 means that something went wrong, so simply throw the error
        if (executionResult.exitCode !== 0 && executionResult.exitCode !== 1) {
            CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult);
        }

        let conflicts: IConflict[] = [];
        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stderr, false, true);
        for (let i: number = 0; i < lines.length; i++) {
            const line: string = lines[i];
            const colonIndex: number = line.lastIndexOf(":");
            if (colonIndex >= 0) {
                const localPath: string = line.slice(0, colonIndex);
                let type: ConflictType = ConflictType.CONTENT;
                if (line.endsWith("The item name and content have changed")) {
                    type = ConflictType.NAME_AND_CONTENT;
                } else if (line.endsWith("The item name has changed")) {
                    type = ConflictType.RENAME;
                } else if (line.endsWith("The source and target both have changes")) {
                    type = ConflictType.MERGE;
                } else if (line.endsWith("The item has already been deleted") ||
                           line.endsWith("The item has been deleted in the source branch")) {
                    type = ConflictType.DELETE;
                } else if (line.endsWith("The item has been deleted in the target branch")) {
                    type = ConflictType.DELETE_TARGET;
                }
                conflicts.push({
                    localPath: localPath,
                    type: type
                });
            }
        }

        return conflicts;
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<IConflict[]> {
        return this.ParseOutput(executionResult);
    }

}
