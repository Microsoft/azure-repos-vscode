/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { MessageItem, QuickPickItem, Range, window } from "vscode";
import { Constants } from "./constants";

import Q = require("q");

export class BaseQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    id: string;
}

export class WorkItemQueryQuickPickItem extends BaseQuickPickItem {
    wiql: string;
}

export class UrlMessageItem implements MessageItem {
    title: string;
    url: string;
    telemetryId: string;
}

export class VsCodeUtils {

    //Returns the trimmed value if there's an activeTextEditor and a selection
    public static GetActiveSelection(): string {
        let editor = window.activeTextEditor;
        if (!editor) {
            return undefined;
        }

        // Make sure that the selection is not empty and it is a single line
        let selection = editor.selection;
        if (selection.isEmpty || !selection.isSingleLine) {
            return undefined;
        }

        let range = new Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
        let value = editor.document.getText(range).trim();

        return value;
    }

    public static FormatMessage(message: string) : string {
        if (message) {
            //Replace newlines with spaces
            return message.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
        }
        return message;
    }

    public static ShowErrorMessage(message: string) {
        window.showErrorMessage("(" + Constants.ExtensionName + ") " + VsCodeUtils.FormatMessage(message));
    }

    //Allow ability to show additional buttons with the message and return any chosen one via Promise
    public static ShowErrorMessageWithOptions(message: string, ...urlMessageItem: UrlMessageItem[]) : Q.Promise<UrlMessageItem> {
        let promiseToReturn: Q.Promise<UrlMessageItem>;
        let deferred = Q.defer<UrlMessageItem>();
        promiseToReturn = deferred.promise;

        //Use the typescript spread operator to pass the rest parameter to showErrorMessage
        window.showErrorMessage("(" + Constants.ExtensionName + ") " + VsCodeUtils.FormatMessage(message), ...urlMessageItem).then((item) => {
            if (item) {
                deferred.resolve(item);
            } else {
                deferred.resolve(undefined);
            }
        });

        return promiseToReturn;
    }

    public static ShowWarningMessage(message: string) {
        window.showWarningMessage("(" + Constants.ExtensionName + ") " + VsCodeUtils.FormatMessage(message));
    }
}
