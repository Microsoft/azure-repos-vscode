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
    const serverUrl: string = "http://server:8080/tfs";
    const repoUrl: string = "http://server:8080/tfs/collection1/_git/repo1";
    const collectionUrl: string = "http://server:8080/tfs/collection1";
    const user: string = "user1";
    const pass: string = "pass1";
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
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd);
        assert.equal(builder.GetCommand(), cmd);
        const args = builder.Build();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args.length, 2);
    });

    it("should verify constructor with context", function() {
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.GetCommand(), cmd);
        const args = builder.Build();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args[2], "-collection:" + collectionUrl);
        assert.equal(args[3], "-login:" + user + "," + pass);
        assert.equal(args.length, 4);
    });

    it("should verify constructor with context - user and domain", function() {
        context.CredentialInfo = new CredentialInfo(user, pass, "domain", "workstation");
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.GetCommand(), cmd);
        const args = builder.Build();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args[2], "-collection:" + collectionUrl);
        assert.equal(args[3], "-login:" + `domain\\${user}` + "," + pass);
        assert.equal(args.length, 4);
    });

    it("should verify constructor error", function() {
        assert.throws(() => new ArgumentBuilder(undefined), TfvcError, /Argument is required/);
    });

    it("should verify ToString", function() {
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.ToString(), "mycmd -noprompt -collection:" + collectionUrl + " ********");
    });

    it("should verify BuildCommandLine with context", function() {
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd, context);
        assert.equal(builder.BuildCommandLine().trim(), "mycmd -noprompt -collection:" + collectionUrl + " -login:" + user + "," + pass);
    });

    it("should verify BuildCommandLine", function() {
        const cmd: string = "mycmd";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd);
        assert.equal(builder.BuildCommandLine().trim(), "mycmd -noprompt");
    });

    it("should verify BuildCommandLine with spaces in options", function() {
        const cmd: string = "mycmd";
        const path: string = "/path/with a space/file.txt";
        const option: string = "option with space";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd);
        builder.Add(path);
        builder.AddSwitch(option);
        builder.AddSwitchWithValue(option, path, false);
        assert.equal(builder.BuildCommandLine().trim(), "mycmd -noprompt \"/path/with a space/file.txt\" \"-option with space\" \"-option with space:/path/with a space/file.txt\"");
    });

    it("should verify BuildCommandLine with spaces in some", function() {
        const cmd: string = "mycmd";
        const path: string = "/path/with a space/file.txt";
        const option: string = "option";
        const builder: ArgumentBuilder = new ArgumentBuilder(cmd);
        builder.Add(path);
        builder.AddSwitch(option);
        builder.AddSwitchWithValue(option, path, false);
        assert.equal(builder.BuildCommandLine().trim(), "mycmd -noprompt \"/path/with a space/file.txt\" -option \"-option:/path/with a space/file.txt\"");
    });

    it("should verify interface implemented", function() {
        const cmd: string = "mycmd";
        const argProvider: IArgumentProvider = new ArgumentBuilder(cmd, context);
        // GetCommand
        assert.equal(argProvider.GetCommand(), cmd);
        // GetArguments
        const args = argProvider.GetArguments();
        assert.equal(args[0], cmd);
        assert.equal(args[1], "-noprompt");
        assert.equal(args[2], "-collection:" + collectionUrl);
        assert.equal(args[3], "-login:" + user + "," + pass);
        assert.equal(args.length, 4);
        // GetArgumentsForDisplay
        assert.equal(argProvider.GetArgumentsForDisplay(), "mycmd -noprompt -collection:" + collectionUrl + " ********");
        // GetCommandLine
        assert.equal(argProvider.GetCommandLine(), "mycmd -noprompt -collection:" + collectionUrl + " -login:" + user + "," + pass + " \n");
        // AddProxySwitch
        argProvider.AddProxySwitch("TFSProxy");
        assert.equal(argProvider.GetArgumentsForDisplay(), "mycmd -noprompt -collection:" + collectionUrl + " ******** -proxy:TFSProxy");
    });
});
