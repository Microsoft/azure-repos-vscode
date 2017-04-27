/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

export class UrlBuilder {

    //Joins multiple paths with '/'. Not intended to use with query params or hashes
    public static Join(baseUrl: string, ...args: string[]): string {
        if (!baseUrl || !args || !args[0]) {
            return baseUrl;
        }

        let finalUrl: string = baseUrl;
        //If we're going to build up a url, pull off final '/', if present
        //If we don't have any args, we don't want to change the finalUrl we'll return
        if (args && args.length > 0 && finalUrl.endsWith("/")) {
            finalUrl = finalUrl.substring(0, finalUrl.length - 1);
        }
        for (let idx: number = 0; idx < args.length; idx++) {
            let arg: string = args[idx];
            //Ensure each arg doesn't start with a '/', we'll be adding those
            if (arg.startsWith("/")) {
                arg = arg.substring(1, arg.length);
            }
            finalUrl = `${finalUrl}/${arg}`;
        }
        return finalUrl;
    }

    public static AddQueryParams(baseUrl: string, ...args: string[]) : string {
        if (!baseUrl || !args || !args[0]) {
            return baseUrl;
        }

        let finalUrl: string = baseUrl;
        //If we're going to build up a url, pull off final '/', if present
        //If we don't have any args, we don't want to change the finalUrl we'll return
        if (args && args.length > 0 && finalUrl.endsWith("/")) {
            finalUrl = finalUrl.substring(0, finalUrl.length - 1);
        }
        for (let idx: number = 0; idx < args.length; idx++) {
            let prefix: string = (idx === 0 ? "?" : "&");

            let arg: string = args[idx];
            if (arg.startsWith("?") || arg.startsWith("&")) {
                arg = arg.substring(1, arg.length);
            }
            finalUrl = `${finalUrl}${prefix}${arg}`;
        }

        return finalUrl;
    }

    public static AddHashes(baseUrl: string, ...args: string[]) : string {
        if (!baseUrl || !args || !args[0]) {
            return baseUrl;
        }

        let finalUrl: string = baseUrl;
        //If we're going to build up a url, pull off final '/', if present
        //If we don't have any args, we don't want to change the finalUrl we'll return
        if (args && args.length > 0 && finalUrl.endsWith("/")) {
            finalUrl = finalUrl.substring(0, finalUrl.length - 1);
        }
        for (let idx: number = 0; idx < args.length; idx++) {
            let prefix: string = (idx === 0 ? "#" : "&");

            let arg: string = args[idx];
            if (arg.startsWith("#") || arg.startsWith("&")) {
                arg = arg.substring(1, arg.length);
            }
            finalUrl = `${finalUrl}${prefix}${arg}`;
        }

        return finalUrl;
    }
}
