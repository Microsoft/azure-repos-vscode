/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { parseString } from "xml2js";

export class CommandHelper {
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
