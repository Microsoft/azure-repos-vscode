/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { QuickPickItem, window, workspace } from "vscode";
import { Strings } from "../helpers/strings";
import { IPendingChange, ISyncResults, ISyncItemResult, SyncType } from "./interfaces";
import { TfvcOutput } from "./tfvcoutput";

var path = require("path");

export class UIHelper {
    public static async ChoosePendingChange(changes: IPendingChange[]): Promise<IPendingChange> {
        if (changes && changes.length > 0) {
            // First, create an array of quick pick items from the changes
            let items: QuickPickItem[] = [];
            for (let i = 0; i < changes.length; i++) {
                items.push({
                    label: UIHelper.GetFileName(changes[i]),
                    description: changes[i].changeType,
                    detail: UIHelper.GetRelativePath(changes[i])
                    });
            }
            // Then, show the quick pick window and get back the one they chose
            let item: QuickPickItem = await window.showQuickPick(
                items, { matchOnDescription: true, placeHolder: Strings.ChooseItemQuickPickPlaceHolder });

            // Finally, find the matching pending change and return it
            if (item) {
                for (let i = 0; i < changes.length; i++) {
                    if (UIHelper.GetRelativePath(changes[i]) === item.detail) {
                        return changes[i];
                    }
                }
            }
        } else if (changes && changes.length === 0) {
            let items: QuickPickItem[] = [];
            items.push({
                label: Strings.TfNoPendingChanges,
                description: undefined,
                detail: undefined
            });
            await window.showQuickPick(items);
        }
        return undefined;
    }

    /**
     * This method displays the results of the sync command in the output window and optionally in the QuickPick window as well.
     */
    public static async ShowSyncResults(syncResults: ISyncResults, showPopup: boolean, onlyShowErrors) {
        let items: QuickPickItem[] = [];
        if (syncResults.itemResults.length === 0) {
            TfvcOutput.AppendLine(Strings.AllFilesUpToDate);
            items.push({
                label: Strings.AllFilesUpToDate,
                description: undefined,
                detail: undefined
            });
        } else {
            for (let i: number = 0; i < syncResults.itemResults.length; i++) {
                let item: ISyncItemResult = syncResults.itemResults[i];
                if (onlyShowErrors && !UIHelper.isSyncError(item.syncType)) {
                    continue;
                }
                let type: string = this.GetDisplayTextForSyncType(item.syncType);
                TfvcOutput.AppendLine(type + ": " + item.itemPath + " : " + item.message);
                items.push({
                    label: type,
                    description: item.itemPath,
                    detail: item.message
                });
            }
        }
        if (showPopup) {
            await window.showQuickPick(items);
        }
    }

    private static isSyncError(type: SyncType): boolean {
        switch (type) {
            case SyncType.Conflict:
            case SyncType.Error:
            case SyncType.Warning:
                return true;
            case SyncType.Deleted:
            case SyncType.New:
            case SyncType.Updated:
                return false;
            default:
                return false;
        }
    }

    public static GetDisplayTextForSyncType(type: SyncType): string {
        switch (type) {
            case SyncType.Conflict: return Strings.SyncTypeConflict;
            case SyncType.Deleted: return Strings.SyncTypeDeleted;
            case SyncType.Error: return Strings.SyncTypeError;
            case SyncType.New: return Strings.SyncTypeNew;
            case SyncType.Updated: return Strings.SyncTypeUpdated;
            case SyncType.Warning: return Strings.SyncTypeWarning;
            default: return Strings.SyncTypeUpdated;
        }
    }

    public static GetFileName(change: IPendingChange) {
        if (change && change.localItem) {
            var filename = path.parse(change.localItem).base;
            return filename;
        }

        return "";
    }

    public static GetRelativePath(change: IPendingChange) {
        if (change && change.localItem && workspace) {
            return workspace.asRelativePath(change.localItem);
        }

        return change.localItem;
    }
}
