/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Constants } from "../helpers/constants";
import { Settings } from "../helpers/settings";
import { TeamServerContext } from "../contexts/servercontext";

import appInsights = require("applicationinsights");
import uuid = require("uuid");

import * as os from "os";
import * as crypto from "crypto";

export class Telemetry {
    private static _appInsightsClient: Client;
    private static _serverContext: TeamServerContext;
    private static _telemetryEnabled: boolean = true;
    //Default to a new uuid in case the extension fails before being initialized
    private static _userId: string =  "UNKNOWN";
    private static _sessionId: string = uuid.v4(); //The sessionId can be updated later
    private static _productionKey: string = "44267cbb-b9ba-4bce-a37a-338588aa4da3";

    //Initialize can be called multiple times.  Initially, we have no information about the user but
    //still want to send telemetry.  Once we have user information, we want to update the Telemetry
    //service with that more specific information.  At the same time, we want global/static access
    //to the Telemetry service so we can send telemetry from just about anywhere at anytime.
    public static Initialize(settings: Settings, context?: TeamServerContext): void {
        Telemetry._serverContext = context;
        Telemetry._telemetryEnabled = settings.AppInsightsEnabled;

        // Always initialize Application Insights
        let insightsKey: string = Telemetry._productionKey;
        if (settings.AppInsightsKey !== undefined) {
            insightsKey = settings.AppInsightsKey;
        }

        appInsights.setup(insightsKey)
                    .setAutoCollectConsole(false)
                    .setAutoCollectPerformance(false)
                    .setAutoCollectRequests(false)
                    .setAutoCollectExceptions(false)
                    .start();
        Telemetry._appInsightsClient = appInsights.getClient(insightsKey);
        //Need to use HTTPS with v0.15.16 of App Insights
        Telemetry._appInsightsClient.config.endpointUrl = "https://dc.services.visualstudio.com/v2/track";

        Telemetry.setUserId();

        //Assign common properties to all telemetry sent from the default client
        Telemetry.setCommonProperties();
    }

    public static SendEvent(event: string, properties?: any): void {
        Telemetry.ensureInitialized();

        if (Telemetry._telemetryEnabled === true) {
            Telemetry._appInsightsClient.trackEvent(event, properties);
        }
    }

    public static SendFeedback(event: string, properties?: any): void {
        Telemetry.ensureInitialized();

        // SendFeedback doesn't honor the _telemetryEnabled flag
        Telemetry._appInsightsClient.trackEvent(event, properties);
    }

    public static SendException(err: Error, properties?: any): void {
        Telemetry.ensureInitialized();

        if (Telemetry._telemetryEnabled === true) {
            Telemetry._appInsightsClient.trackException(err, properties);
        }
    }

    //Make sure we're calling it after initializing
    private static ensureInitialized(): void {
        if (Telemetry._appInsightsClient === undefined) {
            throw new Error("Telemetry service was called before being initialized.");
        }
    }

    //Will generate a consistent ApplicationInsights userId
    private static setUserId(): void {
        let username: string = "UNKNOWN";
        let hostname: string = "UNKNOWN";

        if (os.userInfo().username) {
            username = os.userInfo().username;
        }
        if (os.hostname()) {
            hostname = os.hostname();
        }

        const value: string = `${username}@${hostname}-VSTS`;
        Telemetry._userId = crypto.createHash("sha1").update(value).digest("hex");
    }

    private static setCommonProperties(): void {
        Telemetry._appInsightsClient.commonProperties = {
            "VSTS.TeamFoundationServer.IsHostedServer" : Telemetry._serverContext === undefined ? "UNKNOWN" : Telemetry._serverContext.RepoInfo.IsTeamServices.toString(),
            "VSTS.TeamFoundationServer.ServerId" : Telemetry._serverContext === undefined ? "UNKNOWN" : Telemetry._serverContext.RepoInfo.Host,
            "VSTS.TeamFoundationServer.Protocol" : Telemetry._serverContext === undefined ? "UNKNOWN" : Telemetry._serverContext.RepoInfo.Protocol,
            "VSTS.Core.Machine.OS.Platform" : os.platform(),
            "VSTS.Core.Machine.OS.Type" : os.type(),
            "VSTS.Core.Machine.OS.Release" : os.release(),
            "VSTS.Core.User.Id" : Telemetry._userId,
            "Plugin.Version" : Constants.ExtensionVersion
        };

        //Set the userid on the AI context so that we can get user counts in the telemetry
        const aiUserId: string = Telemetry._appInsightsClient.context.keys.userId;
        Telemetry._appInsightsClient.context.tags[aiUserId] = Telemetry._userId;

        const aiSessionId: string = Telemetry._appInsightsClient.context.keys.sessionId;
        Telemetry._appInsightsClient.context.tags[aiSessionId] = Telemetry._sessionId;
    }
}
