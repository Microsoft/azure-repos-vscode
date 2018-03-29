/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { Uri, EventEmitter, Event, Disposable, ProgressLocation, window } from "vscode";
import { Telemetry } from "../../services/telemetry";
import { TfvcTelemetryEvents } from "../../helpers/constants";
import { TfvcRepository } from "../tfvcrepository";
import { filterEvent } from "../util";
import { Resource } from "./resource";
import { ResourceGroup, IncludedGroup, ExcludedGroup, ConflictsGroup } from "./resourcegroups";
import { IConflict, IPendingChange } from "../interfaces";
import { ConflictType, Status } from "./status";
import { TfvcOutput } from "../tfvcoutput";

import * as _ from "underscore";
import * as path from "path";

export class Model implements Disposable {
    private _disposables: Disposable[] = [];
    private _repositoryRoot: string;
    private _repository: TfvcRepository;
    private _statusAlreadyInProgress: boolean;
    private _explicitlyExcluded: string[] = [];

    private _onDidChange = new EventEmitter<void>();
    public get onDidChange(): Event<void> {
        return this._onDidChange.event;
    }

    private _conflictsGroup = new ConflictsGroup([]);
    private _includedGroup = new IncludedGroup([]);
    private _excludedGroup = new ExcludedGroup([]);

    public constructor(repositoryRoot: string, repository: TfvcRepository, onWorkspaceChange: Event<Uri>) {
        this._repositoryRoot = repositoryRoot;
        this._repository = repository;
        //filterEvent should return false if an event is to be filtered
        const onNonGitChange = filterEvent(onWorkspaceChange, (uri) => {
            if (!uri || !uri.fsPath) {
                return false;
            }
            // Ignore files that aren't under this._repositoryRoot (e.g., settings.json)
            const isSubFolder: boolean = uri.fsPath.normalize().startsWith(path.normalize(this._repositoryRoot));
            // Ignore workspace changes that take place in the .tf or $tf folder (where path contains /.tf/ or \$tf\)
            const isTfFolder: boolean = !/\/\.tf\//.test(uri.fsPath) && !/\\\$tf\\/.test(uri.fsPath);
            // Attempt to ignore the team-extension.log file directly
            const isLogFile: boolean = !(path.basename(uri.fsPath) === "team-extension.log");
            return isSubFolder && isTfFolder && isLogFile;
        });
        onNonGitChange(this.onFileSystemChange, this, this._disposables);
    }

    public dispose() {
        if (this._disposables) {
            this._disposables.forEach((d) => d.dispose());
            this._disposables = [];
        }
    }

    public get ConflictsGroup(): ConflictsGroup { return this._conflictsGroup; }
    public get IncludedGroup(): IncludedGroup { return this._includedGroup; }
    public get ExcludedGroup(): ExcludedGroup { return this._excludedGroup; }

    public get Resources(): ResourceGroup[] {
        const result: ResourceGroup[] = [];
        if (this._conflictsGroup.resources.length > 0) {
            result.push(this._conflictsGroup);
        }
        result.push(this._includedGroup);
        result.push(this._excludedGroup);
        return result;
    }

    private async status(): Promise<void> {
        if (this._statusAlreadyInProgress) {
            return;
        }
        this._statusAlreadyInProgress = true;
        try {
            await this.run(undefined);
        } finally {
            this._statusAlreadyInProgress = false;
        }
    }

    private onFileSystemChange(/*TODO: uri: Uri*/): void {
        this.status();
    }

    private async run(fn: () => Promise<void>): Promise<void> {
        return window.withProgress({ location: ProgressLocation.SourceControl }, async () => {
            if (fn) {
                await fn();
            } else {
                Promise.resolve();
            }
            await this.update();
        });
    }

    //Add the items to the explicitly excluded list.
    public async Exclude(paths: string[]): Promise<void> {
        if (paths && paths.length > 0) {
            paths.forEach((path) => {
                const normalizedPath: string = path.toLowerCase();
                if (!_.contains(this._explicitlyExcluded, normalizedPath)) {
                    this._explicitlyExcluded.push(normalizedPath);
                }
            });
            await this.update();
        }
    }

    //Unexclude doesn't explicitly INclude.  It defers to the status of the individual item.
    public async Unexclude(paths: string[]): Promise<void> {
        if (paths && paths.length > 0) {
            paths.forEach((path) => {
                const normalizedPath: string = path.toLowerCase();
                if (_.contains(this._explicitlyExcluded, normalizedPath)) {
                    this._explicitlyExcluded = _.without(this._explicitlyExcluded, normalizedPath);
                }
            });
            await this.update();
        }
    }

    public async Refresh(): Promise<void> {
        await this.update();
    }

    private async update(): Promise<void> {
        const changes: IPendingChange[] = await this._repository.GetStatus();
        let foundConflicts: IConflict[] = [];

        // Without any server context we can't run delete or resolve commands
        if (this._repository.HasContext) {
            // Get the list of conflicts
            //TODO: Optimize out this call unless it is needed. This call takes over 4 times longer than the status call and is unecessary most of the time.
            foundConflicts = await this._repository.FindConflicts();
            foundConflicts.forEach((conflict) => {
                if (conflict.message) {
                    TfvcOutput.AppendLine(`[Resolve] ${conflict.message}`);
                }
            });
        }

        const conflict: IConflict = foundConflicts.find((c) => c.type === ConflictType.NAME_AND_CONTENT || c.type === ConflictType.RENAME);
        if (conflict) {
            if (conflict.type === ConflictType.RENAME) {
                Telemetry.SendEvent(TfvcTelemetryEvents.RenameConflict);
            } else {
                Telemetry.SendEvent(TfvcTelemetryEvents.NameAndContentConflict);
            }
        }

        const included: Resource[] = [];
        const excluded: Resource[] = [];
        const conflicts: Resource[] = [];

        changes.forEach((raw) => {
            const conflict: IConflict = foundConflicts.find((c) => this.conflictMatchesPendingChange(raw, c));
            const resource: Resource = new Resource(raw, conflict);

            if (resource.HasStatus(Status.CONFLICT)) {
                return conflicts.push(resource);
            } else {
                //If explicitly excluded, that has highest priority
                if (_.contains(this._explicitlyExcluded, resource.resourceUri.fsPath.toLowerCase())) {
                    return excluded.push(resource);
                }
                //Versioned changes should always be included (as long as they're not deletes)
                if (resource.IsVersioned && !resource.HasStatus(Status.DELETE)) {
                    return included.push(resource);
                }
                //Pending changes should be included
                if (!resource.PendingChange.isCandidate) {
                    return included.push(resource);
                }
                //Others:
                //Candidate changes should be excluded
                return excluded.push(resource);
            }
        });

        this._conflictsGroup = new ConflictsGroup(conflicts);
        this._includedGroup = new IncludedGroup(included);
        this._excludedGroup = new ExcludedGroup(excluded);

        this._onDidChange.fire();
    }

    private conflictMatchesPendingChange(change: IPendingChange, conflict: IConflict): boolean {
        let result: boolean = false;
        if (change && change.localItem && conflict && conflict.localPath) {
            // TODO: If resource or conflict are renames we have a lot more work to do
            //       We are postponing this work for now until we have evidence that it happens a lot
            let path2: string = conflict.localPath;
            // If path2 is relative then assume it is relative to the repo root
            if (!path.isAbsolute(path2)) {
                path2 = path.join(this._repositoryRoot, path2);
            }
            // First compare the source item
            result = change.localItem.toLowerCase() === path2.toLowerCase();
        }
        return result;
    }
}
