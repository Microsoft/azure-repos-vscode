/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as os from "os";
import { BaseSettings } from "../helpers/settings";

//TODO: Consider making this class 'static' so we can get values wherever we need them. Be aware
//that if we take a transitive reference to VSCode, the unit tests for the commands we use this
//class from will no longer run.
export class TfvcSettings extends BaseSettings {
    private _location: string;
    private _proxy: string;
    private _restrictWorkspace: boolean;

    constructor() {
        super();

        this._location = this.readSetting<string>(SettingNames.Location, undefined);
        // Support replacing leading ~/ on macOS and linux
        if (this._location && this._location.startsWith("~/") &&
            (os.platform() === "darwin" || os.platform() === "linux")) {
            this._location = this._location.replace(/^~(\/)/, `${os.homedir()}$1`);
        }
        if (this._location) {
            this._location = this._location.trim();
        }
        this._proxy = this.readSetting<string>(SettingNames.Proxy, undefined);
        this._restrictWorkspace = this.readSetting<boolean>(SettingNames.RestrictWorkspace, false);
    }

    public get Location(): string {
        return this._location;
    }

    public get Proxy(): string {
        return this._proxy;
    }

    public get RestrictWorkspace(): boolean {
        return this._restrictWorkspace;
    }
}

class SettingNames {
    public static get Location(): string { return "tfvc.location"; }
    public static get Proxy(): string { return "tfvc.proxy"; }
    public static get RestrictWorkspace(): string { return "tfvc.restrictWorkspace"; }
}
