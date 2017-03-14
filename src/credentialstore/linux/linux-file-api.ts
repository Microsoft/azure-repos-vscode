/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { FileTokenStorage } from "./file-token-storage";
import { Credential } from "../credential";
import { ICredentialStore } from "../interfaces/icredentialstore";

import * as Q from "q";
import * as os from "os";
import * as path from "path";
import * as _ from "underscore";

/*
    Provides the ICredentialStore API on top of file-based storage.
    Does not support any kind of 'prefix' of the credential (since its
    storage mechanism is not shared with either Windows or OSX).

    User must provide a custom folder and custom file name for storage.
 */
export class LinuxFileApi implements ICredentialStore {
    private _folder: string;
    private _filename: string;
    private _fts: FileTokenStorage;

    constructor(folder: string, filename: string) {
        this._folder = folder;
        this._filename = filename;
        this._fts = new FileTokenStorage(path.join(path.join(os.homedir(), this._folder, this._filename)));
    }

    public GetCredential(service: string) : Q.Promise<Credential> {
        let deferred: Q.Deferred<Credential> = Q.defer<Credential>();

        this.loadCredentials().then((entries) => {
            // Find the entry I want based on service
            let entryArray: Array<any> = _.where(entries, { service: service });
            if (entryArray !== undefined && entryArray.length > 0) {
                let credential: Credential = this.createCredential(entryArray[0]);
                deferred.resolve(credential);
            } else {
                deferred.resolve(undefined);
            }
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    public SetCredential(service: string, username: string, password: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this.loadCredentials().then((entries) => {
            // Remove any entries that are the same as the one I'm about to add
            let existingEntries = _.reject(entries, function(elem) {
                return elem.username === username && elem.service === service;
            });
            let newEntry = {
                username: username,
                password: password,
                service: service
            };
            this._fts.AddEntries([ newEntry ], existingEntries).then(() => {
                deferred.resolve(undefined);
            }).catch((err) => {
                deferred.reject(err);
            });
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    public RemoveCredential(service: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this.loadCredentials().then((entries) => {
            // Find the entry being asked to be removed; if found, remove it, save the remaining list
            let existingEntries = _.reject(entries, function(elem) {
                return elem.service === service;
            });
            // TODO: RemoveEntries doesn't do anything with second arg.  For now, do nothing to
            // the api as I'm wrapping it in all its glory.  Could consider later.
            this._fts.RemoveEntries(existingEntries /*, undefined*/).then(() => {
                deferred.resolve(undefined);
            }).catch((err) => {
                deferred.reject(err);
            });
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    public getCredentialByName(service: string, username: string) : Q.Promise<Credential> {
        let deferred: Q.Deferred<Credential> = Q.defer<Credential>();

        this.loadCredentials().then((entries) => {
            // Find the entry I want based on service and username
            let entryArray: Array<any> = _.where(entries, { service: service, username: username });
            if (entryArray !== undefined && entryArray.length > 0) {
                let credential: Credential = this.createCredential(entryArray[0]);
                deferred.resolve(credential);
            } else {
                deferred.resolve(undefined);
            }
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    public removeCredentialByName(service: string, username: string) : Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this.loadCredentials().then((entries) => {
            // Find the entry being asked to be removed; if found, remove it, save the remaining list
            let existingEntries = _.reject(entries, function(elem) {
                if (username === "*") {
                    return elem.service === service;
                } else {
                    return elem.username === username && elem.service === service;
                }
            });
            // TODO: RemoveEntries doesn't do anything with second arg.  For now, do nothing to
            // the api as I'm wrapping it in all its glory.  Could consider later.
            this._fts.RemoveEntries(existingEntries /*, undefined*/).then(() => {
                deferred.resolve(undefined);
            }).catch((err) => {
                deferred.reject(err);
            });
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }

    private createCredential(cred: any) : Credential {
        return new Credential(cred.service, cred.username, cred.password);
    }

    private loadCredentials() : Q.Promise<any> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        this._fts.LoadEntries().then((entries) => {
            deferred.resolve(entries);
        })
        .catch((err) => {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}
