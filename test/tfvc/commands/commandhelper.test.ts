/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { CommandHelper } from "../../../src/tfvc/commands/commandhelper";

describe("Tfvc-CommandHelper", function() {
    it("should verify SplitIntoLines", function() {
        let text: string = "one\ntwo\r\nthree\r\nfour\nfive\n";
        let lines: string[] = CommandHelper.SplitIntoLines(text);
        assert.equal(lines.length, 6);
        assert.equal(lines[0], "one");
        assert.equal(lines[1], "two");
        assert.equal(lines[2], "three");
        assert.equal(lines[3], "four");
        assert.equal(lines[4], "five");
        assert.equal(lines[5], "");
    });

    it("should verify SplitIntoLines - undefined input", function() {
        let text: string;
        let lines: string[] = CommandHelper.SplitIntoLines(text);
        assert.isDefined(lines);
        assert.equal(lines.length, 0);
    });

    it("should verify SplitIntoLines - empty input", function() {
        let text: string = "";
        let lines: string[] = CommandHelper.SplitIntoLines(text);
        assert.isDefined(lines);
        assert.equal(lines.length, 0);
    });

    it("should verify SplitIntoLines - trim WARNings", function() {
        let text: string = "WARN 1\nWARN 2\nwarning\none\ntwo\r\n\n";
        let lines: string[] = CommandHelper.SplitIntoLines(text);
        assert.equal(lines.length, 5);
        assert.equal(lines[0], "warning");
        assert.equal(lines[1], "one");
        assert.equal(lines[2], "two");
        assert.equal(lines[3], "");
        assert.equal(lines[4], "");
    });

    it("should verify SplitIntoLines - leave WARNings", function() {
        let text: string = "WARN 1\nWARN 2\nwarning\none\ntwo\r\n\n";
        let lines: string[] = CommandHelper.SplitIntoLines(text, false);
        assert.equal(lines.length, 7);
        assert.equal(lines[0], "WARN 1");
        assert.equal(lines[1], "WARN 2");
        assert.equal(lines[2], "warning");
        assert.equal(lines[3], "one");
        assert.equal(lines[4], "two");
        assert.equal(lines[5], "");
        assert.equal(lines[6], "");
    });

    it("should verify SplitIntoLines - filter empty lines", function() {
        let text: string = "zero\n      \none\ntwo\r\n"; //ensure there's a line with just spaces too
        let lines: string[] = CommandHelper.SplitIntoLines(text, false, true);
        assert.equal(lines.length, 3);
        assert.equal(lines[0], "zero");
        assert.equal(lines[1], "one");
        assert.equal(lines[2], "two");
    });

    it("should verify SplitIntoLines - leave empty lines", function() {
        let text: string = "one\ntwo\n\nthree\nfour\n\n";
        let lines: string[] = CommandHelper.SplitIntoLines(text);
        assert.equal(lines.length, 7);
        assert.equal(lines[0], "one");
        assert.equal(lines[1], "two");
        assert.equal(lines[2], "");
        assert.equal(lines[3], "three");
        assert.equal(lines[4], "four");
        assert.equal(lines[5], "");
        assert.equal(lines[6], "");
    });

    it("should verify TrimToXml", async function() {
        let text: string = "WARN 1\nWARN 2\nwarning\n<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<status>\r\n</status>\n\n";
        let xml: string = CommandHelper.TrimToXml(text);
        assert.equal(xml, "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<status>\r\n</status>");
    });

    it("should verify ParseXml", async function() {
        let text: string = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<one attr1=\"35\" attr2=\"two\"><child1 attr1=\"44\" attr2=\"55\" attr3=\"three\"/><child2>child two</child2>\r\n</one>\n\n";
        let xml: any = await CommandHelper.ParseXml(text);
        let expectedJSON = {
            "one": {
                "$": {
                    "attr1": "35",
                    "attr2": "two"
                },
                "child1": [{
                    "$": {
                        "attr1": "44",
                        "attr2": "55",
                        "attr3": "three"
                    }
                }],
                "child2": [
                    "child two"
                    ]
                }
            };
        assert.equal(JSON.stringify(xml), JSON.stringify(expectedJSON));
    });
});
