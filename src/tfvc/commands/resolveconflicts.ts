/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { AutoResolveType, IArgumentProvider, IExecutionResult, ITfvcCommand, IConflict } from "../interfaces";
import { ConflictType } from "../scm/status";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command resolves conflicts based on given auto resolve type
 *
 * tf resolve [itemspec]
 * [/auto:(AutoMerge|TakeTheirs|KeepYours|OverwriteLocal|DeleteConflict|KeepYoursRenameTheirs)]
 * [/preview] [(/overridetype:overridetype | /converttotype:converttype] [/recursive] [/newname:path] [/noprompt] [/login:username, [password]]
 */
export class ResolveConflicts implements ITfvcCommand<IConflict[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];
    private _autoResolveType: AutoResolveType;

    public constructor(serverContext: TeamServerContext, itemPaths: string[], autoResolveType: AutoResolveType) {
        this._serverContext = serverContext;
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        CommandHelper.RequireArgument(autoResolveType, "autoResolveType");
        this._itemPaths = itemPaths;
        this._autoResolveType = autoResolveType;
    }

    public GetArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("resolve", this._serverContext)
            .AddAll(this._itemPaths)
            .AddSwitchWithValue("auto", AutoResolveType[this._autoResolveType], false);
        return builder;
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Outputs the resolved conflicts in the following format:
     *
     * Resolved /Users/leantk/tfvc-tfs/tfsTest_01/TestAdd.txt as KeepYours
     * Resolved /Users/leantk/tfvc-tfs/tfsTest_01/addFold/testHere2 as KeepYours
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<IConflict[]> {
        CommandHelper.ProcessErrors(executionResult);

        const conflicts: IConflict[] = [];
        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, true, true);
        for (let i: number = 0; i < lines.length; i++) {
            const line: string = lines[i];
            const startIndex: number = line.indexOf("Resolved ");
            const endIndex: number = line.lastIndexOf(" as ");
            if (startIndex >= 0 && endIndex > startIndex) {
                conflicts.push({
                    localPath: line.slice(startIndex + "Resolved ".length, endIndex),
                    type: ConflictType.RESOLVED,
                    message: line
                });
            }
        }

        return conflicts;
    }

    public GetExeArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("resolve", this._serverContext, true /* skipCollectionOption */)
            .AddAll(this._itemPaths)
            .AddSwitchWithValue("auto", AutoResolveType[this._autoResolveType], false);
        return builder;
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<IConflict[]> {
        return await this.ParseOutput(executionResult);
    }
}
