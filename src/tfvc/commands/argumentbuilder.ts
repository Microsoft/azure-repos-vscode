/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { TeamServerContext } from "../../contexts/servercontext";
import { IArgumentProvider } from "../interfaces";
import { TfvcError } from "../tfvcerror";

/**
 * Create an instance of this class to build up the arguments that should be passed to the command line.
 */
export class ArgumentBuilder implements IArgumentProvider {
    private _arguments: string[] = [];
    private _secretArgumentIndexes: number[] = [];

    public constructor(command: string, serverContext?: TeamServerContext, skipCollectionOption?: boolean, isExe?: boolean) {
        if (!command) {
            throw TfvcError.CreateArgumentMissingError("command");
        }
        this.Add(command);
        if (isExe) {
            this.AddSwitch("prompt");
        } else {
            this.AddSwitch("noprompt");
        }

        if (serverContext && serverContext.RepoInfo && serverContext.RepoInfo.CollectionUrl) {
            if (!skipCollectionOption) {
                //TODO decode URI since CLC does not expect encoded collection urls
                this.AddSwitchWithValue("collection", serverContext.RepoInfo.CollectionUrl, false);
            }
            if (serverContext.CredentialInfo && !isExe) {
                this.AddSwitchWithValue("login", (serverContext.CredentialInfo.Domain ? serverContext.CredentialInfo.Domain + "\\" : "") + serverContext.CredentialInfo.Username + "," + serverContext.CredentialInfo.Password, true);
            }
        }
    }

    public Add(arg: string): ArgumentBuilder {
        this._arguments.push(arg);
        return this;
    }

    public AddAll(args: string[]): ArgumentBuilder {
        if (args) {
            for (let i: number = 0; i < args.length; i++) {
                this.Add(args[i]);
            }
        }
        return this;
    }

    public AddSecret(arg: string): ArgumentBuilder {
        this.Add(arg);
        this._secretArgumentIndexes.push(this._arguments.length - 1);
        return this;
    }

    public AddSwitch(switchName: string): ArgumentBuilder {
        return this.AddSwitchWithValue(switchName, undefined, false);
    }

    public RemoveSwitch(switchName: string): ArgumentBuilder {
        const index: number = this._arguments.lastIndexOf("-" + switchName);
        if (index !== -1) {
            for (let i: number = index; i < this._arguments.length - 1; i++ ) {
                this._arguments[i] = this._arguments[i + 1];
            }
            this._arguments.pop();
        }
        return this;
    }

    public AddSwitchWithValue(switchName: string, switchValue: string, isSecret: boolean): ArgumentBuilder {
        let arg: string;
        if (!switchValue) {
            arg = "-" + switchName;
        } else {
            arg = "-" + switchName + ":" + switchValue;
        }

        if (isSecret) {
            this.AddSecret(arg);
        } else {
            this.Add(arg);
        }

        return this;
    }

    public Build(): string[] {
        return this._arguments;
    }

    /**
     * This method builds all the arguments into a single command line. This is needed if
     * a response file is needed for the commands.
     */
    public BuildCommandLine(): string {
        let result: string = "";
        this._arguments.forEach((arg) => {
            const escapedArg = this.escapeArgument(arg);
            result += escapedArg + " ";
        });
        result += "\n";
        return result;
    }

    /**
     * Command line arguments should have all embedded double quotes repeated to escape them.
     * They should also be surrounded by double quotes if they contain a space (or other whitespace).
     */
    private escapeArgument(arg: string) {
        if (!arg) {
            return arg;
        }

        let escaped = arg.replace(/\"/g, "\"\"");
        if (/\s/.test(escaped)) {
            escaped = "\"" + escaped + "\"";
        }
        return escaped;
    }

    public ToString(): string {
        let output: string = "";
        for (let i = 0; i < this._arguments.length; i++) {
            let arg: string = this._arguments[i];
            if (this._secretArgumentIndexes.indexOf(i) >= 0) {
                // This arg is a secret so hide the value
                arg = "********";
            }
            output += arg + " ";
        }
        return output.trim();
    }

    /* IArgumentProvider Implementation - START */

    public GetCommand(): string {
        return this._arguments.length > 0 ? this._arguments[0] : "";
    }

    public GetArguments(): string[] {
        return this.Build();
    }

    public GetCommandLine(): string {
        return this.BuildCommandLine();
    }

    public GetArgumentsForDisplay(): string {
        return this.ToString();
    }

    public AddProxySwitch(proxy: string) {
        this.AddSwitchWithValue("proxy", proxy, false);
    }

    /* IArgumentProvider Implementation - END */

}
