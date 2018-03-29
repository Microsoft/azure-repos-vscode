/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { IArgumentProvider, IExecutionResult, ITfvcCommand, ISyncResults, ISyncItemResult, SyncType } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command gets the latest version of one or more files or folders
 * (we add the switch nosummary to make sure that errors only print once)
 *
 * tf get [itemspec] [/version:versionspec] [/all] [/overwrite] [/force] [/remap]
 * [/recursive] [/preview] [/noautoresolve] [/noprompt]
 * [/login:username,[password]]
 */
export class Sync implements ITfvcCommand<ISyncResults> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];
    private _recursive: boolean;

    public constructor(serverContext: TeamServerContext, itemPaths: string[], recursive: boolean) {
        this._serverContext = serverContext;
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._itemPaths = itemPaths;
        this._recursive = recursive;
    }

    public GetArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("get", this._serverContext)
            .AddSwitch("nosummary")
            .AddAll(this._itemPaths);

        if (this._recursive) {
            builder.AddSwitch("recursive");
        }

        return builder;
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Example output from TF Get:
     * D:\tmp\test:
     * Getting addFold
     * Getting addFold-branch
     *
     * D:\tmp\test\addFold-branch:
     * Getting testHereRename.txt
     *
     * D:\tmp\test\addFold:
     * Getting testHere3
     * Getting testHereRename7.txt
     *
     * D:\tmp\test:
     * Getting Rename2.txt
     * Getting test3.txt
     * Conflict test_renamed.txt - Unable to perform the get operation because you have a conflicting rename, edit
     * Getting TestAdd.txt
     *
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<ISyncResults> {
        // Any exit code other than 0 or 1 means that something went wrong, so simply throw the error
        if (executionResult.exitCode !== 0 && executionResult.exitCode !== 1) {
            CommandHelper.ProcessErrors(executionResult);
        }

        // Check for up to date message (slightly different in EXE and CLC)
        if (/All files( are)? up to date/i.test(executionResult.stdout)) {
            // There was nothing to download so return an empty result
            return {
                hasConflicts: false,
                hasErrors: false,
                itemResults: []
            };
        } else {
            // Get the item results and any warnings or errors
            const itemResults: ISyncItemResult[] = this.getItemResults(executionResult.stdout);
            const errorMessages: ISyncItemResult[] = this.getErrorMessages(executionResult.stderr);
            return {
                hasConflicts: errorMessages.filter((err) => err.syncType === SyncType.Conflict).length > 0,
                hasErrors: errorMessages.filter((err) => err.syncType !== SyncType.Conflict).length > 0,
                itemResults: itemResults.concat(errorMessages)
            };
        }
    }

    public GetExeArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("get", this._serverContext, true /* skipCollectionOption */)
            .AddSwitch("nosummary")
            .AddAll(this._itemPaths);

        if (this._recursive) {
            builder.AddSwitch("recursive");
        }

        return builder;
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<ISyncResults> {
        return await this.ParseOutput(executionResult);
    }

    private getItemResults(stdout: string): ISyncItemResult[] {
        const itemResults: ISyncItemResult[] = [];
        let folderPath: string = "";
        const lines: string[] = CommandHelper.SplitIntoLines(stdout, true, true);
        for (let i: number = 0; i < lines.length; i++) {
            const line = lines[i];
            if (CommandHelper.IsFilePath(line)) {
                folderPath = line;
            } else if (line) {
                const sr: ISyncItemResult = this.getSyncResultFromLine(folderPath, line);
                if (sr) {
                    itemResults.push(sr);
                }
            }
        }
        return itemResults;
    }

    private getSyncResultFromLine(folderPath: string, line: string): ISyncItemResult {
        if (!line) {
            return undefined;
        }

        let newResult: ISyncItemResult = undefined;
        if (line.startsWith("Getting ")) {
            newResult = {
                syncType: SyncType.New,
                itemPath: CommandHelper.GetFilePath(folderPath, line.slice("Getting ".length).trim())
            };
        } else if (line.startsWith("Replacing ")) {
            newResult = {
                syncType: SyncType.Updated,
                itemPath: CommandHelper.GetFilePath(folderPath, line.slice("Replacing ".length).trim())
            };
        } else if (line.startsWith("Deleting ")) {
            newResult = {
                syncType: SyncType.Deleted,
                itemPath: CommandHelper.GetFilePath(folderPath, line.slice("Deleting ".length).trim())
            };
        } else if (line.startsWith("Conflict ")) {
            const dashIndex = line.lastIndexOf("-");
            newResult = {
                syncType: SyncType.Conflict,
                itemPath: CommandHelper.GetFilePath(folderPath, line.slice("Conflict ".length, dashIndex).trim()),
                message: line.slice(dashIndex + 1).trim()
            };
        } else if (line.startsWith("Warning ")) {
            const dashIndex = line.lastIndexOf("-");
            newResult = {
                syncType: SyncType.Warning,
                itemPath: CommandHelper.GetFilePath(folderPath, line.slice("Warning ".length, dashIndex).trim()),
                message: line.slice(dashIndex + 1).trim()
            };
        } else {
            // This must be an error. Usually of the form "filename - message" or "filename cannot be deleted reason"
            let index: number = line.lastIndexOf("-");
            if (index >= 0) {
                newResult = {
                    syncType: SyncType.Error,
                    itemPath: CommandHelper.GetFilePath(folderPath, line.slice(0, index).trim()),
                    message: line.slice(index + 1).trim()
                };
            } else {
                index = line.indexOf("cannot be deleted");
                if (index >= 0) {
                    newResult = {
                        syncType: SyncType.Warning,
                        itemPath: CommandHelper.GetFilePath(folderPath, line.slice(0, index).trim()),
                        message: line.trim()
                    };
                }
            }
        }

        return newResult;
    }

    /**
     * An error will be in one of the following forms:
     *
     * Warning - Unable to refresh testHereRename.txt because you have a pending edit.
     * Conflict TestAdd.txt - Unable to perform the get operation because you have a conflicting edit
     * new4.txt - Unable to perform the get operation because you have a conflicting rename (to be moved from D:\tmp\folder\new5.txt)
     * D:\tmp\vscodeBugBash\folder1 cannot be deleted because it is not empty.
     */
    private getErrorMessages(stderr: string): ISyncItemResult[] {
        const errorMessages: ISyncItemResult[] = [];
        const lines: string[] = CommandHelper.SplitIntoLines(stderr, false, true);
        for (let i: number = 0; i < lines.length; i++) {
            // stderr doesn't get any file path lines, so the files will all be just the filenames
            errorMessages.push(this.getSyncResultFromLine("", lines[i]));
        }
        return errorMessages;
    }
}
