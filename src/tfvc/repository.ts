/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { ITfvcCommand, IExecutionResult } from "./interfaces";
import { Tfvc } from "./tfvc";
import { IWorkspace, IPendingChange } from "./interfaces";
import { GetVersion } from "./commands/getversion";
import { FindWorkspace } from "./commands/findworkspace";
import { Status } from "./commands/status";

var _ = require("underscore");

/**
 * The Repository class allows you to perform TFVC commands on the workspace represented 
 * by the repositoryRootFolder.
 */
export class Repository {

    public constructor(
        private _tfvc: Tfvc,
        private repositoryRootFolder: string,
        private env: any = {}
    ) { }

    public get Tfvc(): Tfvc {
        return this._tfvc;
    }

    public get Path(): string {
        return this.repositoryRootFolder;
    }

    public async FindWorkspace(localPath: string): Promise<IWorkspace> {
        return this.RunCommand<IWorkspace>(
            new FindWorkspace(localPath));
    }

    public async GetStatus(): Promise<IPendingChange[]> {
        return this.RunCommand<IPendingChange[]>(
            new Status());
    }

    public async Version(): Promise<string> {
        return this.RunCommand<string>(
            new GetVersion());
    }

    public async RunCommand<T>(cmd: ITfvcCommand<T>): Promise<T> {
        const result = await this.exec(cmd.GetArguments(), cmd.GetOptions());
        return await cmd.ParseOutput(result);
    }

    private async exec(args: string[], options: any = {}): Promise<IExecutionResult> {
        options.env = _.assign({}, options.env || {});
        options.env = _.assign(options.env, this.env);
        return await this.Tfvc.Exec(this.repositoryRootFolder, args, options);
    }
}
