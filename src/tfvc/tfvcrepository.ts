/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../contexts/servercontext";
import { Logger } from "../helpers/logger";
import { ITfvcCommand, IExecutionResult } from "./interfaces";
import { TfCommandLineRunner } from "./tfcommandlinerunner";
import { AutoResolveType, IArgumentProvider, IConflict, IItemInfo, IPendingChange, ISyncResults, ITfCommandLine, IWorkspace } from "./interfaces";
import { Add } from "./commands/add";
import { Checkin } from "./commands/checkin";
import { Delete } from "./commands/delete";
import { FindConflicts } from "./commands/findconflicts";
import { FindWorkspace } from "./commands/findworkspace";
import { GetInfo } from "./commands/getinfo";
import { GetFileContent } from "./commands/getfilecontent";
import { GetVersion } from "./commands/getversion";
import { Rename } from "./commands/rename";
import { ResolveConflicts } from "./commands/resolveconflicts";
import { Status } from "./commands/status";
import { Sync } from "./commands/sync";
import { Undo } from "./commands/undo";
import { TfvcSettings } from "./tfvcsettings";

import * as _ from "underscore";

/**
 * The Repository class allows you to perform TFVC commands on the workspace represented
 * by the repositoryRootFolder.
 */
export class TfvcRepository {
    private _serverContext: TeamServerContext;
    private _tfCommandLine: ITfCommandLine;
    private _repositoryRootFolder: string;
    private _env: any;
    private _versionAlreadyChecked: boolean = false;
    private _settings: TfvcSettings;
    private _isExe: boolean = false;

    public constructor(serverContext: TeamServerContext, tfCommandLine: ITfCommandLine, repositoryRootFolder: string, env: any = {}, isExe: boolean) {
        Logger.LogDebug(`TFVC Repository created with repositoryRootFolder='${repositoryRootFolder}'`);
        this._serverContext = serverContext;
        this._tfCommandLine = tfCommandLine;
        this._repositoryRootFolder = repositoryRootFolder;
        this._env = env;
        this._isExe = isExe;
        this._settings = new TfvcSettings();

        // Add the environment variables that we need to make sure the CLC runs as fast as possible and
        // provides English strings back to us to parse.
        this._env.TF_NOTELEMETRY = "TRUE";
        this._env.TF_ADDITIONAL_JAVA_ARGS = "-Duser.country=US -Duser.language=en";
    }

    public get TfvcLocation(): string {
        return this._tfCommandLine.path;
    }

    public get HasContext(): boolean {
        return this._serverContext !== undefined && this._serverContext.CredentialInfo !== undefined && this._serverContext.RepoInfo.CollectionUrl !== undefined;
    }

    public get IsExe(): boolean {
        return this._isExe;
    }

    public get Path(): string {
        return this._repositoryRootFolder;
    }

    public get RestrictWorkspace(): boolean {
        return this._settings.RestrictWorkspace;
    }

    public async Add(itemPaths: string[]): Promise<string[]> {
        Logger.LogDebug(`TFVC Repository.Add`);
        return this.RunCommand<string[]>(
            new Add(this._serverContext, itemPaths));
    }

    public async Checkin(files: string[], comment: string, workItemIds: number[]): Promise<string> {
        Logger.LogDebug(`TFVC Repository.Checkin`);
        return this.RunCommand<string>(
            new Checkin(this._serverContext, files, comment, workItemIds));
    }

    public async Delete(itemPaths: string[]): Promise<string[]> {
        Logger.LogDebug(`TFVC Repository.Delete`);
        return this.RunCommand<string[]>(
            new Delete(this._serverContext, itemPaths));
    }

    public async FindConflicts(itemPath?: string): Promise<IConflict[]> {
        Logger.LogDebug(`TFVC Repository.FindConflicts`);
        return this.RunCommand<IConflict[]>(
            new FindConflicts(this._serverContext, itemPath ? itemPath : this._repositoryRootFolder));
    }

    public async FindWorkspace(localPath: string): Promise<IWorkspace> {
        Logger.LogDebug(`TFVC Repository.FindWorkspace with localPath='${localPath}'`);
        return this.RunCommand<IWorkspace>(
            new FindWorkspace(localPath, this._settings.RestrictWorkspace));
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
        let statusCommand: Status = new Status(this._serverContext, ignoreFiles === undefined ? true : ignoreFiles);
        //If we're restricting the workspace, pass in the repository root folder to Status
        if (this._settings.RestrictWorkspace) {
            statusCommand = new Status(this._serverContext, ignoreFiles === undefined ? true : ignoreFiles, [this._repositoryRootFolder]);
        }
        return this.RunCommand<IPendingChange[]>(statusCommand);
    }

    public async Rename(sourcePath: string, destinationPath: string): Promise<string> {
        Logger.LogDebug(`TFVC Repository.Rename`);
        return this.RunCommand<string>(
            new Rename(this._serverContext, sourcePath, destinationPath));
    }

    public async ResolveConflicts(itemPaths: string[], autoResolveType: AutoResolveType): Promise<IConflict[]> {
        Logger.LogDebug(`TFVC Repository.ResolveConflicts`);
        return this.RunCommand<IConflict[]>(
            new ResolveConflicts(this._serverContext, itemPaths, autoResolveType));
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
            TfCommandLineRunner.CheckVersion(this._tfCommandLine, version);
            return version;
        }

        return undefined;
    }

    public async RunCommand<T>(cmd: ITfvcCommand<T>): Promise<T> {
        if (this._tfCommandLine.isExe) {
            //This is the tf.exe path
            const result: IExecutionResult = await this.exec(cmd.GetExeArguments(), cmd.GetExeOptions());
            // We will call ParseExeOutput to give the command a chance to handle any specific errors itself.
            const output: T = await cmd.ParseExeOutput(result);
            return output;
        } else {
            //This is the CLC path
            const result: IExecutionResult = await this.exec(cmd.GetArguments(), cmd.GetOptions());
            // We will call ParseOutput to give the command a chance to handle any specific errors itself.
            const output: T = await cmd.ParseOutput(result);
            return output;
        }
    }

    private async exec(args: IArgumentProvider, options: any = {}): Promise<IExecutionResult> {
        options.env = _.assign({}, options.env || {});
        options.env = _.assign(options.env, this._env);
        return await TfCommandLineRunner.Exec(this._tfCommandLine, this._repositoryRootFolder, args, options);
    }
}
