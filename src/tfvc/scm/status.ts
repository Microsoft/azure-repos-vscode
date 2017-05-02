/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

export function GetStatuses(statusText: string): Status[] {
    const result: Status[] = [];
    if (!statusText) {
        return result;
    }

    const statusStrings: string[] = statusText.split(",");
    for (let i: number = 0; i < statusStrings.length; i++) {
        switch (statusStrings[i].trim().toLowerCase()) {
            case "add": result.push(Status.ADD); break;
            case "branch": result.push(Status.BRANCH); break;
            case "delete": result.push(Status.DELETE); break;
            case "edit": result.push(Status.EDIT); break;
            case "lock": result.push(Status.LOCK); break;
            case "merge": result.push(Status.MERGE); break;
            case "rename": result.push(Status.RENAME); break;
            case "source rename": result.push(Status.RENAME); break;
            case "undelete": result.push(Status.UNDELETE); break;
            default:
                result.push(Status.UNKNOWN); break;
        }
    }

    return result;
}

export enum Status {
    ADD,
    RENAME,
    EDIT,
    DELETE,
    UNDELETE,
    LOCK,
    BRANCH,
    MERGE,
    CONFLICT,
    UNKNOWN
}

export enum ConflictType {
    CONTENT,
    RENAME,
    DELETE,
    DELETE_TARGET,
    NAME_AND_CONTENT,
    MERGE,
    RESOLVED
}
