/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import * as cp from "child_process";
import { EventEmitter, Event } from "vscode";
import { IDisposable, toDisposable, dispose } from "./util";
import { IExecutionResult } from "./interfaces";
import { TfvcError, TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { TfvcSettings } from "./tfvcsettings";

var _ = require("underscore");

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
                //TODO localize the message once this code stops changing so much
                throw new TfvcError({
                    message: "The path to the TFVC command line was not found in the user settings. Please set this value.",
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
        }
        //TODO check to make sure that the file exists in that location
        //TODO check the version of TFVC command line

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
        if (!this._tfvcPath) {
            throw new Error("tfvc could not be found in the system.");
        }

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
                message: "Failed to execute tfvc",
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

