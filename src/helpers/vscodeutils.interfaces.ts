/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

//The shape of this interface must always match vscodeutils.ButtonMessageItem since
//we are trying to limit the proliferation of references to "vscode" via imports
export interface IButtonMessageItem {
    title: string;
    url?: string;
    command?: string;
    telemetryId?: string;
}
