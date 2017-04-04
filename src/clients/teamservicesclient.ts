/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import basem = require("vso-node-api/ClientApiBases");
import VsoBaseInterfaces = require("vso-node-api/interfaces/common/VsoBaseInterfaces");
export class TeamServicesApi extends basem.ClientApiBase {
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[]) {
            super(baseUrl, handlers, "node-vsts-vscode-api");
        }

    //This calls the vsts/info endpoint (which only exists for Git)
    public async getVstsInfo(): Promise<any> {
        //Create an instance of Promise since we're calling a function with the callback pattern but want to return a Promise
        let promise: Promise<any> = new Promise<any>((resolve, reject) => {
            /* tslint:disable:no-null-keyword */
            this.restClient.getJson(this.vsoClient.resolveUrl("/vsts/info"), "", null, null, function(err: any, statusCode: number, obj: any) {
            /* tslint:enable:no-null-keyword */
                if (err) {
                    err.statusCode = statusCode;
                    reject(err);
                } else {
                    resolve(obj);
                }
            });
        });
        return promise;
    }

    //Used to determine if the baseUrl points to a valid TFVC repository
    public async validateTfvcCollectionUrl(): Promise<any> {
        //Create an instance of Promise since we're calling a function with the callback pattern but want to return a Promise
        let promise: Promise<any> = new Promise<any>((resolve, reject) => {
            /* tslint:disable:no-null-keyword */
            this.restClient.getJson(this.vsoClient.resolveUrl("_apis/tfvc/branches"), "", null, null, function(err: any, statusCode: number, obj: any) {
            /* tslint:enable:no-null-keyword */
                if (err) {
                    err.statusCode = statusCode;
                    reject(err);
                } else {
                    resolve(obj);
                }
            });
        });
        return promise;
    }

}
