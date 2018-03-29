/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { expect } from "chai";

import { GetStatuses, Status } from "../../../src/tfvc/scm/status";

describe("Tfvc-Version", function() {
    beforeEach(function() {
        //
    });

    it("should verify GetStatuses - empty strings", function() {
        expect(GetStatuses("")).to.have.same.members([]);
        expect(GetStatuses(undefined)).to.have.same.members([]);
    });

    it("should verify GetStatuses - single value", function() {
        expect(GetStatuses("add")).to.have.same.members([Status.ADD]);
        expect(GetStatuses("branch")).to.have.same.members([Status.BRANCH]);
        expect(GetStatuses("delete")).to.have.same.members([Status.DELETE]);
        expect(GetStatuses("edit")).to.have.same.members([Status.EDIT]);
        expect(GetStatuses("lock")).to.have.same.members([Status.LOCK]);
        expect(GetStatuses("merge")).to.have.same.members([Status.MERGE]);
        expect(GetStatuses("rename")).to.have.same.members([Status.RENAME]);
        expect(GetStatuses("source rename")).to.have.same.members([Status.RENAME]);
        expect(GetStatuses("undelete")).to.have.same.members([Status.UNDELETE]);
        expect(GetStatuses("blah blah")).to.have.same.members([Status.UNKNOWN]);
    });

    it("should verify GetStatuses - multiple values", function() {
        expect(GetStatuses("add, edit")).to.have.same.members([Status.ADD, Status.EDIT]);
        expect(GetStatuses("branch    ,    lock")).to.have.same.members([Status.BRANCH, Status.LOCK]);
        expect(GetStatuses("     delete    ,merge   ")).to.have.same.members([Status.DELETE, Status.MERGE]);
    });

    it("should verify GetStatuses - multiple values with unknown", function() {
        expect(GetStatuses("add, unk, edit")).to.have.same.members([Status.ADD, Status.UNKNOWN, Status.EDIT]);
        expect(GetStatuses("unk  , branch    ,    lock")).to.have.same.members([Status.UNKNOWN, Status.BRANCH, Status.LOCK]);
        expect(GetStatuses("     delete    ,merge,    unk   ")).to.have.same.members([Status.DELETE, Status.MERGE, Status.UNKNOWN]);
    });
});
