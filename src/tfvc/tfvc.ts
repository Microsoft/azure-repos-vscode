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
import { IArgumentProvider, IExecutionResult, ITfvc } from "./interfaces";
import { TfvcError, TfvcErrorCodes } from "./tfvcerror";
import { Repository } from "./repository";
import { TfvcSettings } from "./tfvcsettings";
import { TfvcVersion } from "./tfvcversion";
import { TfvcOutput } from "./tfvcoutput";
import { Telemetry } from "../services/telemetry";
import { TfvcTelemetryEvents } from "../helpers/constants";

var _ = require("underscore");
import * as fs from "fs";
import * as path from "path";

/**
 * This is a static class that facilitates running the TFVC command line.
 * To use this class create a repository object or call Exec directly.
 */
export class Tfvc {
    /**
     * Call this method to get the repository object that allows you to perform TFVC commands.
     */
    public static CreateRepository(serverContext: TeamServerContext, repositoryRootFolder: string, env: any = {}): Repository {
        const tfvc: ITfvc = Tfvc.GetTfvc();
        return new Repository(serverContext, tfvc, repositoryRootFolder, env);
    }

    public static GetTfvc(localPath?: string): ITfvc {
        Logger.LogDebug(`TFVC Creating Tfvc object with localPath='${localPath}'`);
        // Get Proxy from settings
        const settings = new TfvcSettings();
        const proxy = settings.Proxy;
        Logger.LogDebug(`Using TFS proxy: ${proxy}`);

        let tfvcPath = localPath;
        if (!tfvcPath) {
            // get the location from settings
            tfvcPath = settings.Location;
            Logger.LogDebug(`TFVC Retrieved from settings; localPath='${tfvcPath}'`);
            if (!tfvcPath) {
                Logger.LogWarning(`TFVC Couldn't find where the TF command lives on disk.`);
                throw new TfvcError({
                    message: Strings.TfvcLocationMissingError,
                    tfvcErrorCode: TfvcErrorCodes.TfvcLocationMissing
                });
            }
        }

        // check to make sure that the file exists in that location
        let exists: boolean = fs.existsSync(tfvcPath);
        if (exists) {
            // if it exists, check to ensure that it's a file and not a folder
            const stats: fs.Stats = fs.lstatSync(tfvcPath);
            if (!stats || !stats.isFile()) {
                Logger.LogWarning(`TFVC ${tfvcPath} exists but isn't a file.`);
                throw new TfvcError({
                    message: Strings.TfMissingError + tfvcPath,
                    tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
                });
            }
        } else {
            Logger.LogWarning(`TFVC ${tfvcPath} does not exist.`);
            throw new TfvcError({
                message: Strings.TfMissingError + tfvcPath,
                tfvcErrorCode: TfvcErrorCodes.TfvcNotFound
            });
        }

        // Determine the min version
        const isExe: boolean = path.extname(tfvcPath) === ".exe";
        let minVersion: string = "14.0.4"; //CLC min version
        if (isExe) {
            minVersion = "14.0.0";  //Minimum tf.exe version
            Telemetry.SendEvent(TfvcTelemetryEvents.UsingExe);
        } else {
            Telemetry.SendEvent(TfvcTelemetryEvents.UsingClc);
        }

        return {
            path: tfvcPath,
            minVersion: minVersion,
            isExe: isExe,
            proxy: proxy
        };
    }

    /**
     * This method checks the version of the CLC against the minimum version that we expect.
     * It throws an error if the version does not meet or exceed the minimum.
     */
    public static CheckVersion(tfvc: ITfvc, version: string) {
        if (!version) {
            // If the version isn't set just return
            Logger.LogDebug(`TFVC CheckVersion called without a version.`);
            return;
        }

        // check the version of TFVC command line
        const minVersion: TfvcVersion = TfvcVersion.FromString(tfvc.minVersion);
        const curVersion: TfvcVersion = TfvcVersion.FromString(version);
        if (TfvcVersion.Compare(curVersion, minVersion) < 0) {
            Logger.LogWarning(`TFVC ${version} is less that the min version of ${tfvc.minVersion}.`);
            throw new TfvcError({
                message: Strings.TfVersionWarning + minVersion.ToString(),
                tfvcErrorCode: TfvcErrorCodes.TfvcMinVersionWarning
            });
        }
    }

    public static async Exec(tfvc: ITfvc, cwd: string, args: IArgumentProvider, options: any = {}): Promise<IExecutionResult> {
        // default to the cwd passed in, but allow options.cwd to overwrite it
        options = _.extend({ cwd }, options || {});

        // TODO: do we want to handle proxies or not for the EXE? for tf.exe the user could simply setup the proxy at the command line.
        //       tf.exe remembers the proxy settings and uses them as it needs to.
        if (tfvc.proxy && !tfvc.isExe) {
            args.AddProxySwitch(tfvc.proxy);
        }

        Logger.LogDebug(`TFVC: tf ${args.GetArgumentsForDisplay()}`);
        if (options.log !== false) {
            TfvcOutput.AppendLine(`tf ${args.GetArgumentsForDisplay()}`);
        }

        return await TfRunner.Run(tfvc, args, options, tfvc.isExe);
    }

    public static DisposeStatics() {
        TfRunner.DisposeStatics();
    }
}

class TfRunner {
    private static _location: string;
    private static _options: any;
    private static _runningInstance: cp.ChildProcess;

    public static DisposeStatics() {
        if (TfRunner._runningInstance) {
            TfRunner._runningInstance.kill();
            TfRunner._runningInstance = undefined;
        }
    }

    /**
     * The Run method will attempt to use the cached TF process, if possible, to run the command and then
     * return the results. Whether it uses the cached one or starts a new TF process, we will immediately start
     * a new TF instance and for later use.
     */
    public static async Run(tfvc: ITfvc, args: IArgumentProvider, options: any, isExe: boolean): Promise<IExecutionResult> {
        const start: number = new Date().getTime();
        const tfInstance: cp.ChildProcess = await TfRunner.getMatchingTfInstance(tfvc, options);
        // now that we have the matching one, start a new process (but don't wait on it to finish)
        TfRunner.startNewTfInstance(tfvc, options);

        // Use the tf instance to perform the command
        const argsForStandardInput: string = args.GetCommandLine();
        const result: IExecutionResult = await TfRunner.runCommand(argsForStandardInput, tfInstance, isExe);

        // log the results
        const end: number = new Date().getTime();
        Logger.LogDebug(`TFVC: ${args.GetCommand()} exit code: ${result.exitCode} (duration: ${end - start}ms)`);

        return result;
    }

    /**
     * Currently we only cache one TF process. If that process matches the tfvc location and options of the process which
     * has been requested, we simply return the cached instance.
     * If there isn't a match or there isn't one cached, we kill any existing running instance and created a new one.
     */
    private static async getMatchingTfInstance(tfvc: ITfvc, options: any): Promise<cp.ChildProcess> {
        if (!TfRunner._runningInstance || tfvc.path !== TfRunner._location || !TfRunner.optionsMatch(options, TfRunner._options)) {
            if (TfRunner._runningInstance) {
                TfRunner._runningInstance.kill();
            }
            // spawn a new instance of TF with these options
            return await TfRunner.startNewTfInstance(tfvc, options);
        }

        // return the cached instance
        return TfRunner._runningInstance;
    }

    private static async startNewTfInstance(tfvc: ITfvc, options: any): Promise<cp.ChildProcess> {
        // Start up a new instance of TF for later use
        TfRunner._options = options;
        TfRunner._location = tfvc.path;
        TfRunner._runningInstance = await TfRunner.spawn(tfvc.path, options);
        return TfRunner._runningInstance;
    }

    private static optionsMatch(options1: any, options2: any): boolean {
        return (!options1 && !options2) || (options1.cwd === options2.cwd);
    }

    private static async spawn(location: string, options: any): Promise<cp.ChildProcess> {
        if (!options) {
            options = {};
        }
        options.env = _.assign({}, process.env, options.env || {});

        const start: number = new Date().getTime();
        options.stdio = ["pipe", "pipe", "pipe"];
        const child: cp.ChildProcess = await cp.spawn(location, ["@"], options);
        const end: number = new Date().getTime();
        Logger.LogDebug(`TFVC: spawned new process (duration: ${end - start}ms)`);
        return child;
    }

    private static async runCommand(argsForStandardInput: string, child: cp.ChildProcess, isExe: boolean): Promise<IExecutionResult> {
        const disposables: IDisposable[] = [];

        child.stdin.end(argsForStandardInput, "utf8");

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
                on(child.stdout, "data", b => {
                    buffers.push(b);
                });
                once(child.stdout, "close", () => {
                    let stdout: string = buffers.join("");
                    if (isExe) {
                        // TF.exe repeats the command line as part of the standard out when using the @ response file options
                        // So, we look for the noprompt option to let us know where that line is so we can strip it off
                        const start: number = stdout.indexOf("-noprompt");
                        if (start >= 0) {
                            const end: number = stdout.indexOf("\n", start);
                            stdout = stdout.slice(end + 1);
                        }
                    }
                    c(stdout);
                });
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
