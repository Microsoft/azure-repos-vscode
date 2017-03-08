/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Settings } from "../helpers/settings";
import { TeamServerContext } from "../contexts/servercontext";

import appInsights = require("applicationinsights");
import uuid = require("node-uuid");

import * as os from "os";

export class Telemetry {
    private static _appInsightsClient: Client;
    private static _serverContext: TeamServerContext;
    private static _telemetryEnabled: boolean = true;
    private static _extensionVersion: string = "1.115.0";
    private static _collectionId: string = "UNKNOWN"; //The collectionId can be updated later
    //Default to a new uuid in case the extension fails before being initialized
    private static _userId: string = uuid.v1(); //The userId can be updated later
    private static _sessionId: string = uuid.v4(); //The sessionId can be updated later
    private static _productionKey: string = "44267cbb-b9ba-4bce-a37a-338588aa4da3";

    //Initialize can be called multiple times.  Initially, we have no information about the user but
    //still want to send telemetry.  Once we have user information, we want to update the Telemetry
    //service with that more specific information.  At the same time, we want global/static access
    //to the Telemetry service so we can send telemetry from just about anywhere at anytime.
    public static Initialize(settings: Settings, context?: TeamServerContext) : void {
        Telemetry._serverContext = context;
        Telemetry._telemetryEnabled = settings.AppInsightsEnabled;

        // Always initialize Application Insights
        let insightsKey = Telemetry._productionKey;
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

    public static SendException(message: string, properties?: any): void {
        Telemetry.ensureInitialized();

        if (Telemetry._telemetryEnabled === true) {
            Telemetry._appInsightsClient.trackException(new Error(message), properties);
        }
    }

    //Updates the collectionId and userId originally set when constructed.  We need the telemetry
    //service before we actually have collectionId and userId.  Due to fallback when vsts/info api
    //is missing, collectionId could be undefined.
    public static Update(collectionId: string, userId: string) {
        Telemetry.ensureInitialized();

        if (collectionId !== undefined) {
            Telemetry._collectionId = collectionId;
        }
        if (userId !== undefined) {
            Telemetry._userId = userId;
            //If we change the userId, we also want to associate a new sessionId
            Telemetry._sessionId = uuid.v4();
        }
        Telemetry.setCommonProperties();
    }

    //Make sure we're calling it after initializing
    private static ensureInitialized() : void {
        if (Telemetry._appInsightsClient === undefined) {
            throw new Error("Telemetry service was called before being initialized.");
        }
    }

    private static setCommonProperties(): void {
        Telemetry._appInsightsClient.commonProperties = {
            "VSTS.TeamFoundationServer.IsHostedServer" : Telemetry._serverContext === undefined ? "UNKNOWN" : Telemetry._serverContext.RepoInfo.IsTeamServices.toString(),
            "VSTS.TeamFoundationServer.ServerId" : Telemetry._serverContext === undefined ? "UNKNOWN" : Telemetry._serverContext.RepoInfo.Host,
            "VSTS.TeamFoundationServer.CollectionId": Telemetry._collectionId,
            "VSTS.Core.Machine.OS.Platform" : os.platform(),
            "VSTS.Core.Machine.OS.Type" : os.type(),
            "VSTS.Core.Machine.OS.Release" : os.release(),
            "VSTS.Core.User.Id" : Telemetry._userId,
            "Plugin.Version" : Telemetry._extensionVersion
        };

        //Set the userid on the AI context so that we can get user counts in the telemetry
        let aiUserId = Telemetry._appInsightsClient.context.keys.userId;
        Telemetry._appInsightsClient.context.tags[aiUserId] = Telemetry._userId;

        let aiSessionId = Telemetry._appInsightsClient.context.keys.sessionId;
        Telemetry._appInsightsClient.context.tags[aiSessionId] = Telemetry._sessionId;
    }
}
