//
//  TreeChangeTests.swift
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

class TreeChangeTests: XCTestCase {
    var parent = TestModel()
    var child = TestModel()
    var child2 = TestModel()
    var child3 = TestModel()
    
    var attachCount = [0, 0, 0, 0]
    var detachCount = [0, 0, 0, 0]
    
    override func setUp() {
        parent = TestModel()
        child = TestModel()
        child2 = TestModel()
        child3 = TestModel()
        
        attachCount = [0, 0, 0, 0]
        detachCount = [0, 0, 0, 0]
        
        var i = 0
        for object in [parent, child, child2, child3] {
            func assignListeners(index: Int) -> Void {
                object.observeAttach(self) { (scope) in
                    self.attachCount[index] += 1
                }
                object.observeDetach(self) { (scope) in
                    self.detachCount[index] += 1
                }
            }
            assignListeners(i++)
        }
    }
    
    override func tearDown() {
        super.tearDown()
    }

    func testAssigmentAndRemoval() {
        parent.isScopeRoot = true
        parent.childModel = child
        XCTAssertEqual(parent.childModel!, child, "Correct child attached")
        XCTAssertEqual(child.parents[0].parent, parent, "Correct parentRelationship attached")
        
        parent.childModel = child2
        XCTAssertEqual(parent.childModel!, child2, "Correct child attached")
        XCTAssertEqual(child.parents.count, 0, "parentRelationship removed")
        XCTAssertEqual(child2.parents[0].parent, parent, "Correct parentRelationship attached")
        
        parent.childModel = child3
        XCTAssertEqual(parent.childModel!, child3, "Correct child attached")
        
        parent.childModel = nil
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 1 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 1 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 1 , "Correct amount of detaches observed for child3")
    }
 
    func testChainedAddition() {
        parent.isScopeRoot = true
        child.childModel = child2
        child2.childModel = child3
        
        XCTAssertEqual(attachCount[1], 0 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 0 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 0 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 0 , "Correct amount of detaches observed for child3")

        parent.childModel = child
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 1 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 0 , "Correct amount of detaches observed for child3")
        
        parent.childModel = nil
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 1 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 1 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 1 , "Correct amount of detaches observed for child3")
    }
    
    func testObserveActualyAssigments() {
        parent.isScopeRoot = true
        parent.childModel = child
        parent.childModel = child
        parent.childModel = nil
        parent.childModel = nil

        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
    }
    
    func testChainedRemoval() {
        parent.isScopeRoot = true
        parent.childModel = child
        parent.childModel = child2
        parent.childModel = child3
        parent.childModel = nil
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 1 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 1 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 1 , "Correct amount of detaches observed for child3")
    }

    func testMovingWithoutRoot() {
        parent.isScopeRoot = false
        parent.childModel = child
        child.childModel = child2
        child2.childModel = child3
        child.childModel2 = child2

        XCTAssertEqual(attachCount[1], 0 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 0 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 0 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 0 , "Correct amount of detaches observed for child3")
    }

    func testMultiassigment() {
        parent.isScopeRoot = true
        parent.childModel = child
        child.childModel = child2
        child2.childModel = child3
        child.childModel2 = child2
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 1 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 0 , "Correct amount of detaches observed for child3")
    }
    
    func testRootAssigments() {
        parent.isScopeRoot = true
        parent.childModel = child
        child.childModel = child2
        child2.childModel = child3
        
        child2.isScopeRoot = true

        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(attachCount[2], 2 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 1 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 2 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 1 , "Correct amount of detaches observed for child3")
        XCTAssertNil(child.childModel, "New root was removed from parent")
        
        child2.isScopeRoot = false
        
        XCTAssertEqual(attachCount[2], 2 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 2 , "Correct amount of detaches observed for child2")
        
        XCTAssertEqual(attachCount[3], 2 , "Correct amount of attaches observed for child3")
        XCTAssertEqual(detachCount[3], 2 , "Correct amount of detaches observed for child3")
    }
    
    func testArrayAssigments() {
        parent.isScopeRoot = true
        parent.array.append(child)
        XCTAssert(parent.array.count == 1, "Child accessible via array")
        XCTAssertEqual(child.parents[0].parent, parent, "Correct parentRelationship attached")
        XCTAssert(child.scope === parent.scope, "Correct scope attached")
        
        parent.array.removeLast()
        XCTAssertEqual(parent.array.count, 0, "Child accessible via array")
        XCTAssertEqual(child.parents.count, 0, "parentRelationship removed")
        XCTAssert(child.scope == nil,  "scope removed")

        parent.childModel = nil
        
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
    }
    
    func testArrayRemovals() {
        parent.isScopeRoot = true
        parent.array.append(child)
        XCTAssert(parent.array.count == 1, "Child accessible via array")
        XCTAssertEqual(child.parents[0].parent, parent, "Correct parentRelationship attached")
        XCTAssert(child.scope === parent.scope, "Correct scope attached")
        
        parent.array[0].detach()
        XCTAssert(parent.array.count == 0, "Child accessible via array")
        XCTAssertEqual(child.parents.count, 0,  "parentRelationship removed")
        XCTAssert(child.scope == nil,  "scope removed")
    }
    
    func testMultiArrayRemovals() {
        parent.isScopeRoot = true
        parent.array.append(child)
        parent.array2.append(child)
        XCTAssert(parent.array.count == 1, "Child accessible via array")
        XCTAssert(parent.array2.count == 1, "Child accessible via array")
        XCTAssertEqual(child.parents.count, 2, "Correct parentRelationships attached")
        XCTAssert(child.scope === parent.scope, "Correct scope attached")
        
        parent.array = []
        XCTAssertEqual(child.parents.count, 1, "Correct parentRelationships attached")
        
        parent.array2 = []
        XCTAssertEqual(child.parents.count, 0, "Correct parentRelationships attached")
        XCTAssert(child.scope == nil,  "scope removed")
    }
    
    func testArrayScopePropagation() {
        parent.isScopeRoot = true
        child.array.append(child2)
        child.array.append(child3)
        
        parent.childModel = child
        
        XCTAssert(child.scope == parent.scope, "Child got scope from root")
        XCTAssert(child2.scope == parent.scope, "Child got scope from root")
        XCTAssert(child3.scope == parent.scope, "Child got scope from root")
    }
    
    func testMultiParrentAssigments() {
        parent.isScopeRoot = true
        parent.childModel = child
        parent.childModel2 = child
        child.childModel = child2

        XCTAssertEqual(child.parents.count, 2 , "Correct number of parents")
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(child2.parents.count, 1 , "Correct number of parents")
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        parent.childModel = nil
        
        XCTAssertEqual(child.parents.count, 1 , "Correct number of parents")
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 0 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(child2.parents.count, 1 , "Correct number of parents")
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 0 , "Correct amount of detaches observed for child2")
        
        parent.childModel2 = nil
        
        XCTAssertEqual(child.parents.count, 0 , "Correct number of parents")
        XCTAssertEqual(attachCount[1], 1 , "Correct amount of attaches observed for child")
        XCTAssertEqual(detachCount[1], 1 , "Correct amount of detaches observed for child")
        
        XCTAssertEqual(child2.parents.count, 1 , "Correct number of parents")
        XCTAssertEqual(attachCount[2], 1 , "Correct amount of attaches observed for child2")
        XCTAssertEqual(detachCount[2], 1 , "Correct amount of detaches observed for child2")
    }
}
