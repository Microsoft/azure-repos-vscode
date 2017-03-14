/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { IRequestHandler } from "vso-node-api/interfaces/common/VsoBaseInterfaces";
import { Constants } from "../helpers/constants";
import { CredentialInfo } from "../info/credentialinfo";
import { TeamServerContext } from "../contexts/servercontext";
import { CredentialStore } from "../credentialstore/credentialstore";

import * as Q from "q";

export class CredentialManager {
    private static _credentialHandler: IRequestHandler;
    private _credentialStore: CredentialStore;

    constructor() {
        // Specify the prefix for use on Windows and Mac.
        // On Linux, create a custom folder and file.
        this._credentialStore = new CredentialStore("team:", ".team", "team-secrets.json");
    }

    public static GetCredentialHandler() : IRequestHandler {
        return CredentialManager._credentialHandler;
    }

    public GetCredentials(context: TeamServerContext, teamServicesToken: string) : Q.Promise<CredentialInfo> {
        let deferred: Q.Deferred<CredentialInfo> = Q.defer<CredentialInfo>();

        this.getCredentials(context).then((credInfo: CredentialInfo) => {
            if (credInfo !== undefined) {
                // Prefer the settings file until folks remove the entry.  So even though we'll store
                // it if it isn't present, use the settings until they remove it.  Otherwise, if they
                // update it, we'll never use the update.
                if (teamServicesToken !== undefined) {
                    credInfo = new CredentialInfo(teamServicesToken);
                }
                CredentialManager._credentialHandler = credInfo.CredentialHandler;
                deferred.resolve(credInfo);
            } else {
                // If I find credentials in settings, store them (migrate them from settings to storage).
                if (teamServicesToken !== undefined) {
                    this.StoreCredentials(context.RepoInfo.Host, Constants.OAuth, teamServicesToken).then(() => {
                        credInfo = new CredentialInfo(teamServicesToken);
                        CredentialManager._credentialHandler = credInfo.CredentialHandler;
                        deferred.resolve(credInfo);
                    }).catch((reason) => {
                        deferred.reject(reason);
                    });
                } else {
                    deferred.resolve(undefined);
                }
            }
        }).catch((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public RemoveCredentials(account: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this._credentialStore.RemoveCredential(account).then(() => {
            deferred.resolve(undefined);
        }).catch((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public StoreCredentials(account: string, username: string, password: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this._credentialStore.SetCredential(account, username, password).then(() => {
            deferred.resolve(undefined);
        }).catch((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    private getCredentials(context:TeamServerContext) : Q.Promise<CredentialInfo> {
        let deferred: Q.Deferred<CredentialInfo> = Q.defer<CredentialInfo>();

        this._credentialStore.GetCredential(context.RepoInfo.Host).then((cred) => {
            if (cred !== undefined) {
                if (context.RepoInfo.IsTeamServices) {
                    deferred.resolve(new CredentialInfo(cred.Password));
                } else if (context.RepoInfo.IsTeamFoundationServer) {
                    let domain: string;
                    let user: string = cred.Username;
                    let pair = user.split("\\");
                    if (pair.length > 1) {
                        domain = pair[0];
                        user = pair[pair.length - 1];
                    }
                    deferred.resolve(new CredentialInfo(user, cred.Password, domain, /*workstation*/ undefined));
                }
            } else {
                deferred.resolve(undefined);
            }
        }).catch((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }
}
