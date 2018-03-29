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
            CommandHelper.ProcessErrors(executionResult);
        }

        const conflicts: IConflict[] = [];
        //"Picked up _JAVA_OPTIONS: -Xmx1024M"
        let outputToProcess: string = executionResult.stderr;
        if (outputToProcess && outputToProcess.includes("_JAVA_OPTIONS")) {
            //When you don't need _JAVA_OPTIONS set, the results we want are always in stderr (this is the default case)
            //With _JAVA_OPTIONS set and there are no conflicts, _JAVA_OPTIONS is in stderr but the result we want to process is moved to stdout
            //With _JAVA_OPTIONS set and there are conflicts, _JAVA_OPTIONS will appear in stderr along with the results also in stderr (and stdout will be empty)
            if (executionResult.stdout && executionResult.stdout.length > 0) {
                outputToProcess = executionResult.stdout;
            }
        }
        const lines: string[] = CommandHelper.SplitIntoLines(outputToProcess, false, true);
        for (let i: number = 0; i < lines.length; i++) {
            const line: string = lines[i];
            if (line.includes("_JAVA_OPTIONS")) {
                continue; //This is not a conflict
            }
            const colonIndex: number = line.lastIndexOf(":");
            if (colonIndex >= 0) {
                const localPath: string = line.slice(0, colonIndex);
                let type: ConflictType = ConflictType.CONTENT;
                if (/You have a conflicting pending change/i.test(line) ||
                    /A newer version exists on the server/i.test(line)) {
                    // This is the ambiguous response given by the EXE.
                    // We will assume it is both a name and content change for now.
                    type = ConflictType.NAME_AND_CONTENT;
                } else if (/The item name and content have changed/i.test(line)) {
                    type = ConflictType.NAME_AND_CONTENT;
                } else if (/The item name has changed/i.test(line)) {
                    type = ConflictType.RENAME;
                } else if (/The source and target both have changes/i.test(line)) {
                    type = ConflictType.MERGE;
                } else if (/The item has already been deleted/i.test(line) ||
                           /The item has been deleted in the source branch/i.test(line) ||
                           /The item has been deleted from the server/i.test(line)) {
                    type = ConflictType.DELETE;
                } else if (/The item has been deleted in the target branch/i.test(line)) {
                    type = ConflictType.DELETE_TARGET;
                }
                conflicts.push({
                    localPath: localPath,
                    type: type,
                    message: line
                });
            }
        }

        return conflicts;
    }

    public GetExeArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("resolve", this._serverContext, true /* skipCollectionOption */)
            .Add(this._itemPath)
            .AddSwitch("recursive")
            .AddSwitch("preview");
        return builder;
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<IConflict[]> {
        return await this.ParseOutput(executionResult);
    }

}
