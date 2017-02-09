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
 * This command undoes the changes to the files passed in.
 * It returns a list of all files undone.
 * undo [/recursive] <itemSpec>...
 */
//TODO: Add an Undo All?
export class Undo implements ITfvcCommand<string[]> {
    private _serverContext: TeamServerContext;
    private _itemPaths: string[];

    public constructor(serverContext: TeamServerContext, itemPaths: string[]) {
        CommandHelper.RequireStringArrayArgument(itemPaths, "itemPaths");
        this._serverContext = serverContext;
        this._itemPaths = itemPaths;
    }

    public GetArguments(): IArgumentProvider {
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
        //Otherwise, we assume some error occurred so let that be thrown.
        if (executionResult.exitCode !== 0) {
            //Remove any entries for which there were no pending changes
            lines = lines.filter(e => !e.startsWith("No pending changes were found for "));
            if (executionResult.exitCode === 100 && lines.length === 0) {
                //All of the files had no pending changes, return []
                return [];
            } else if (executionResult.exitCode !== 1) {
                //Otherwise, some other error occurred, let that be thrown.
                CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult);
            }
        }

        let filesUndone: string[] = [];
        let path: string = "";
        for (let index: number = 0; index < lines.length; index++) {
            let line: string = lines[index];
            if (this.isFilePath(line)) {
                path = line;
            } else if (line) {
                let file: string = this.getFileFromLine(line);
                filesUndone.push(this.getFilePath(path, file, ""));
            }
        }
        return filesUndone;
    }

    //line could be 'Undoing edit: file1.txt', 'Undoing add: file1.txt'
    private getFileFromLine(line: string): string {
        const prefix: string = ": "; //"Undoing edit: ", "Undoing add: ", etc.
        let idx: number = line.indexOf(prefix);
        if (idx > 0) {
            return line.substring(idx + prefix.length);
        }
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
