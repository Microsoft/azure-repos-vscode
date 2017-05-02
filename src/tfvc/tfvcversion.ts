/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

/**
 * This class represents the Version of the TF command line.
 */
export class TfvcVersion {
    private static separator: string = ".";

    private _major: number;
    private _minor: number;
    private _revision: number;
    private _build: string;

    public static FromString(version: string): TfvcVersion {
        const parts: string[] = version ? version.split(TfvcVersion.separator) : [];
        const major: number = parts.length >= 1 ? Number(parts[0]) : 0;
        const minor: number = parts.length >= 2 ? Number(parts[1]) : 0;
        const revision: number = parts.length >= 3 ? Number(parts[2]) : 0;
        const build: string = parts.length >= 4 ? parts.slice(3).join(TfvcVersion.separator) : "";
        return new TfvcVersion(major, minor, revision, build);
    }

    public static Compare(version1: TfvcVersion, version2: TfvcVersion): number {
        if (version1._major !== version2._major) {
            return version1._major - version2._major;
        }
        if (version1._minor !== version2._minor) {
            return version1._minor - version2._minor;
        }
        if (version1._revision !== version2._revision) {
            return version1._revision - version2._revision;
        }
        return 0;
    }

    public constructor(major: number, minor: number, revision: number, build: string) {
        this._major = major;
        this._minor = minor;
        this._revision = revision;
        this._build = build;
    }

    public get Major(): number { return this._major; }
    public get Minor(): number { return this._minor; }
    public get Revision(): number { return this._revision; }
    public get Build(): string { return this._build; }

    public ToString(): string {
        return this._major + TfvcVersion.separator + this._minor + TfvcVersion.separator + this._revision +
            (this._build ? TfvcVersion.separator + this._build : "");
    }
}
