/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Disposable, OutputChannel, window } from "vscode";

export class TfvcOutput {
    private static _outputChannel: OutputChannel;

    public static async CreateChannel(disposables: Disposable[]): Promise<void> {
        if (TfvcOutput._outputChannel !== undefined) {
            return;
        }

        TfvcOutput._outputChannel = window.createOutputChannel("TFVC");
        if (disposables) {
            disposables.push(TfvcOutput._outputChannel);
        }
    }

    public static AppendLine(line: string) {
        if (TfvcOutput._outputChannel) {
            TfvcOutput._outputChannel.append(line + "\n");
        }
    }

    public static Show() {
        if (TfvcOutput._outputChannel) {
            TfvcOutput._outputChannel.show();
        }
    }
}
