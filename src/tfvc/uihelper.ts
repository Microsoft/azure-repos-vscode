/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { QuickPickItem, window, workspace } from "vscode";
import { IPendingChange } from "./interfaces";

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
            //TODO localize strings
            let item: QuickPickItem = await window.showQuickPick(
                items, { matchOnDescription: true, placeHolder: "Choose a file to open the file." });

            // Finally, find the matching pending change and return it
            if (item) {
                for (let i = 0; i < changes.length; i++) {
                    if (UIHelper.GetRelativePath(changes[i]) === item.detail) {
                        return changes[i];
                    }
                }
            }
        }
        return null;
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
