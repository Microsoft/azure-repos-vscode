/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

//jeyou: Based on RestClient from vso-node-api (v5.1.2)
/* tslint:disable */
import { env } from "vscode";
import ifm = require("vso-node-api/interfaces/common/VsoBaseInterfaces");
import { HttpClient } from "./httpclient";

var httpCodes = {
    300: "Multiple Choices",
    301: "Moved Permanantly",
    302: "Resource Moved",
    304: "Not Modified",
    305: "Use Proxy",
    306: "Switch Proxy",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout"
}

export function processResponse(url, res, contents, onResult) {
    if (res.statusCode > 299) {
        // not success
        var msg = httpCodes[res.statusCode] ? "Failed Request: " + httpCodes[res.statusCode] : "Failed Request";
        msg += '(' + res.statusCode + ') - ';

        if (contents && contents.length > 0) {
            var soapObj = contents;

            if (soapObj && soapObj.message) {
                msg += soapObj.message;
            } else {
                msg += url;
            }
        }

        onResult(new Error(msg), res.statusCode, null);
    } else {
        try {
            var soapObj = null;
            if (contents && contents.length > 0) {
                soapObj = contents;
            }
        } catch (e) {

            onResult(new Error('Invalid Resource'), res.statusCode, null);
            return;
        }

        onResult(null, res.statusCode, soapObj);
    }
};

export class SoapClient {
    baseUrl: string;
    basePath: string;
    httpClient: HttpClient;

    constructor(userAgent: string, handlers?: ifm.IRequestHandler[]) {
        this.httpClient = new HttpClient(userAgent, handlers);
    }

    post(url: string, requestEnvelope: string, onResult: (err: any, statusCode: number, obj: any) => void): void {
        this._sendSoap('POST', url, requestEnvelope, onResult);
    }

    _sendSoap(verb: string, url: string, requestEnvelope: string, onResult: (err: any, statusCode: number, obj: any) => void): void {
        let headers: ifm.IHeaders = {};
        headers["Accept-Encoding"] = "gzip"; //Tell the server we'd like to receive a gzip compressed response
        headers["Accept-Language"] = env.language; //"en-US";
        headers["Content-Type"] = "application/soap+xml; charset=utf-8";
        headers["Chunked"] = "false";
        headers["Content-Length"] = requestEnvelope.length;

        this.httpClient.send(verb, url, requestEnvelope, headers, (err: any, res: ifm.IHttpResponse, responseEnvelope: string) => {
            if (err) {
                onResult(err, err.statusCode, null);
                return;
            }

            processResponse(url, res, responseEnvelope, onResult);
        });
    }

}
/* tslint:enable */
