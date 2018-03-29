/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { ISettings } from "../../src/helpers/settings";

//Used to test the GitContext, ExternalContext classes
export class SettingsMock implements ISettings {
    /* tslint:disable:variable-name */
    constructor(public AppInsightsEnabled: boolean, public AppInsightsKey: string, public LoggingLevel: string,
                public PollingInterval: number, public RemoteUrl: string, public TeamProject: string, public BuildDefinitionId: number,
                public ShowWelcomeMessage: boolean) {
        //nothing to do
    }
    /* tslint:enable:variable-name */
}
