/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as cp from "child_process";
import { EventEmitter, Event } from "vscode";
import { TeamServerContext } from "../contexts/servercontext";
import { Logger } from "../helpers/logger";
import { Strings } from "../helpers/strings";
import { IDisposable, toDisposable, dispose } from "./util";
import { IArgumentProvider, IExecutionResult } from "./interfaces";
import { TfvcError, TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { TfvcSettings } from "./tfvcsettings";
import { TfvcVersion } from "./tfvcversion";

var _ = require("underscore");
var fs = require("fs");

export class Tfvc {

    private _tfvcPath: string;
    public get Location(): string { return this._tfvcPath; }

    private _onOutput = new EventEmitter<string>();
    public get onOutput(): Event<string> { return this._onOutput.event; }

    public constructor(localPath?: string) {
        Logger.LogDebug(`TFVC Creating Tfvc object with localPath='${localPath}'`);
        if (localPath !== undefined) {
            this._tfvcPath = localPath;
        } else {
            // get the location from settings
            const settings = new TfvcSettings();
            this._tfvcPath = settings.Location;
            Logger.LogDebug(`TFVC Retrieved from settings; localPath='${this._tfvcPath}'`);
            if (!this._tfvcPath) {
                Logger.LogWarning(`TFVC Couldn't find where the TF command lives on disk.`);
                throw new TfvcError({
                    message: Strings.TfvcLocationMissingError,
                    tfvcErrorCode: TfvcErrorCodes.TfvcLocationMissing
                });
            }
        }

        // check to make sure that the file exists in that location
        let exists: boolean = fs.existsSync(this._tfvcPath);
        if (exists) {
            // if it exists, check to ensure that it's a file and not a folder
            const stats: any = fs.lstatSync(this._tfvcPath);
            if (!stats || !stats.isFile()) {
                Logger.LogWarning(`TFVC ${this._tfvcPath} exists but isn't a file.`);
                throw new TfvcError({
                    message: Strings.TfMissingError + this._tfvcPath,
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
        } else {
            Logger.LogWarning(`TFVC ${this._tfvcPath} does not exist.`);
            throw new TfvcError({
                message: Strings.TfMissingError + this._tfvcPath,
                tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
            });
        }
    }

    /**
     * This method checks the version of the CLC against the minimum version that we expect.
     * It throws an error if the version does not meet or exceed the minimum.
     */
    public CheckVersion(version: string) {
        if (!version) {
            // If the version isn't set just return
            Logger.LogDebug(`TFVC CheckVersion called without a version.`);
            return;
        }

        // check the version of TFVC command line
        const minVersion: TfvcVersion = TfvcVersion.FromString("14.0.4");
        const curVersion: TfvcVersion = TfvcVersion.FromString(version);
        if (TfvcVersion.Compare(curVersion, minVersion) < 0) {
            Logger.LogWarning(`TFVC ${version} is less that the min version of 14.0.4.`);
            throw new TfvcError({
                message: Strings.TfVersionWarning + minVersion.ToString(),
                tfvcErrorCode: TfvcErrorCodes.TfvcMinVersionWarning
            });
        }
    }

    /**
     * Call open to get the repository object that allows you to perform TFVC commands.
     */
    public Open(serverContext: TeamServerContext, repositoryRootFolder: string, env: any = {}): Repository {
        return new Repository(serverContext, this, repositoryRootFolder, env);
    }

    public async Exec(cwd: string, args: IArgumentProvider, options: any = {}): Promise<IExecutionResult> {
        // default to the cwd passed in, but allow options.cwd to overwrite it
        options = _.extend({ cwd }, options || {});
        return await this._exec(args, options);
    }

    private spawn(args: IArgumentProvider, options: any = {}): cp.ChildProcess {
        if (!options) {
            options = {};
        }

        if (!options.stdio && !options.input) {
            options.stdio = ["ignore", null, null]; // Unless provided, ignore stdin and leave default streams for stdout and stderr
        }

        options.env = _.assign({}, process.env, options.env || {});

        Logger.LogDebug(`TFVC: tf ${args.GetArgumentsForDisplay()}`);
        if (options.log !== false) {
            this.log(`tf ${args.GetArgumentsForDisplay()}\n`);
        }

        return cp.spawn(this._tfvcPath, args.GetArguments(), options);
    }

    private async _exec(args: IArgumentProvider, options: any = {}): Promise<IExecutionResult> {
        const child = this.spawn(args, options);

        if (options.input) {
            child.stdin.end(options.input, "utf8");
        }

        const result = await Tfvc.execProcess(child);
        Logger.LogDebug(`TFVC exit code: ${result.exitCode}`);

        if (result.exitCode) {
            let tfvcErrorCode: string = null;
            let message: string;

            if (/Authentication failed/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.AuthenticationFailed;
            } else if (/workspace could not be determined/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.NotATfvcRepository;
            } else if (/bad config file/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.BadConfigFile;
            } else if (/cannot make pipe for command substitution|cannot create standard input pipe/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.CantCreatePipe;
            } else if (/Repository not found/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.RepositoryNotFound;
            } else if (/unable to access/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.CantAccessRemote;
            } else if (/project collection URL to use could not be determined/i.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.NotATfvcRepository;
                message = Strings.NotATfvcRepository;
            } else if (/Access denied connecting.*authenticating as OAuth/i.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.AuthenticationFailed;
                message = Strings.TokenNotAllScopes;
            } else if (/'java' is not recognized as an internal or external command/.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.TfvcNotFound;
                message = Strings.TfInitializeFailureError;
            } else if (/There is no working folder mapping/i.test(result.stderr)) {
                tfvcErrorCode = TfvcErrorCodes.FileNotInMappings;
            }

            Logger.LogDebug(`TFVC errors: ${result.stderr}`);
            if (options.log !== false) {
                this.log(`${result.stderr}\n`);
            }

            return Promise.reject<IExecutionResult>(new TfvcError({
                message: message || Strings.TfExecFailedError,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                tfvcErrorCode: tfvcErrorCode,
                tfvcCommand: args.GetCommand()
            }));
        }

        return result;
    }

    private static async execProcess(child: cp.ChildProcess): Promise<IExecutionResult> {
        const disposables: IDisposable[] = [];

        const once = (ee: NodeJS.EventEmitter, name: string, fn: Function) => {
            ee.once(name, fn);
            disposables.push(toDisposable(() => ee.removeListener(name, fn)));
        };

        const on = (ee: NodeJS.EventEmitter, name: string, fn: Function) => {
            ee.on(name, fn);
            disposables.push(toDisposable(() => ee.removeListener(name, fn)));
        };

        const [exitCode, stdout, stderr] = await Promise.all<any>([
            new Promise<number>((c, e) => {
                once(child, "error", e);
                once(child, "exit", c);
            }),
            new Promise<string>(c => {
                const buffers: string[] = [];
                on(child.stdout, "data", b => buffers.push(b));
                once(child.stdout, "close", () => c(buffers.join("")));
            }),
            new Promise<string>(c => {
                const buffers: string[] = [];
                on(child.stderr, "data", b => buffers.push(b));
                once(child.stderr, "close", () => c(buffers.join("")));
            })
        ]);

        dispose(disposables);

        return { exitCode, stdout, stderr };
    }

    private log(output: string): void {
        this._onOutput.fire(output);
    }
}
