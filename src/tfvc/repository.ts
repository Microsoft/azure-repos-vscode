/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../contexts/servercontext";
import { Logger } from "../helpers/logger";
import { ITfvcCommand, IExecutionResult } from "./interfaces";
import { Tfvc } from "./tfvc";
import { IArgumentProvider, IItemInfo, IWorkspace, IPendingChange, ISyncResults } from "./interfaces";
import { Add } from "./commands/add";
import { Checkin } from "./commands/checkin";
import { FindWorkspace } from "./commands/findworkspace";
import { GetInfo } from "./commands/getinfo";
import { GetFileContent } from "./commands/getfilecontent";
import { GetVersion } from "./commands/getversion";
import { Status } from "./commands/status";
import { Sync } from "./commands/sync";
import { Undo } from "./commands/undo";

var _ = require("underscore");

/**
 * The Repository class allows you to perform TFVC commands on the workspace represented 
 * by the repositoryRootFolder.
 */
export class Repository {
    private _serverContext: TeamServerContext;
    private _tfvc: Tfvc;
    private _repositoryRootFolder: string;
    private _env: any;
    private _versionAlreadyChecked = false;

    public constructor(serverContext: TeamServerContext, tfvc: Tfvc, repositoryRootFolder: string, env: any = {}) {
        Logger.LogDebug(`TFVC Repository created with repositoryRootFolder='${repositoryRootFolder}'`);
        this._serverContext = serverContext;
        this._tfvc = tfvc;
        this._repositoryRootFolder = repositoryRootFolder;
        this._env = env;

        // Add the environment variables that we need to make sure the CLC runs as fast as possible and
        // provides English strings back to us to parse.
        this._env.TF_NOTELEMETRY = "TRUE";
        this._env.TF_ADDITIONAL_JAVA_ARGS = "-Duser.country=US -Duser.language=en";
    }

    public get Tfvc(): Tfvc {
        return this._tfvc;
    }

    public get Path(): string {
        return this._repositoryRootFolder;
    }

    public async Checkin(files: string[], comment: string, workItemIds: number[]): Promise<string> {
        Logger.LogDebug(`TFVC Repository.Checkin`);
        return this.RunCommand<string>(
            new Checkin(this._serverContext, files, comment, workItemIds));
    }

    public async Add(itemPaths: string[]): Promise<string[]> {
        Logger.LogDebug(`TFVC Repository.Add`);
        return this.RunCommand<string[]>(
            new Add(this._serverContext, itemPaths));
    }

    public async FindWorkspace(localPath: string): Promise<IWorkspace> {
        Logger.LogDebug(`TFVC Repository.FindWorkspace with localPath='${localPath}'`);
        return this.RunCommand<IWorkspace>(
            new FindWorkspace(localPath));
    }

    public async GetInfo(itemPaths: string[]): Promise<IItemInfo[]> {
        Logger.LogDebug(`TFVC Repository.GetInfo`);
        return this.RunCommand<IItemInfo[]>(
            new GetInfo(this._serverContext, itemPaths));
    }

    public async GetFileContent(itemPath: string, versionSpec?: string): Promise<string> {
        Logger.LogDebug(`TFVC Repository.GetFileContent`);
        return this.RunCommand<string>(
            new GetFileContent(this._serverContext, itemPath, versionSpec, true));
    }

    public async GetStatus(ignoreFiles?: boolean): Promise<IPendingChange[]> {
        Logger.LogDebug(`TFVC Repository.GetStatus`);
        return this.RunCommand<IPendingChange[]>(
            new Status(this._serverContext, ignoreFiles === undefined ? true : ignoreFiles));
    }

    public async Sync(itemPaths: string[], recursive: boolean): Promise<ISyncResults> {
        Logger.LogDebug(`TFVC Repository.Sync`);
        return this.RunCommand<ISyncResults>(
            new Sync(this._serverContext, itemPaths, recursive));
    }

    public async Undo(itemPaths: string[]): Promise<string[]> {
        Logger.LogDebug(`TFVC Repository.Undo`);
        return this.RunCommand<string[]>(
            new Undo(this._serverContext, itemPaths));
    }

    public async CheckVersion(): Promise<string> {
        if (!this._versionAlreadyChecked) {
            Logger.LogDebug(`TFVC Repository.CheckVersion`);
            // Set the versionAlreadyChecked flag first in case one of the other lines throws
            this._versionAlreadyChecked = true;
            const version: string = await this.RunCommand<string>(new GetVersion());
            this._tfvc.CheckVersion(version);
            return version;
        }

        return undefined;
    }

    public async RunCommand<T>(cmd: ITfvcCommand<T>): Promise<T> {
        const result: IExecutionResult = await this.exec(cmd.GetArguments(), cmd.GetOptions());
        // We will call ParseOutput to give the command a chance to handle any specific errors itself.
        const output: T = await cmd.ParseOutput(result);
        return output;
    }

    private async exec(args: IArgumentProvider, options: any = {}): Promise<IExecutionResult> {
        options.env = _.assign({}, options.env || {});
        options.env = _.assign(options.env, this._env);
        return await this.Tfvc.Exec(this._repositoryRootFolder, args, options);
    }
}
