/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { SCMResource, SCMResourceDecorations, Uri } from "vscode";
import { IPendingChange } from "../interfaces";
import { TfvcSCMProvider } from "../tfvcscmprovider";
import { GetStatuses, Status } from "./status";
import { DecorationProvider } from "./decorationprovider";

export class Resource implements SCMResource {
    private _uri: Uri;
    private _statuses: Status[];
    private _change: IPendingChange;
    private _version: string;

    constructor(change: IPendingChange) {
        this._change = change;
        this._uri = Uri.file(change.localItem);
        this._statuses = GetStatuses(change.changeType);
        this._version = change.version;
    }

    public get PendingChange(): IPendingChange { return this._change; }
    public get Statuses(): Status[] { return this._statuses; }

    public HasStatus(status: Status): boolean {
        return this._statuses.findIndex(s => s === status) >= 0;
    }

    get IsVersioned(): boolean { return this._version !== "0"; }

    /**
     * This method gets a vscode file uri that represents the server path and version that the local item is based on.
     */
    public GetServerUri(): Uri {
        const serverItem: string = this._change.sourceItem ? this._change.sourceItem : this._change.serverItem;
        const versionSpec: string = "C" + this._change.version;
        return Uri.file(serverItem).with({ scheme: TfvcSCMProvider.scmScheme, query: versionSpec });
    }

    /* Implement SCMResource */
    get uri(): Uri { return this._uri; }
    get decorations(): SCMResourceDecorations {
        // TODO Add conflict type to the resource constructor and pass it here
        return DecorationProvider.getDecorations(this._statuses);
    }
}
