/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as cp from "child_process";
import { EventEmitter, Event } from "vscode";
import { Strings } from "../helpers/strings";
import { IDisposable, toDisposable, dispose } from "./util";
import { IExecutionResult } from "./interfaces";
import { TfvcError, TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { TfvcSettings } from "./tfvcsettings";
import { TfvcVersion } from "./tfvcversion";

var _ = require("underscore");
var fs = require("fs");

export class Tfvc {

    private _tfvcPath: string;

    private _onOutput = new EventEmitter<string>();
    public get onOutput(): Event<string> { return this._onOutput.event; }

    public constructor(localPath?: string) {
        if (localPath !== undefined) {
            this._tfvcPath = localPath;
        } else {
            // get the location from settings
            const settings = new TfvcSettings();
            this._tfvcPath = settings.Location;
            if (!this._tfvcPath) {
                throw new TfvcError({
                    message: Strings.TfvcLocationMissingError,
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
        }

        // check to make sure that the file exists in that location
        let exists: boolean = fs.existsSync(this._tfvcPath);
        if (exists) {
            // if it exists, check to ensure that it's a file and not a folder
            const stats: any = fs.lstatSync(this._tfvcPath);
            if (!stats || !stats.isFile()) {
                throw new TfvcError({
                    message: Strings.TfMissingError + this._tfvcPath,
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
        } else {
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
            return;
        }

        // check the version of TFVC command line
        const minVersion: TfvcVersion = TfvcVersion.FromString("14.0.4");
        const curVersion: TfvcVersion = TfvcVersion.FromString(version);
        if (TfvcVersion.Compare(curVersion, minVersion) < 0) {
            throw new TfvcError({
                message: Strings.TfVersionWarning + minVersion.ToString(),
                tfvcErrorCode: TfvcErrorCodes.TfvcMinVersionWarning
            });
        }
    }

    public Open(repositoryRootFolder: string, env: any = {}): Repository {
        return new Repository(this, repositoryRootFolder, env);
    }

    public async Exec(cwd: string, args: string[], options: any = {}): Promise<IExecutionResult> {
        // default to the cwd passed in, but allow options.cwd to overwrite it
        options = _.extend({ cwd }, options || {});
        return await this._exec(args, options);
    }

    private spawn(args: string[], options: any = {}): cp.ChildProcess {
        if (!options) {
            options = {};
        }

        if (!options.stdio && !options.input) {
            options.stdio = ["ignore", null, null]; // Unless provided, ignore stdin and leave default streams for stdout and stderr
        }

        options.env = _.assign({}, process.env, options.env || {});

        if (options.log !== false) {
            this.log(`tf ${args.join(" ")}\n`);
        }

        return cp.spawn(this._tfvcPath, args, options);
    }

    private async _exec(args: string[], options: any = {}): Promise<IExecutionResult> {
        const child = this.spawn(args, options);

        if (options.input) {
            child.stdin.end(options.input, "utf8");
        }

        const result = await Tfvc.execProcess(child);

        if (result.exitCode) {
            let tfvcErrorCode: string = null;

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
            }

            if (options.log !== false) {
                this.log(`${result.stderr}\n`);
            }

            return Promise.reject<IExecutionResult>(new TfvcError({
                message: Strings.TfExecFailedError,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                tfvcErrorCode: tfvcErrorCode,
                tfvcCommand: args[0]
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
