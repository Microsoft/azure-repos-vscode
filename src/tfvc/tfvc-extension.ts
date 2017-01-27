/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { window, workspace } from "vscode";
import { VsCodeUtils } from "../helpers/vscodeutils";
import { Tfvc } from "./tfvc";
import { Repository } from "./repository";
import { UIHelper } from "./uihelper";
import { IPendingChange } from "./interfaces";

export class TfvcExtension  {
    /**
     * This command runs a status command on the VSCode workspace folder and 
     * displays the results to the user. Selecting one of the files in the list will 
     * open the file in the editor.
     */
    public async TfvcStatus(): Promise<void> {
        // TODO cache the tfvc/repository instances for all commands
        // TODO hook into reinitialize logic like TeamExtension
        if (!workspace || !workspace.rootPath) {
            return;
        }

        try {
            const tfvc: Tfvc = new Tfvc();
            const repo: Repository = tfvc.Open(workspace.rootPath);
            const chosenItem: IPendingChange = await UIHelper.ChoosePendingChange(await repo.GetStatus());
            if (chosenItem) {
                window.showTextDocument(await workspace.openTextDocument(chosenItem.localItem));
            }
        } catch (err) {
            VsCodeUtils.ShowErrorMessage(err);
        }
    }
}
