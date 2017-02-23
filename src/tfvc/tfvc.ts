/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as cp from "child_process";
import { TeamServerContext } from "../contexts/servercontext";
import { Logger } from "../helpers/logger";
import { Strings } from "../helpers/strings";
import { IDisposable, toDisposable, dispose } from "./util";
import { IArgumentProvider, IExecutionResult } from "./interfaces";
import { TfvcError, TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { TfvcSettings } from "./tfvcsettings";
import { TfvcVersion } from "./tfvcversion";
import { TfvcOutput } from "./tfvcoutput";

var _ = require("underscore");
import * as fs from "fs";
import * as path from "path";

export class Tfvc {
    private _tfvcPath: string;
    private _proxy: string;
    private _isExe: boolean = false;
    private _minVersion: string = "14.0.4";  //Minimum CLC version

    public constructor(localPath?: string) {
        Logger.LogDebug(`TFVC Creating Tfvc object with localPath='${localPath}'`);
        // Get Proxy from settings
        const settings = new TfvcSettings();
        this._proxy = settings.Proxy;
        Logger.LogDebug(`Using TFS proxy: ${this._proxy}`);

        if (localPath !== undefined) {
            this._tfvcPath = localPath;
        } else {
            // get the location from settings
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
            const stats: fs.Stats = fs.lstatSync(this._tfvcPath);
            if (!stats || !stats.isFile()) {
                Logger.LogWarning(`TFVC ${this._tfvcPath} exists but isn't a file.`);
                throw new TfvcError({
                    message: Strings.TfMissingError + this._tfvcPath,
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
            this._isExe = path.extname(this._tfvcPath) === ".exe";
            if (this._isExe) {
                this._minVersion = "14.102.0";  //Minimum tf.exe version
            }
        } else {
            Logger.LogWarning(`TFVC ${this._tfvcPath} does not exist.`);
            throw new TfvcError({
                message: Strings.TfMissingError + this._tfvcPath,
                tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
            });
        }
    }

    public get isExe(): boolean { return this._isExe; }
    public get Location(): string { return this._tfvcPath; }

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
        const minVersion: TfvcVersion = TfvcVersion.FromString(this._minVersion);
        const curVersion: TfvcVersion = TfvcVersion.FromString(version);
        if (TfvcVersion.Compare(curVersion, minVersion) < 0) {
            Logger.LogWarning(`TFVC ${version} is less that the min version of ${this._minVersion}.`);
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

        // TODO: do we want to handle proxies or not for the EXE? for tf.exe the user could simply setup the proxy at the command line.
        //       tf.exe remembers the proxy settings and uses them as it needs to.
        if (this._proxy && !this._isExe) {
            args.AddProxySwitch(this._proxy);
        }

        Logger.LogDebug(`TFVC: tf ${args.GetArgumentsForDisplay()}`);
        if (options.log !== false) {
            TfvcOutput.AppendLine(`tf ${args.GetArgumentsForDisplay()}`);
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
}
