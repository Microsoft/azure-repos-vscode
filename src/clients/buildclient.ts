/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { StatusBarItem } from "vscode";
import { Build, BuildBadge, BuildResult, BuildStatus } from "vso-node-api/interfaces/BuildInterfaces";
import { Logger } from "../helpers/logger";
import { BuildService } from "../services/build";
import { Telemetry } from "../services/telemetry";
import { TeamServerContext} from "../contexts/servercontext";
import { CommandNames, TelemetryEvents, WellKnownRepositoryTypes } from "../helpers/constants";
import { Strings } from "../helpers/strings";
import { Utils } from "../helpers/utils";
import { VsCodeUtils } from "../helpers/vscodeutils";
import { IRepositoryContext, RepositoryType } from "../contexts/repositorycontext";

export class BuildClient {
    private _serverContext: TeamServerContext;
    private _statusBarItem: StatusBarItem;
    private _buildSummaryUrl: string;

    constructor(context: TeamServerContext, statusBarItem: StatusBarItem) {
        this._serverContext = context;
        this._statusBarItem = statusBarItem;
    }

    //Gets any available build status information and adds it to the status bar
    public async DisplayCurrentBuildStatus(context: IRepositoryContext, polling: boolean, definitionId?: number): Promise<void> {
        try {
            let svc: BuildService = new BuildService(this._serverContext);
            Logger.LogInfo("Getting current build from badge...");
            let buildBadge: BuildBadge;
            if (context.Type === RepositoryType.GIT) {
                buildBadge = await svc.GetBuildBadge(this._serverContext.RepoInfo.TeamProject, WellKnownRepositoryTypes.TfsGit, this._serverContext.RepoInfo.RepositoryId, context.CurrentRef);
            } else if (context.Type === RepositoryType.TFVC || context.Type === RepositoryType.EXTERNAL && !definitionId) {
                //If either TFVC or External and no definition Id, show default builds page
                buildBadge = await this.getTfvcBuildBadge(svc, this._serverContext.RepoInfo.TeamProject);
            } else if (definitionId) {
                //TODO: Allow definitionId to override Git and TFVC defaults (above)?
                let builds: Build[] = await svc.GetBuildsByDefinitionId(this._serverContext.RepoInfo.TeamProject, definitionId);
                if (builds.length > 0) {
                    buildBadge = { buildId: builds[0].id, imageUrl: undefined };
                } else {
                    Logger.LogInfo(`Found zero builds for definition id ${definitionId}`);
                }
            }
            if (buildBadge && buildBadge.buildId !== undefined) {
                Logger.LogInfo("Found build id " + buildBadge.buildId.toString() + ". Getting build details...");
                let build: Build = await svc.GetBuildById(buildBadge.buildId);
                this._buildSummaryUrl = BuildService.GetBuildSummaryUrl(this._serverContext.RepoInfo.TeamProjectUrl, build.id.toString());
                Logger.LogInfo("Build summary info: " + build.id.toString() + " " + BuildStatus[build.status] +
                    " " + BuildResult[build.result] + " " + this._buildSummaryUrl);

                if (this._statusBarItem !== undefined) {
                    let icon: string = Utils.GetBuildResultIcon(build.result);
                    this._statusBarItem.command = CommandNames.OpenBuildSummaryPage;
                    this._statusBarItem.text = `$(icon octicon-package) ` + `$(icon ${icon})`;
                    this._statusBarItem.tooltip = "(" + BuildResult[build.result] + ") " + Strings.NavigateToBuildSummary + " " + build.buildNumber;
                }
            } else {
                Logger.LogInfo("No builds were found for team " + this._serverContext.RepoInfo.TeamProject.toString() +
                    ", repo id " + this._serverContext.RepoInfo.RepositoryId.toString() + ", + branch " + (!context.CurrentBranch ? "UNKNOWN" : context.CurrentBranch.toString()));
                if (this._statusBarItem !== undefined) {
                    this._statusBarItem.command = CommandNames.OpenBuildSummaryPage;
                    this._statusBarItem.text = `$(icon octicon-package) ` + `$(icon octicon-dash)`;
                    this._statusBarItem.tooltip = context.Type === RepositoryType.GIT ? Strings.NoBuildsFound : Strings.NoTfvcBuildsFound;
                }
            }
        } catch (err) {
            this.handleError(err, polling, "Failed to get current build status");
        }
    }

    //Gets the appropriate build for TFVC repositories and returns a 'BuildBadge' for it
    private async getTfvcBuildBadge(svc: BuildService, teamProjectId: string): Promise<BuildBadge> {
        //Create an build that doesn't exist and use as the default
        let emptyBuild: BuildBadge = { buildId: undefined, imageUrl: undefined };

        let builds: Build[] = await svc.GetBuilds(teamProjectId);
        if (builds.length === 0) {
            return emptyBuild;
        }

        let matchingBuild: Build;
        for (let idx = 0; idx < builds.length; idx++) {
            let b: Build = builds[idx];
            // Ignore canceled builds
            if (b.result === BuildResult.Canceled) {
                continue;
            }
            if (b.repository &&
                b.repository.type.toLowerCase() === "tfsversioncontrol") {
                    matchingBuild = b;
                    break;
            }
        }
        if (matchingBuild) {
            //We dont' use imageUrl (which is a SVG) since we don't actually render the badge.
            return { buildId: matchingBuild.id, imageUrl: undefined };
        }
        return emptyBuild;
    }

    public OpenBuildSummaryPage(): void {
        Telemetry.SendEvent(TelemetryEvents.OpenBuildSummaryPage);
        let url: string = this._buildSummaryUrl;
        if (url === undefined) {
            Logger.LogInfo("No build summary available, using build definitions url.");
            url = BuildService.GetBuildDefinitionsUrl(this._serverContext.RepoInfo.TeamProjectUrl);
        }
        Logger.LogInfo("OpenBuildSummaryPage: " + url);
        Utils.OpenUrl(url);
    }

    private handleError(reason: any, polling: boolean, infoMessage?: string) : void {
        let offline: boolean = Utils.IsOffline(reason);
        let msg: string = Utils.GetMessageForStatusCode(reason, reason.message);
        let logPrefix: string = (infoMessage === undefined) ? "" : infoMessage + " ";

        //When polling, we never display an error, we only log it (no telemetry either)
        if (polling === true) {
            Logger.LogError(logPrefix + msg);
            if (offline === true) {
                if (this._statusBarItem !== undefined) {
                    this._statusBarItem.text = BuildClient.GetOfflineBuildStatusText();
                    this._statusBarItem.tooltip = Strings.StatusCodeOffline + " " + Strings.ClickToRetryConnection;
                    this._statusBarItem.command = CommandNames.RefreshPollingStatus;
                }
            } else {
                //Could happen if PAT doesn't have proper permissions
                if (this._statusBarItem !== undefined) {
                    this._statusBarItem.text = BuildClient.GetOfflineBuildStatusText();
                    this._statusBarItem.tooltip = msg;
                }
            }
        //If we aren't polling, we always log an error and, optionally, send telemetry
        } else {
            let logMessage: string = logPrefix + msg;
            if (offline === true) {
                Logger.LogError(logMessage);
            } else {
                Logger.LogError(logMessage);
                Telemetry.SendException(logMessage);
            }
            VsCodeUtils.ShowErrorMessage(msg);
        }
    }

    public static GetOfflineBuildStatusText() : string {
        return `$(icon octicon-package) ` + `???`;
    }
}
