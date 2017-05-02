/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { StatusBarItem } from "vscode";
import { Logger } from "../helpers/logger";
import { Telemetry } from "../services/telemetry";
import { TeamServerContext} from "../contexts/servercontext";
import { CommandNames } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { VsCodeUtils } from "../helpers/vscodeutils";

export abstract class BaseClient {
    protected _serverContext: TeamServerContext;
    protected _statusBarItem: StatusBarItem;

    constructor(context: TeamServerContext, statusBarItem: StatusBarItem) {
        this._serverContext = context;
        this._statusBarItem = statusBarItem;
    }

    protected handleError(err: Error, offlineText: string, polling: boolean, infoMessage?: string) : void {
        const offline: boolean = Utils.IsOffline(err);
        const msg: string = Utils.GetMessageForStatusCode(err, err.message);
        const logPrefix: string = (infoMessage === undefined) ? "" : infoMessage + " ";

        //When polling, we never display an error, we only log it (no telemetry either)
        if (polling === true) {
            Logger.LogError(logPrefix + msg);
            if (offline === true) {
                if (this._statusBarItem !== undefined) {
                    this._statusBarItem.text = offlineText;
                    this._statusBarItem.tooltip = Strings.StatusCodeOffline + " " + Strings.ClickToRetryConnection;
                    this._statusBarItem.command = CommandNames.RefreshPollingStatus;
                }
            } else {
                //Could happen if PAT doesn't have proper permissions
                if (this._statusBarItem !== undefined) {
                    this._statusBarItem.text = offlineText;
                    this._statusBarItem.tooltip = msg;
                }
            }
        //If we aren't polling, we always log an error and, optionally, send telemetry
        } else {
            const logMessage: string = logPrefix + msg;
            if (offline === true) {
                Logger.LogError(logMessage);
            } else {
                Logger.LogError(logMessage);
                Telemetry.SendException(err);
            }
            VsCodeUtils.ShowErrorMessage(msg);
        }
    }
}
