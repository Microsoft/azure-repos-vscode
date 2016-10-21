/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { window } from "vscode";
import { BaseClient } from "./baseclient";
import { TelemetryEvents } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { BaseQuickPickItem } from "../helpers/vscodeutils";
import { TelemetryService } from "../services/telemetry";

export class FeedbackClient extends BaseClient {

    constructor(telemetryService: TelemetryService) {
        super(telemetryService);
    }

    //This event *will* honor whether Application Insights is enabled or not.
    public SendEvent(telemetryId: string): void {
        this.ReportEvent(telemetryId, undefined);
    }

    //This feedback will go no matter whether Application Insights is enabled or not.
    public async SendFeedback(): Promise<void> {
        try {
            let choices: BaseQuickPickItem[] = [];
            choices.push({ label: Strings.SendASmile, description: undefined, id: TelemetryEvents.SendASmile });
            choices.push({ label: Strings.SendAFrown, description: undefined, id: TelemetryEvents.SendAFrown });

            let choice: BaseQuickPickItem = await window.showQuickPick(choices, { matchOnDescription: false, placeHolder: Strings.SendFeedback });
            if (choice) {
                let value: string = await window.showInputBox({ value: undefined, prompt: Strings.SendFeedbackPrompt, placeHolder: undefined, password: false });
                if (value === undefined) {
                    let disposable = window.setStatusBarMessage(Strings.NoFeedbackSent);
                    setInterval(() => disposable.dispose(), 1000 * 5);
                    return;
                }

                //User does not need to provide any feedback text
                let providedEmail: string = "";
                let email: string = await window.showInputBox({ value: undefined, prompt: Strings.SendEmailPrompt, placeHolder: undefined, password: false });
                if (email === undefined) {
                    let disposable = window.setStatusBarMessage(Strings.NoFeedbackSent);
                    setInterval(() => disposable.dispose(), 1000 * 5);
                    return;
                }
                if (email) {
                    providedEmail = email;
                }
                //This feedback will go no matter whether Application Insights is enabled or not.
                this.ReportFeedback(choice.id, { "VSCode.Feedback.Comment" : value, "VSCode.Feedback.Email" : providedEmail} );

                let disposable = window.setStatusBarMessage(Strings.ThanksForFeedback);
                setInterval(() => disposable.dispose(), 1000 * 5);
            }
        } catch (err) {
            this.ReportError(Utils.GetMessageForStatusCode(0, err.message, "Failed getting SendFeedback selection"));
        }
    }
}
