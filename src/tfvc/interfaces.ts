/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IButtonMessageItem } from "../helpers/vscodeutils.interfaces";
import { ConflictType } from "./scm/status";

export interface ITfCommandLine {
    path: string;
    minVersion: string;
    proxy: string;
    isExe: boolean;
}

export interface IItemInfo {
    serverItem: string;
    localItem: string;
    localVersion?: string;
    serverVersion?: string;
    change?: string;
    type?: string;
    lock?: string;
    lockOwner?: string;
    deletionId?: string;
    lastModified?: string;
    fileType?: string;
    fileSize?: string;
}

export interface ICheckinInfo {
    comment: string;
    files: string[];
    serverItems: string[];
    workItemIds: number[];
}

export interface IWorkspace {
    name: string;
    server: string;
    computer?: string;
    owner?: string;
    comment?: string;
    mappings: IWorkspaceMapping[];
    defaultTeamProject: string;
}

export interface IWorkspaceMapping {
    serverPath: string;
    localPath: string;
    cloaked: boolean;
}

export interface IPendingChange {
    changeType: string;
    computer: string;
    date: string;
    localItem: string;
    sourceItem: string;
    lock: string;
    owner: string;
    serverItem: string;
    version: string;
    workspace: string;
    isCandidate: boolean;
}

export enum SyncType {
    Updated,
    New,
    Deleted,
    Conflict,
    Warning,
    Error
}

export interface ISyncItemResult {
    syncType: SyncType;
    itemPath: string;
    message?: string;
}

export interface ISyncResults {
    hasErrors: boolean;
    hasConflicts: boolean;
    itemResults: ISyncItemResult[];
}

export interface IConflict {
    localPath: string;
    type: ConflictType;
    message: string;
}

export enum AutoResolveType {
    AutoMerge,
    TakeTheirs,
    KeepYours,
    OverwriteLocal,
    DeleteConflict,
    KeepYoursRenameTheirs
}

export interface IExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface ITfvcErrorData {
    error?: Error;
    message?: string;
    messageOptions?: IButtonMessageItem[];
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    tfvcErrorCode?: string;
    tfvcCommand?: string;
}

export interface IArgumentProvider {
    AddProxySwitch(proxy: string);
    GetCommand(): string;
    GetArguments(): string[];
    GetCommandLine(): string;
    GetArgumentsForDisplay(): string;
}

export interface ITfvcCommand<T> {
    GetArguments(): IArgumentProvider;
    GetExeArguments(): IArgumentProvider;
    GetOptions(): any;
    GetExeOptions(): any;
    ParseOutput(executionResult: IExecutionResult): Promise<T>;
    ParseExeOutput(executionResult: IExecutionResult): Promise<T>;
}
