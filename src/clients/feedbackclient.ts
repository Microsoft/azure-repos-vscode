/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Disposable, window } from "vscode";
import { Logger } from "../helpers/logger";
import { TelemetryEvents } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { BaseQuickPickItem } from "../helpers/vscodeutils";
import { Telemetry } from "../services/telemetry";

export class FeedbackClient {

    //This feedback will go no matter whether Application Insights is enabled or not.
    public static async SendFeedback(): Promise<void> {
        try {
            const choices: BaseQuickPickItem[] = [];
            choices.push({ label: Strings.SendASmile, description: undefined, id: TelemetryEvents.SendASmile });
            choices.push({ label: Strings.SendAFrown, description: undefined, id: TelemetryEvents.SendAFrown });

            const choice: BaseQuickPickItem = await window.showQuickPick(choices, { matchOnDescription: false, placeHolder: Strings.SendFeedback });
            if (choice) {
                const value: string = await window.showInputBox({ value: undefined, prompt: Strings.SendFeedbackPrompt, placeHolder: undefined, password: false });
                if (value === undefined) {
                    const disposable = window.setStatusBarMessage(Strings.NoFeedbackSent);
                    setTimeout(() => disposable.dispose(), 1000 * 5);
                    return;
                }

                //This feedback will go no matter whether Application Insights is enabled or not.
                let trimmedValue: string = value.trim();
                if (trimmedValue.length > 1000) {
                    trimmedValue = trimmedValue.substring(0, 1000);
                }
                Telemetry.SendFeedback(choice.id, { "VSCode.Feedback.Comment" : trimmedValue } );

                const disposable: Disposable = window.setStatusBarMessage(Strings.ThanksForFeedback);
                setTimeout(() => disposable.dispose(), 1000 * 5);
            }
        } catch (err) {
            const message: string = Utils.GetMessageForStatusCode(0, err.message, "Failed getting SendFeedback selection");
            Logger.LogError(message);
            Telemetry.SendException(err);
        }
    }
}
