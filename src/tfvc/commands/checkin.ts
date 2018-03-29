/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext} from "../../contexts/servercontext";
import { IArgumentProvider, IExecutionResult, ITfvcCommand } from "../interfaces";
import { ArgumentBuilder } from "./argumentbuilder";
import { CommandHelper } from "./commandhelper";

/**
 * This command  checks in files into TFVC
 * <p/>
 * checkin [/all] [/author:<value>] [/comment:<value>|@valuefile] [/notes:"note"="value"[;"note2"="value2"[;...]]|@notefile]
 * [/override:<value>|@valuefile] [/recursive] [/validate] [/bypass] [/force] [/noautoresolve] [/associate:<workItemID>[,<workItemID>...]]
 * [/resolve:<workItemID>[,<workItemID>...]] [/saved] [<itemSpec>...]
 */
export class Checkin implements ITfvcCommand<string> {
    private _serverContext: TeamServerContext;
    private _files: string[];
    private _comment: string;
    private _workItemIds: number[];

    public constructor(serverContext: TeamServerContext, files: string[], comment?: string, workItemIds?: number[]) {
        CommandHelper.RequireStringArrayArgument(files, "files");
        this._serverContext = serverContext;
        this._files = files;
        this._comment = comment;
        this._workItemIds = workItemIds;
    }

    public GetArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("checkin", this._serverContext)
            .AddAll(this._files);
        if (this._comment) {
            builder.AddSwitchWithValue("comment", this.getComment(), false);
        }
        if (this._workItemIds && this._workItemIds.length > 0) {
            builder.AddSwitchWithValue("associate", this.getAssociatedWorkItems(), false);
        }
        return builder;
    }

    public GetOptions(): any {
        return {};
    }

    private getComment(): string {
        // replace newlines with spaces
        return this._comment.replace(/\r\n/g, " ").replace(/\n/g, " ");
    }

    private getAssociatedWorkItems(): string {
        return this._workItemIds.join(",");
    }

    /**
     * Returns the files that were checked in
     * <p/>
     * Output example for success:
     * /Users/leantk/tfvc-tfs/tfsTest_01/addFold:
     * Checking in edit: testHere.txt
     * <p/>
     * /Users/leantk/tfvc-tfs/tfsTest_01:
     * Checking in edit: test3.txt
     * Checking in edit: TestAdd.txt
     * <p/>
     * Changeset #20 checked in.
     * <p/>
     * Output example for failure:
     * <p/>
     * /Users/leantk/tfvc-tfs/tfsTest_01:
     * Checking in edit: test3.txt
     * Checking in edit: TestAdd.txt
     * Unable to perform operation on $/tfsTest_01/TestAdd.txt. The item $/tfsTest_01/TestAdd.txt is locked in workspace new;Leah Antkiewicz.
     * No files checked in.
     * <p/>
     * No files checked in.
     */
    public async ParseOutput(executionResult: IExecutionResult): Promise<string> {
        if (executionResult.exitCode === 100) {
            CommandHelper.ProcessErrors(executionResult);
        } else {
            return CommandHelper.GetChangesetNumber(executionResult.stdout);
        }
    }

    public GetExeArguments(): IArgumentProvider {
        const builder: ArgumentBuilder = new ArgumentBuilder("checkin", this._serverContext, true /* skipCollectionOption */)
            .AddAll(this._files);
        if (this._comment) {
            builder.AddSwitchWithValue("comment", this.getComment(), false);
        }
        // TF.EXE doesn't support associating work items with checkin
        //builder.AddSwitchWithValue("associate", this.getAssociatedWorkItems(), false);

        return builder;
    }

    public GetExeOptions(): any {
        return this.GetOptions();
    }

    public async ParseExeOutput(executionResult: IExecutionResult): Promise<string> {
        return await this.ParseOutput(executionResult);
    }
}
