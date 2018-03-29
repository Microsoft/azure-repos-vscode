/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { Strings } from "../../helpers/strings";
import { IArgumentProvider, IExecutionResult, IItemInfo, ITfvcCommand } from "../interfaces";
import { TfvcError, TfvcErrorCodes } from "../tfvcerror";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command calls Info which returns local and server information about an item in the workspace.
 * <p/>
 * info [/recursive] [/version:<value>] <itemSpec>...
 */
export class GetInfo implements ITfvcCommand<IItemInfo[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];

    public constructor(serverContext: TeamServerContext, itemPaths: string[]) {
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._serverContext = serverContext;
        this._itemPaths = itemPaths;
    }

    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("info", this._serverContext)
            .AddAll(this._itemPaths);
    }

    public GetOptions(): any {
        return {};
    }

    /**
     * Example of output (Exactly the same for tf.cmd and tf.exe)
     * Local information:
     * Local path:  D:\tmp\TFVC_1\build.xml
     * Server path: $/TFVC_1/build.xml
     * Changeset:   18
     * Change:      none
     * Type:        file
     * Server information:
     * Server path:   $/TFVC_1/build.xml
     * Changeset:     18
     * Deletion ID:   0
     * Lock:          none
     * Lock owner:
     * Last modified: Nov 18, 2016 11:10:20 AM
     * Type:          file
     * File type:     windows-1252
     * Size:          1385
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<IItemInfo[]> {
        // Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(executionResult);

        const itemInfos: IItemInfo[] = [];
        if (!executionResult.stdout) {
            return itemInfos;
        }

        const lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, true, true);
        let curMode: string = ""; // "" is local mode, "server" is server mode
        let curItem: IItemInfo;
        for (let i: number = 0; i < lines.length; i++) {
            const line: string = lines[i];
            // Check the beginning of a new item
            // "no items match" means that the item requested was not found. In this case
            // we will return an empty info object in that item's place.
            if (line.toLowerCase().startsWith("no items match ") ||
                line.toLowerCase().startsWith("local information:")) {
                // We are starting a new Info section for the next item.
                // So, finish off any in progress item and start a new one.
                curMode = "";
                if (curItem !== undefined) {
                    itemInfos.push(curItem);
                }
                curItem = { serverItem: undefined, localItem: undefined };
            } else if (line.toLowerCase().startsWith("server information:")) {
                // We finished with the local properties and are starting the server properties
                curMode = "server ";
            } else {
                // Add the property to the current item
                const colonPos: number = line.indexOf(":");
                if (colonPos > 0) {
                    const propertyName: string = this.getPropertyName(curMode + line.slice(0, colonPos).trim().toLowerCase());
                    if (propertyName) {
                        const propertyValue = colonPos + 1 < line.length ? line.slice(colonPos + 1).trim() : "";
                        curItem[propertyName] = propertyValue;
                    }
                }
            }
        }
        if (curItem !== undefined) {
            itemInfos.push(curItem);
        }

        // If all of the info objects are "empty" let's report an error
        if (itemInfos.length > 0 &&
            itemInfos.length === itemInfos.filter((info) => info.localItem === undefined).length) {
            throw new TfvcError({
                message: Strings.NoMatchesFound,
                tfvcErrorCode: TfvcErrorCodes.NoItemsMatch,
                exitCode: executionResult.exitCode
            });
        }

        return itemInfos;
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<IItemInfo[]> {
        return await this.ParseOutput(executionResult);
    }

    private getPropertyName(name: string): string {
        switch (name) {
            case "server path": return "serverItem";
            case "local path": return "localItem";
            case "server changeset": return "serverVersion";
            case "changeset": return "localVersion";
            case "change": return "change";
            case "type": return "type";
            case "server lock": return "lock";
            case "server lock owner": return "lockOwner";
            case "server deletion id": return "deletionId";
            case "server last modified": return "lastModified";
            case "server file type": return "fileType";
            case "server size": return "fileSize";
        }
        return undefined;
    }
}
