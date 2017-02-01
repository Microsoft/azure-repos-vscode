/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IRequestHandler } from "vso-node-api/interfaces/common/VsoBaseInterfaces";
import { getBasicHandler } from "vso-node-api/WebApi";
import { getNtlmHandler } from "vso-node-api/WebApi";
import { Constants } from "../helpers/constants";

export class CredentialInfo {
    private _username: string;
    private _password: string;
    private _credentialHandler: IRequestHandler;

    constructor(accessToken: string);
    constructor(username: string, password?: string);
    constructor(username: string, password?: string, domain?: string, workstation?: string);

    constructor(username: string, password?: string, domain?: string, workstation?: string) {
        if (username !== undefined && password !== undefined) {
            // NTLM (we don't support Basic auth)
            this._username = username;
            this._password = password;
            this._credentialHandler = getNtlmHandler(this._username, this._password, domain, workstation);
        } else {
            // Personal Access Token
            this._username = Constants.OAuth;
            this._password = username; //use username since it is first argument to constructor
            this._credentialHandler = getBasicHandler(this._username, this._password);
        }
    }

    public get CredentialHandler() : IRequestHandler {
        return this._credentialHandler;
    }
    public set CredentialHandler(handler : IRequestHandler)  {
        this._credentialHandler = handler;
    }

    public get Username(): string {
        return this._username;
    }

    public get Password(): string {
        return this._password;
    }

}
