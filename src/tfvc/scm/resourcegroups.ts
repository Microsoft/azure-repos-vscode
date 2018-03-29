/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Strings } from "../../helpers/strings";
import { Resource } from "./resource";

export abstract class ResourceGroup {
    get id(): string { return this._id; }
    get label(): string { return this._label; }
    get resources(): Resource[] { return this._resources; }

    public constructor(private _id: string,
                       private _label: string,
                       private _resources: Resource[]) {
    }
}

export class ConflictsGroup extends ResourceGroup {
    static readonly ID = "conflicts";

    constructor(resources: Resource[]) {
        super(ConflictsGroup.ID, Strings.ConflictsGroupName, resources);
    }
}

export class IncludedGroup extends ResourceGroup {
    static readonly ID = "included";

    constructor(resources: Resource[]) {
        super(IncludedGroup.ID, Strings.IncludedGroupName, resources);
    }
}

export class ExcludedGroup extends ResourceGroup {
    static readonly ID = "excluded";

    constructor(resources: Resource[]) {
        super(ExcludedGroup.ID, Strings.ExcludedGroupName, resources);
    }
}
