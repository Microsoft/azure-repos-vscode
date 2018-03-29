/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as os from "os";
import * as Q from "q";

import { LinuxFileApi } from "./linux/linux-file-api";
import { OsxKeychainApi } from "./osx/osx-keychain-api";
import { WindowsCredentialStoreApi } from "./win32/win-credstore-api";
import { ICredentialStore } from "./interfaces/icredentialstore";
import { Credential } from "./credential";

/**
 * Implements a credential storage for Windows, Mac (darwin), or Linux.
 *
 * Allows a single credential to be stored per service (that is, one username per service);
 */
export class CredentialStore implements ICredentialStore {
    private _credentialStore: ICredentialStore;
    private _filename: string;
    private _folder: string;
    private _prefix: string;
    private _defaultPrefix: string = "secret:";
    private _defaultFilename: string = "secrets.json";
    private _defaultFolder: string = ".secrets";

    constructor(prefix?: string, folder?: string, filename?: string) {
        if (prefix !== undefined) {
            this._prefix = prefix;
        }
        if (folder !== undefined) {
            this._folder = folder;
        }
        if (filename !== undefined) {
            this._filename = filename;
        }

        // In the case of win32 or darwin, this._folder will contain the prefix.
        switch (os.platform()) {
            case "win32":
                if (prefix === undefined) {
                    this._prefix = this._defaultPrefix;
                }
                this._credentialStore = new WindowsCredentialStoreApi(this._prefix);
                break;
            case "darwin":
                if (prefix === undefined) {
                    this._prefix = this._defaultPrefix;
                }
                this._credentialStore = new OsxKeychainApi(this._prefix);
                break;
            /* tslint:disable:no-switch-case-fall-through */
            case "linux":
            default:
            /* tslint:enable:no-switch-case-fall-through */
                if (folder === undefined) {
                    this._folder = this._defaultFolder;
                }
                if (filename === undefined) {
                    this._filename = this._defaultFilename;
                }
                this._credentialStore = new LinuxFileApi(this._folder, this._filename);
                break;
        }
    }

    public GetCredential(service: string) : Q.Promise<Credential> {
        return this._credentialStore.GetCredential(service);
    }

    public SetCredential(service: string, username: string, password: any) : Q.Promise<void> {
        const deferred: Q.Deferred<void> = Q.defer<void>();

        // First, look to see if we have a credential for this service already.  If so, remove it
        // since we don't know if the user is changing the username or the password (or both) for
        // the particular service.
        this.GetCredential(service).then((cred) => {
            if (cred !== undefined) {
                // On Windows, "*" will delete all matching credentials in one go
                // On Linux, we use 'underscore' to remove the ones we want to remove and save the leftovers
                // On Mac, "*" will find all matches and delete each individually
                this.RemoveCredential(service).then(() => {
                    this._credentialStore.SetCredential(service, username, password).then(() => {
                        deferred.resolve(undefined);
                    }).catch((reason) => {
                        deferred.reject(reason);
                    });
                });
            } else {
                this._credentialStore.SetCredential(service, username, password).then(() => {
                    deferred.resolve(undefined);
                }).catch((reason) => {
                    deferred.reject(reason);
                });
            }
        }).catch((reason) => {
            deferred.reject(reason);
        });
        return deferred.promise;
    }

    public RemoveCredential(service: string) : Q.Promise<void> {
        return this._credentialStore.RemoveCredential(service);
    }

    // Used by tests to ensure certain credentials we create don't exist
    public getCredentialByName(service: string, username: string) : Q.Promise<Credential> {
        return this._credentialStore.getCredentialByName(service, username);
    }

    // Used by tests to remove certain credentials
    public removeCredentialByName(service: string, username: string) : Q.Promise<void> {
        return this._credentialStore.removeCredentialByName(service, username);
    }
}
