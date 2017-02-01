/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IArgumentProvider, IExecutionResult, ITfvcCommand, IWorkspace, IWorkspaceMapping } from "../interfaces";
import { TfvcError } from "../tfvcerror";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command only returns a partial workspace object that allows you to get the name and server.
 * To get the entire workspace object you should call GetWorkspace with the workspace name.
 * (This is one of the only commands that expects to be a strictly local operation - no server calls - and so does not
 * take a server context object in the constructor)
 */
export class FindWorkspace implements ITfvcCommand<IWorkspace> {
    private _localPath: string;

    public constructor(localPath: string) {
        if (!localPath) {
            throw TfvcError.createArgumentMissingError("localPath");
        }
        this._localPath = localPath;
    }

    public GetArguments(): IArgumentProvider {
        return new ArgumentBuilder("workfold");
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

        if (!stdout) {
            return undefined;
        }

        // Find the workspace name and collectionUrl
        const lines = CommandHelper.SplitIntoLines(stdout);
        let workspaceName: string = "";
        let collectionUrl: string = "";
        let equalsLineFound: boolean = false;
        let mappings: IWorkspaceMapping[] = [];
        let teamProject: string = undefined;

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
            } else {
                // This should be a mapping
                const mapping: IWorkspaceMapping = this.getMapping(line);
                if (mapping) {
                    mappings.push(mapping);
                    if (!teamProject) {
                        teamProject = this.getTeamProject(mapping.serverPath);
                    }
                }
            }
        }

        const workspace: IWorkspace = {
            name: workspaceName,
            server: collectionUrl,
            defaultTeamProject: teamProject,
            mappings: mappings
        };

        return workspace;
    }

    /**
     * This method parses a line of the form "name: value" and returns the value part.
     */
    private getValue(line: string): string {
        if (line) {
            const index: number = line.indexOf(":");
            if (index >= 0 && index + 1 < line.length) {
                return line.slice(index + 1).trim();
            }
        }

        return "";
    }

    /**
     * This method parses a single line of output returning the mapping if one was found
     * Examples:
     * "$/TFVC_11/folder1: D:\tmp\notdefault\folder1"
     * "(cloaked) $/TFVC_11/folder1:"
     */
    private getMapping(line: string): IWorkspaceMapping {
        if (line) {
            const cloaked: boolean = line.trim().toLowerCase().startsWith("(cloaked)");
            const end: number = line.indexOf(":");
            const start: number = cloaked ? line.indexOf(")") + 1 : 0;
            if (end >= 0 && end + 1 < line.length) {
                const serverPath: string = line.slice(start, end).trim();
                const localPath: string = line.slice(end + 1).trim();
                return {
                    serverPath: serverPath,
                    localPath: localPath,
                    cloaked: cloaked
                };
            }
        }

        return undefined;
    }

    /**
     * Use this method to get the team project name from a TFVC server path.
     * The team project name is always the first folder in the path.
     * If no team project name is found an empty string is returned.
     */
    private getTeamProject(serverPath: string): string {
        if (serverPath && serverPath.startsWith("$/") && serverPath.length > 2) {
            const index: number = serverPath.indexOf("/", 2);
            if (index > 0) {
                return serverPath.slice(2, index);
            } else {
                return serverPath.slice(2);
            }
        }

        return "";
    }
}
