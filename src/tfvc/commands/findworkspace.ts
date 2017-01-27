/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IExecutionResult, ITfvcCommand, IWorkspace } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";

/**
 * This command only returns a partial workspace object that allows you to get the name and server.
 * To get the entire workspace object you should call GetWorkspace with the workspace name.
 * (This is one of the only commands that expects to be a strictly local operation - no server calls - and so does not
 * take a server context object in the constructor)
 */
export class FindWorkspace implements ITfvcCommand<IWorkspace> {
    private _localPath: string;

    public constructor(localPath: string) {
        this._localPath = localPath;
    }

    public GetArguments(): string[] {
        return new ArgumentBuilder("workfold")
            .Build();
    }

    public GetOptions(): any {
        return { cwd: this._localPath };
    }

    /**
     * Parses the output of the workfold command. (NOT XML)
     * SAMPLE
     * Access denied connecting to TFS server https://account.visualstudio.com/ (authenticating as Personal Access Token)  <-- line is optional
     * =====================================================================================================================================================
     * Workspace:  MyNewWorkspace2
     * Collection: http://java-tfs2015:8081/tfs/
     * $/tfsTest_01: D:\tmp\test
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<IWorkspace> {
        const stdout = executionResult.stdout;

        // Find the workspace name and collectionUrl
        const lines = stdout.replace("\r\n", "\n").split("\n");
        let workspaceName: string = "";
        let collectionUrl: string = "";
        let equalsLineFound: boolean = false;

        for (let i = 0; i <= lines.length; i++) {
            const line = lines[i];
            if (!line) {
                continue;
            }

            if (line.startsWith("==========")) {
                equalsLineFound = true;
                continue;
            } else if (!equalsLineFound) {
                continue;
            }

            if (line.startsWith("Workspace:")) {
                workspaceName = this.getValue(line);
            } else if (line.startsWith("Collection:")) {
                collectionUrl = this.getValue(line);
            }
        }

        const workspace: IWorkspace = {
            name: workspaceName,
            server: collectionUrl
        };

        return workspace;
    }

    /**
     * This method parses a line of the form "name: value" and returns the value part.
     */
    private getValue(line: string): string {
        if (line) {
            const index = line.indexOf(":");
            if (index >= 0 && index + 1 < line.length) {
                return line.slice(index + 1).trim();
            }
        }

        return "";
    }
}
