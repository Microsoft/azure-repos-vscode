/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { ArgumentBuilder } from "../../../src/tfvc/commands/argumentbuilder";
import { IArgumentProvider } from "../../../src/tfvc/interfaces";
import { TeamServerContext } from "../../../src/contexts/servercontext";
import { CredentialInfo } from "../../../src/info/credentialinfo";
import { RepositoryInfo } from "../../../src/info/repositoryinfo";
import { TfvcError } from "../../../src/tfvc/tfvcerror";

describe("Tfvc-ArgumentBuilder", function() {
    let serverUrl: string = "http://server:8080/tfs";
    let repoUrl: string = "http://server:8080/tfs/collection1/_git/repo1";
    let collectionUrl: string = "http://server:8080/tfs/collection1";
    let user: string = "user1";
    let pass: string = "pass1";
    let context: TeamServerContext;

    beforeEach(function() {
        context = new TeamServerContext(repoUrl);
        context.CredentialInfo = new CredentialInfo(user, pass);
        context.RepoInfo = new RepositoryInfo({
            serverUrl: serverUrl,
            collection: {
                name: "collection1",
                id: ""
            },
            repository: {
                remoteUrl: repoUrl,
                id: "",
                name: "",
                project: {
                    name: "project1"
                }
            }
        });
    });

    it("should verify constructor", function() {
        let cmd: string = "mycmd";
        let builder: ArgumentBuilder = new ArgumentBuilder(cmd);
        assert.equal(builder.GetCommand(), cmd);
        let args = builder.Build();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args.length, 2);
    });

    it("should verify constructor with context", function() {
        let cmd: string = "mycmd";
        let builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.GetCommand(), cmd);
        let args = builder.Build();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args[2], "-collection:" + collectionUrl);
        assert.equal(args[3], "-login:" + user + "," + pass);
        assert.equal(args.length, 4);
    });

    it("should verify constructor error", function() {
        assert.throws(() => new ArgumentBuilder(undefined), TfvcError, /Argument is required/);
    });

    it("should verify GetArgumentsForDisplay", function() {
        let cmd: string = "mycmd";
        let builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.ToString(), "mycmd -noprompt -collection:" + collectionUrl + " ********");
    });

    it("should verify interface implemented", function() {
        let cmd: string = "mycmd";
        let argProvider: IArgumentProvider = new ArgumentBuilder(cmd, context);
        // GetCommand
        assert.equal(argProvider.GetCommand(), cmd);
        // GetArguments
        let args = argProvider.GetArguments();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args[2], "-collection:" + collectionUrl);
        assert.equal(args[3], "-login:" + user + "," + pass);
        assert.equal(args.length, 4);
        // GetArgumentsForDisplay
        assert.equal(argProvider.GetArgumentsForDisplay(), "mycmd -noprompt -collection:" + collectionUrl + " ********");
        // AddProxySwitch
        argProvider.AddProxySwitch("TFSProxy");
        assert.equal(argProvider.GetArgumentsForDisplay(), "mycmd -noprompt -collection:" + collectionUrl + " ******** -proxy:TFSProxy");
    });
});
