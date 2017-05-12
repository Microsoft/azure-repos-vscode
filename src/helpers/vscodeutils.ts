/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { commands, MessageItem, QuickPickItem, Range, window } from "vscode";
import { Constants } from "./constants";
import { IButtonMessageItem } from "./vscodeutils.interfaces";
import { Utils } from "./utils";
import { Telemetry } from "../services/telemetry";

export class BaseQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    id: string;
}

export class WorkItemQueryQuickPickItem extends BaseQuickPickItem {
    wiql: string;
}

//Any changes to ButtonMessageItem must be reflected in IButtonMessageItem
export class ButtonMessageItem implements MessageItem, IButtonMessageItem {
    title: string;
    url?: string;
    command?: string;
    telemetryId?: string;
}

export class VsCodeUtils {
    //Returns the trimmed value if there's an activeTextEditor and a selection
    public static GetActiveSelection(): string {
        const editor = window.activeTextEditor;
        if (!editor) {
            return undefined;
        }

        // Make sure that the selection is not empty and it is a single line
        const selection = editor.selection;
        if (selection.isEmpty || !selection.isSingleLine) {
            return undefined;
        }

        const range = new Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
        const value = editor.document.getText(range).trim();

        return value;
    }

    //We have a single method to display either simple messages (with no options) or messages
    //that have multiple buttons that can run commands, open URLs, send telemetry, etc.
    public static async ShowErrorMessage(message: string, ...urlMessageItem: IButtonMessageItem[]): Promise<void> {
        //The following "cast" allows us to pass our own type around (and not reference "vscode" via an import)
        const messageItems: ButtonMessageItem[] = <ButtonMessageItem[]>urlMessageItem;
        const messageToDisplay: string = `(${Constants.ExtensionName}) ${Utils.FormatMessage(message)}`;

        //Use the typescript spread operator to pass the rest parameter to showErrorMessage
        const chosenItem: IButtonMessageItem = await window.showErrorMessage(messageToDisplay, ...messageItems);
        if (chosenItem) {
            if (chosenItem.url) {
                Utils.OpenUrl(chosenItem.url);
            }
            if (chosenItem.telemetryId) {
                Telemetry.SendEvent(chosenItem.telemetryId);
            }
            if (chosenItem.command) {
                commands.executeCommand<void>(chosenItem.command);
            }
        }
        return;
    }

    public static ShowWarningMessage(message: string) {
        window.showWarningMessage("(" + Constants.ExtensionName + ") " + Utils.FormatMessage(message));
    }
}
