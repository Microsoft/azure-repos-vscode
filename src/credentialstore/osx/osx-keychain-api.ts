/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Credential } from "../credential";
import { ICredentialStore } from "../interfaces/icredentialstore";

import * as Q from "q";

/* tslint:disable:no-var-keyword */
var osxkeychain = require("./osx-keychain");
/* tslint:enable:no-var-keyword */

/*
    Provides the ICredentialStore API on top of OSX keychain-based storage.

    User can provide a custom prefix for the credential.
 */
export class OsxKeychainApi implements ICredentialStore {
    private _prefix: string;

    constructor(credentialPrefix: string) {
        if (credentialPrefix !== undefined) {
            this._prefix = credentialPrefix;
            osxkeychain.setPrefix(credentialPrefix);
        }
    }

    public GetCredential(service: string) : Q.Promise<Credential> {
        let deferred: Q.Deferred<Credential> = Q.defer<Credential>();
        let credential: Credential;

        // To get the credential, I must first list all of the credentials we previously
        // stored there.  Find the one we want, then go and ask for the secret.
        this.listCredentials().then((credentials) => {
            // Spin through the returned credentials to ensure I got the one I want
            // based on passed in 'service'
            for (let index = 0; index < credentials.length; index++) {
                if (credentials[index].Service === service) {
                    credential = credentials[index];
                    break;
                }
            }
            if (credential !== undefined) {
                //Go get the password
                osxkeychain.get(credential.Username, credential.Service, function(err, cred) {
                    if (err) {
                        deferred.reject(err);
                    }
                    if (cred !== undefined) {
                        credential = new Credential(credential.Service, credential.Username, cred);
                        deferred.resolve(credential);
                    }
                });
            } else {
                deferred.resolve(undefined);
            }
        }).fail((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public SetCredential(service: string, username: string, password: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        // I'm not supporting a description so pass "" for that parameter
        osxkeychain.set(username, service, "" /*description*/, password, function(err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(undefined);
            }
        });
        return deferred.promise;
    }

    public RemoveCredential(service: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this.removeCredentials(service).then(() => {
            deferred.resolve(undefined);
        })
        .fail((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public getCredentialByName(service: string, username: string) : Q.Promise<Credential> {
        let deferred: Q.Deferred<Credential> = Q.defer<Credential>();
        let credential: Credential;

        // To get the credential, I must first list all of the credentials we previously
        // stored there.  Find the one we want, then go and ask for the secret.
        this.listCredentials().then((credentials) => {
            // Spin through the returned credentials to ensure I got the one I want
            // based on passed in 'service'
            for (let index = 0; index < credentials.length; index++) {
                if (credentials[index].Service === service && credentials[index].Username === username) {
                    credential = credentials[index];
                    break;
                }
            }
            if (credential !== undefined) {
                //Go get the password
                osxkeychain.get(credential.Username, credential.Service, function(err, cred) {
                    if (err) {
                        deferred.reject(err);
                    }
                    if (cred !== undefined) {
                        credential = new Credential(credential.Service, credential.Username, cred);
                        deferred.resolve(credential);
                    }
                });
            } else {
                deferred.resolve(undefined);
            }
        }).fail((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public removeCredentialByName(service: string, username: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        // if username === "*", we need to remove all credentials for this service.
        if (username === "*") {
            this.removeCredentials(service).then(() => {
                deferred.resolve(undefined);
            })
            .fail((reason) => {
                deferred.reject(reason);
            });
        } else {
            osxkeychain.remove(username, service, "" /*description*/, function(err) {
                if (err) {
                    if (err.code !== undefined && err.code === 44) {
                        // If credential is not found, don't fail.
                        deferred.resolve(undefined);
                    } else {
                        deferred.reject(err);
                    }
                } else {
                    deferred.resolve(undefined);
                }
            });
        }
        return deferred.promise;
    }

    private removeCredentials(service: string): Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        // listCredentials will return all of the credentials for this prefix and service
        this.listCredentials(service).then((creds) => {
            if (creds !== undefined && creds.length > 0) {
                // Remove all of these credentials
                let promises: Q.Promise<void>[] = [];
                creds.forEach((cred) => {
                    promises.push(this.removeCredentialByName(cred.Service, cred.Username));
                });
                Q.all(promises).then(() => {
                    deferred.resolve(undefined);
                });
            } else {
                deferred.resolve(undefined);
            }
        });
        return deferred.promise;
    }

    private listCredentials(service? : string) : Q.Promise<Array<Credential>> {
        let deferred: Q.Deferred<Array<Credential>> = Q.defer<Array<Credential>>();
        let credentials: Array<Credential> = [];

        let stream = osxkeychain.list();
        stream.on("data", (cred) => {
            // Don't return all credentials, just ones that start
            // with our prefix and optional service
            if (cred.svce !== undefined) {
                if (cred.svce.indexOf(this._prefix) === 0) {
                    let svc: string = cred.svce.substring(this._prefix.length);
                    let username: string = cred.acct;
                    //password is undefined because we don't have it yet
                    let credential: Credential = new Credential(svc, username, undefined);

                    // Only add the credential if we want them all or it's a match on service
                    if (service === undefined || service === svc) {
                        credentials.push(credential);
                    }
                }
            }
        });
        stream.on("end", () => {
            deferred.resolve(credentials);
        });
        stream.on("error", (error) => {
            console.log(error);
            deferred.reject(error);
        });

        return deferred.promise;
    }
}
