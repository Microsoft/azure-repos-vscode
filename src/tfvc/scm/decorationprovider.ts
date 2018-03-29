/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { SourceControlResourceDecorations, Uri } from "vscode";
import { ConflictType, Status } from "./status";
import * as path from "path";

export class DecorationProvider {
    private static _iconsRootPath: string = path.join(path.dirname(__dirname), "..", "..", "resources", "icons");

    public static getDecorations(statuses: Status[], conflictType?: ConflictType): SourceControlResourceDecorations {
        const status: Status = this.getDominantStatus(statuses);
        const light = { iconPath: DecorationProvider.getIconPath(status, "light") };
        const dark = { iconPath: DecorationProvider.getIconPath(status, "dark") };

        return { strikeThrough: DecorationProvider.useStrikeThrough(status, conflictType), light, dark };
    }

    private static getDominantStatus(statuses: Status[]) {
        if (!statuses || statuses.length === 0) {
            return undefined;
        }

        // if there's only one just return it
        if (statuses.length === 1) {
            return statuses[0];
        }

        // The most dominant types are ADD, EDIT, and DELETE
        let index: number = statuses.findIndex((s) => s === Status.ADD || s === Status.EDIT || s === Status.DELETE);
        if (index >= 0) {
            return statuses[index];
        }

        // The next dominant type is RENAME
        index = statuses.findIndex((s) => s === Status.RENAME);
        if (index >= 0) {
            return statuses[index];
        }

        // After that, just return the first one
        return statuses[0];
    }

    private static getIconUri(iconName: string, theme: string): Uri {
        return Uri.file(path.join(DecorationProvider._iconsRootPath, theme, `${iconName}.svg`));
    }

    private static getIconPath(status: Status, theme: string): Uri | undefined {
        switch (status) {
            case Status.ADD: return DecorationProvider.getIconUri("status-add", theme);
            case Status.BRANCH: return DecorationProvider.getIconUri("status-branch", theme);
            case Status.DELETE: return DecorationProvider.getIconUri("status-delete", theme);
            case Status.EDIT: return DecorationProvider.getIconUri("status-edit", theme);
            case Status.LOCK: return DecorationProvider.getIconUri("status-lock", theme);
            case Status.MERGE: return DecorationProvider.getIconUri("status-merge", theme);
            case Status.RENAME: return DecorationProvider.getIconUri("status-rename", theme);
            case Status.UNDELETE: return DecorationProvider.getIconUri("status-undelete", theme);
            default: return void 0;
        }
    }

    private static useStrikeThrough(status: Status, conflictType: ConflictType): boolean {
        return (status === Status.DELETE) ||
               (status === Status.MERGE &&
                (conflictType === ConflictType.DELETE || conflictType === ConflictType.DELETE_TARGET));
    }
}
