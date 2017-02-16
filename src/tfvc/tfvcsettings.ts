/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { BaseSettings } from "../helpers/settings";

export class TfvcSettings extends BaseSettings {
    private _location: string;
    private _proxy: string;

    constructor() {
        super();

        this._location = this.readSetting<string>(SettingNames.Location, undefined);
        this._proxy = this.readSetting<string>(SettingNames.Proxy, undefined);
    }

    public get Location(): string {
        return this._location;
    }

    public get Proxy(): string {
        return this._proxy;
    }

}

class SettingNames {
    public static get Location(): string { return "tfvc.location"; }
    public static get Proxy(): string { return "tfvc.proxy"; }
}
