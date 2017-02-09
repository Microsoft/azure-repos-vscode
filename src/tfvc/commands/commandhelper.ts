/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { parseString } from "xml2js";
import { Logger } from "../../helpers/logger";
import { Strings } from "../../helpers/strings";
import { TfvcError, TfvcErrorCodes } from "../tfvcerror";
import { IExecutionResult } from "../interfaces";

export class CommandHelper {
    public static RequireStringArgument(argument: string, argumentName: string) {
        if (!argument || argument.trim().length === 0) {
            throw TfvcError.CreateArgumentMissingError(argumentName);
        }
    }

    public static RequireStringArrayArgument(argument: string[], argumentName: string) {
        if (!argument || argument.length === 0) {
            throw TfvcError.CreateArgumentMissingError(argumentName);
        }
    }

    public static HasError(result: IExecutionResult, errorPattern: string): boolean {
        return new RegExp(errorPattern, "i").test(result.stderr);
    }

    public static ProcessErrors(command: string, result: IExecutionResult): void {
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

            throw new TfvcError({
                message: message || Strings.TfExecFailedError,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                tfvcErrorCode: tfvcErrorCode,
                tfvcCommand: command
            });
        }
    }

    public static GetNewLineCharacter(stdout: string): string {
        if (stdout && /\r\n/.test(stdout)) {
            return "\r\n";
        }
        return "\n";
    }

    public static SplitIntoLines(stdout: string, skipWarnings?: boolean, filterEmptyLines?: boolean): string[] {
        if (!stdout) {
            return [];
        }
        let lines: string[] = stdout.replace(/\r\n/g, "\n").split("\n");
        skipWarnings = skipWarnings === undefined ? true : skipWarnings;

        // Ignore WARNings that may be above the desired lines
        if (skipWarnings) {
            let index: number = 0;
            while (index < lines.length && lines[index].startsWith("WARN")) {
                index++;
            }
            lines = lines.splice(index);
        }
        if (filterEmptyLines) {
            lines = lines.filter(e => e.trim() !== "");
        }
        return lines;
    }

    public static async ParseXml(xml: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            parseString(
                xml,
                {
                    tagNameProcessors: [CommandHelper.normalizeName],
                    attrNameProcessors: [CommandHelper.normalizeName]
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
    }

    public static TrimToXml(xml: string): string {
        if (xml) {
            const start: number = xml.indexOf("<?xml");
            const end: number = xml.lastIndexOf(">");
            if (start >= 0 && end > start) {
                return xml.slice(start, end + 1);
            }
        }
        return xml;
    }

    private static normalizeName(name: string): string {
        if (name) {
            return name.replace(/\-/g, "").toLowerCase();
        }
        return name;
    }
}
