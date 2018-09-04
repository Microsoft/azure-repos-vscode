//
//  ChangeSetTests.swift
//  Jetstream
//
//  Copyright (c) 2014 Uber Technologies, Inc.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.

import XCTest
@testable import Jetstream

class ChangeSetTests: XCTestCase {
    var root = TestModel()
    var child = TestModel()
    var scope = Scope(name: "Testing")
    
    override func setUp() {
        root = TestModel()
        child = TestModel()
        scope = Scope(name: "Testing")
        root.setScopeAndMakeRootModel(scope)
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testBasicReversal() {
        root.integer = 10
        root.float32 = 10.0
        root.string = "test"
        scope.getAndClearSyncFragments()
        
        root.integer = 20
        root.float32 = 20.0
        root.string = "test 2"
        let changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        changeSet.revertOnScope(scope)
        
        XCTAssertEqual(scope.getAndClearSyncFragments().count, 0, "Should have reverted without generating Sync fragments")
        XCTAssertEqual(root.integer, 10, "Change set reverted")
        XCTAssertEqual(root.float32, Float(10.0), "Change set reverted")
        XCTAssertEqual(root.string!, "test", "Change set reverted")
    }
    
    func testModelReversal() {
        root.childModel = child
        let changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        
        changeSet.revertOnScope(scope)
        
        XCTAssertEqual(scope.getAndClearSyncFragments().count, 0, "Should have reverted without generating Sync fragments")
        XCTAssert(root.childModel == nil, "Change set reverted")
        XCTAssertEqual(scope.modelObjects.count, 1 , "Scope knows correct models")
    }
    
    func testModelReapplying() {
        root.childModel = child
        scope.getAndClearSyncFragments()
        
        root.childModel = nil
        let changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        
        changeSet.revertOnScope(scope)
        
        XCTAssertEqual(scope.getAndClearSyncFragments().count, 0, "Should have reverted without generating Sync fragments")
        XCTAssert(root.childModel == child, "Change set reverted")
        XCTAssertEqual(scope.modelObjects.count, 2 , "Scope knows correct models")
    }
    
    func testArrayReversal() {
        root.array.append(child)
        let changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 2, "Correct number of sync fragments")
        
        changeSet.revertOnScope(scope)
        
        XCTAssertEqual(scope.getAndClearSyncFragments().count, 0, "Should have reverted without generating Sync fragments")
        XCTAssertEqual(root.array.count, 0, "Change set reverted")
        XCTAssertEqual(scope.modelObjects.count, 1 , "Scope knows correct models")
    }
    
    func testMovingChildModel() {
        root.childModel = child
        var changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 2, "Correct number of sync fragments")
        
        root.childModel = nil
        root.childModel2 = child
        
        changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 1, "No add fragment created")
        
        root.childModel2 = nil
        
        changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 1, "No add fragment created")
        
        root.childModel = child
        
        changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 2, "Add fragment created")
    }
    
    func testRemovalOfAddFragmentsWhenNotAttachedToAnyProperties() {
        root.localModel = TestModel()
        var changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 0, "Add fragment should have been removed")
        
        root.localModelArray = [TestModel(), TestModel()]
        changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 0, "Add fragment should have been removed")
        
        root.localModel = TestModel()
        root.localModelArray = [TestModel(), TestModel()]
        changeSet = ChangeSet(syncFragments: scope.getAndClearSyncFragments(), scope: scope)
        XCTAssertEqual(changeSet.syncFragments.count, 0, "Add fragment should have been removed")
    }
}
