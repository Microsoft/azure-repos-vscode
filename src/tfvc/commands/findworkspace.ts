/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Strings } from "../../helpers/strings";
import { IArgumentProvider, IExecutionResult, ITfvcCommand, IWorkspace, IWorkspaceMapping } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";
import { TfvcError, TfvcErrorCodes } from "../tfvcerror";

/**
 * This command only returns a partial workspace object that allows you to get the name and server.
 * To get the entire workspace object you should call GetWorkspace with the workspace name.
 * (This is one of the only commands that expects to be a strictly local operation - no server calls - and so does not
 * take a server context object in the constructor)
 */
export class FindWorkspace implements ITfvcCommand<IWorkspace> {
    private _localPath: string;

    public constructor(localPath: string) {
        CommandHelper.RequireStringArgument(localPath, "localPath");
        this._localPath = localPath;
    }

    public GetArguments(): IArgumentProvider {
        // Due to a bug in the CLC this command "requires" the login switch although the creds are never used
        return new ArgumentBuilder("workfold")
            .AddSwitchWithValue("login", "fake,fake", true);
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
        // Throw if any errors are found in stderr or if exitcode is not 0
        CommandHelper.ProcessErrors(this.GetArguments().GetCommand(), executionResult);

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

        for (let i: number = 0; i <= lines.length; i++) {
            const line: string = lines[i];
            if (!line) {
                continue;
            }

            if (line.startsWith("==========")) {
                equalsLineFound = true;
                continue;
            } else if (!equalsLineFound) {
                continue;
            }

            //CLC returns 'Workspace:', tf.exe returns 'Workspace :'
            if (line.startsWith("Workspace:") || line.startsWith("Workspace :")) {
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
        if (mappings.length === 0) {
            throw new TfvcError( {
                message: Strings.NoWorkspaceMappings,
                tfvcErrorCode: TfvcErrorCodes.NotATfvcRepository
             });
        }
        //If there are mappings but no workspace name, the term 'workspace' couldn't be parsed. According to Bing
        //translate, other than Klingon, no other supported language translates 'workspace' as 'workspace'.
        //So if we determine there are mappings but can't get the workspace name, we assume it's a non-ENU
        //tf executable. One example of this is German.
        if (mappings.length > 0 && !workspaceName) {
            throw new TfvcError( {
                message: Strings.NotAnEnuTfCommandLine,
                tfvcErrorCode: TfvcErrorCodes.NotAnEnuTfCommandLine
             });
        }

        const workspace: IWorkspace = {
            name: workspaceName,
            server: collectionUrl,
            defaultTeamProject: teamProject,
            mappings: mappings
        };

        return workspace;
    }

    public GetExeArguments(): IArgumentProvider {
        return this.GetArguments();
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    /**
     * Parses the output of the workfold command (the EXE output is slightly different from the CLC output parsed above)
     * SAMPLE
     * Access denied connecting to TFS server https://account.visualstudio.com/ (authenticating as Personal Access Token)  <-- line is optional
     * =====================================================================================================================================================
     * Workspace : MyNewWorkspace2 (user name)
     * Collection: http://server:8081/tfs/
     * $/tfsTest_01: D:\tmp\test
     */
    public async ParseExeOutput(executionResult: IExecutionResult): Promise<IWorkspace> {
        let workspace: IWorkspace = await this.ParseOutput(executionResult);
        if (workspace && workspace.name) {
            // The workspace name includes the user name, so let's fix that
            const lastOpenParenIndex: number = workspace.name.lastIndexOf(" (");
            if (lastOpenParenIndex >= 0) {
                workspace.name = workspace.name.slice(0, lastOpenParenIndex).trim();
            }
        }
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
