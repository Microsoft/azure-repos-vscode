/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as path from "path";

import { Command, SourceControlResourceState, SourceControlResourceDecorations, Uri } from "vscode";
import { IConflict, IPendingChange } from "../interfaces";
import { TfvcSCMProvider } from "../tfvcscmprovider";
import { ConflictType, GetStatuses, Status } from "./status";
import { DecorationProvider } from "./decorationprovider";
import { Strings } from "../../helpers/strings";
import { TfvcCommandNames } from "../../helpers/constants";

export class Resource implements SourceControlResourceState {
    private _uri: Uri;
    private _statuses: Status[];
    private _change: IPendingChange;
    private _version: string;
    private _conflictType: ConflictType;

    constructor(change: IPendingChange, conflict: IConflict) {
        this._change = change;
        this._uri = Uri.file(change.localItem);
        this._statuses = GetStatuses(change.changeType);
        this._version = change.version;
        if (conflict) {
            this._statuses.push(Status.CONFLICT);
            this._conflictType = conflict.type;
        }
    }

    public get PendingChange(): IPendingChange { return this._change; }
    public get Statuses(): Status[] { return this._statuses; }
    public get ConflictType(): ConflictType { return this._conflictType; }

    public HasStatus(status: Status): boolean {
        return this._statuses.findIndex((s) => s === status) >= 0;
    }

    get IsVersioned(): boolean { return this._version !== "0"; }

    /**
     * This method gets a vscode file uri that represents the server path and version that the local item is based on.
     */
    public GetServerUri(): Uri {
        const serverItem: string = this._change.sourceItem ? this._change.sourceItem : this._change.serverItem;
        // For conflicts set the version to "T"ip so that we will compare against the latest version
        const versionSpec: string = this.HasStatus(Status.CONFLICT) ? "T" : "C" + this._change.version;
        return Uri.file(serverItem).with({ scheme: TfvcSCMProvider.scmScheme, query: versionSpec });
    }

    public GetTitle(): string {
        const basename = path.basename(this._change.localItem);
        const sourceBasename = this._change.sourceItem ? path.basename(this._change.sourceItem) : "";

        if (this.HasStatus(Status.CONFLICT)) {
            switch (this._conflictType) {
                case ConflictType.CONTENT:
                case ConflictType.MERGE:
                case ConflictType.RENAME:
                case ConflictType.NAME_AND_CONTENT:
                    if (this.HasStatus(Status.ADD)) {
                        return `${basename} (${Strings.ConflictAlreadyExists})`;
                    }
                    // Use the default title for all other cases
                    break;
                case ConflictType.DELETE:
                    return `${basename} (${Strings.ConflictAlreadyDeleted})`;
                case ConflictType.DELETE_TARGET:
                    return `${basename} (${Strings.ConflictDeletedLocally})`;
            }
        }

        if (this.HasStatus(Status.RENAME)) {
            return sourceBasename ? `${basename} <- ${sourceBasename}` : `${basename}`;
        } else if (this.HasStatus(Status.EDIT)) {
            return `${basename}`;
        }

        return "";
    }

    /* Implement SourceControlResourceState */
    get resourceUri(): Uri { return this._uri; }
    get decorations(): SourceControlResourceDecorations {
        // TODO Add conflict type to the resource constructor and pass it here
        return DecorationProvider.getDecorations(this._statuses);
    }
    //Set the command to invoke when a Resource is selected in the viewlet
    get command(): Command {
        return { command: TfvcCommandNames.Open, title: "Open", arguments: [this] };
    }
}
