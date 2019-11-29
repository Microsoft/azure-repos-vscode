/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { BuildResult } from "vso-node-api/interfaces/BuildInterfaces";
import { Strings } from "./strings";
import * as vscode from "vscode";

import * as fs from "fs";
import * as path from "path";
import * as open from "open";
import * as opener from "opener";

export class Utils {

    public static FormatMessage(message: string): string {
        if (message) {
            //Replace newlines with spaces
            return message.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
        }
        return message;
    }

    //gitDir provided for unit testing purposes
    public static FindGitFolder(startingPath: string, gitDir?: string): string {
        if (!fs.existsSync(startingPath)) { return undefined; }

        let gitPath: string;
        let lastPath: string;
        let currentPath: string = startingPath;

        do {
            gitPath = path.join(currentPath, gitDir || ".git");

            if (fs.existsSync(gitPath)) {
              return gitPath;
            }

            lastPath = currentPath;
            currentPath = path.resolve(currentPath, "..");
        } while (lastPath !== currentPath);

        return undefined;
    }

    //Returns the icon string to use for a particular BuildResult
    public static GetBuildResultIcon(result: BuildResult) : string {
        switch (result) {
            case BuildResult.Succeeded:
                return "check";
            case BuildResult.Canceled:
                return "alert";
            case BuildResult.Failed:
                return "stop";
            case BuildResult.PartiallySucceeded:
                return "alert";
            case BuildResult.None:
                return "question";
            default:
                return "question";
        }
    }

    //Returns a particular message for a particular reason.  Otherwise, returns the optional prefix + message
    public static GetMessageForStatusCode(reason: any, message?: string, prefix?: string) : string {
        let msg: string = undefined;
        if (prefix === undefined) {
            msg = "";
        } else {
            msg = prefix + " ";
        }

        let statusCode: string = "0";
        if (reason.statusCode !== undefined) {
            statusCode = reason.statusCode.toString();
        } else if (reason.code !== undefined) {
            statusCode = reason.code;
        }

        switch (statusCode) {
            case "401":
                msg = msg + Strings.StatusCode401;
                break;
            case "ENOENT":
            case "ENOTFOUND":
            case "EAI_AGAIN":
                msg = msg + Strings.StatusCodeOffline;
                break;
            case "ECONNRESET":
            case "ECONNREFUSED":
                if (this.IsProxyEnabled()) {
                    msg = msg + Strings.ProxyUnreachable;
                    break;
                }
                return message;
            default:
                return message;
        }

        return msg;
    }

    //Use some common error codes to indicate offline status
    public static IsProxyEnabled(): boolean {
        if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
            return true;
        }
        return false;
    }

    public static IsProxyIssue(reason: any): boolean {
        // If the proxy isn't enabled/set, it can't be a proxy issue
        if (!this.IsProxyEnabled()) {
            return false;
        }

        // If proxy is set, check for error codes
        if (reason !== undefined) {
            if (reason.code === "ECONNRESET" || reason.code === "ECONNREFUSED") {
                return true;
            }
            if (reason.statusCode === "ECONNRESET" || reason.statusCode === "ECONNREFUSED") {
                return true;
            }
        }

        return false;
    }

    //Use some common error codes to indicate offline status
    public static IsOffline(reason: any): boolean {
        if (reason !== undefined) {
            if (reason.code === "ENOENT" || reason.code === "ENOTFOUND" || reason.code === "EAI_AGAIN") {
                return true;
            }
            if (reason.statusCode === "ENOENT" || reason.statusCode === "ENOTFOUND" || reason.statusCode === "EAI_AGAIN") {
                return true;
            }
        }
        return false;
    }

    //Use some common error codes to indicate unauthorized status
    public static IsUnauthorized(reason: any): boolean {
        if (reason !== undefined) {
            if (reason.code === 401 || reason.statusCode === 401) {
                return true;
            }
        }
        return false;
    }

    //Use open for Windows and Mac, opener for Linux
    public static OpenUrl(url: string) : void {
        // Use the built in VS Code openExternal function if present.
        if ((<any>vscode.env).openExternal) {
            (<any>vscode.env).openExternal(vscode.Uri.parse(url));
            return;
        }

        // Fallback to other node modules for old versions of VS Code
        switch (process.platform) {
            case "win32":
            case "darwin":
                open(url);
                break;
            default:
                opener(url);
                break;
        }
    }
}
