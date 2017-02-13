/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as path from "path";
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
        // Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult);

        let lines: string[] = CommandHelper.SplitIntoLines(executionResult.stdout, false, true /*filterEmptyLines*/);

        //Remove any lines indicating that there were no files to add (e.g., calling add on files that don't exist)
        lines = lines.filter(e => !e.startsWith("No arguments matched any files to add."));

        let filesAdded: string[] = [];
        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            let line: string = lines[index];
            if (this.isFilePath(line)) {
                path = line;
            } else {
                let file: string = this.getFileFromLine(line);
                filesAdded.push(this.getFilePath(path, file, ""));
            }
        }
        return filesAdded;
    }

    private getFileFromLine(line: string): string {
        //There's no prefix on the filename line for the Add command
        return line;
    }

    //line could be '', 'file1.txt', 'folder1:', 'folder1\folder2:'
    private isFilePath(line: string): boolean {
        if (line && line.length > 0 && line.endsWith(":", line.length)) {
            //'folder1:', 'folder1\folder2:'
            return true;
        }
        return false;
    }

    //filePath could be 'folder1\folder2:'
    private getFilePath(filePath: string, filename: string, pathRoot: string): string {
        let folderPath: string = filePath;
        //Remove any ending ':'
        if (filePath && filePath.length > 0 && filePath.endsWith(":", filePath.length)) {
            folderPath = filePath.slice(0, filePath.length - 1);
        }
        //If path isn't rooted, add in the root
        if (!path.isAbsolute(folderPath) && pathRoot) {
            folderPath = path.join(pathRoot, folderPath);
        }
        return path.join(folderPath, filename);
    }

}
