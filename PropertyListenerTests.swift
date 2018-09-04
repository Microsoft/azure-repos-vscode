//
//  PropertyListenerTests.swift
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

class PropertyListenerTests: XCTestCase {
    func testGenericPropertyListeners() {
        let model = TestModel()
        var lastValue = ""
        
        model.onPropertyChange.listen(self, callback: {(key, oldValue, value) in
            if key == "string" {
                lastValue = value as! String
            }
        })
        
        model.string = "test"

        XCTAssertEqual(lastValue, "test" , "Value change captured")
    }
    
    func testSpecificPropertyListeners() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChangeImmediately(self, key: "string") {
            dispatchCount += 1
        }

        model.string = "test"
        model.integer = 1
        model.float32 = 2.5
        
        XCTAssertEqual(dispatchCount, 1 , "Dispatched once")
        
        model.string = nil
        
        XCTAssertEqual(dispatchCount, 2 , "Dispatched twice")
    }
    
    func testCancelPropertyListeners() {
        let model = TestModel()
        var dispatchCount = 0
        
        let cancel = model.observeChangeImmediately(self, key: "string") {
            dispatchCount += 1
        }
        
        cancel()
        
        model.string = "test"
        model.integer = 1
        model.float32 = 2.5
        model.string = nil
        
        XCTAssertEqual(dispatchCount, 0 , "Never dispatehced")
    }
    
    func testMultiPropertyListeners() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChangeImmediately(self, keys: ["string", "integer"]) {
            dispatchCount += 1
        }
        
        model.string = "test"
        model.integer = 1
        model.float32 = 2.5
        
        XCTAssertEqual(dispatchCount, 2 , "Dispatched twice")
    }
    
    func testNoDispatchForNoChange() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChangeImmediately(self) {
            dispatchCount += 1
        }
        XCTAssertEqual(dispatchCount, 0 , "Dispatched once")
        
        model.integer = 10
        model.integer = 10
        XCTAssertEqual(dispatchCount, 1 , "Dispatched once")
        
        model.uint = 10
        model.uint = 10
        XCTAssertEqual(dispatchCount, 2 , "Dispatched once")
        
        model.uint8 = 10
        model.uint8 = 10
        XCTAssertEqual(dispatchCount, 3 , "Dispatched once")
        
        model.int8 = 10
        model.int8 = 10
        XCTAssertEqual(dispatchCount, 4 , "Dispatched once")
        
        model.uint16 = 10
        model.uint16 = 10
        XCTAssertEqual(dispatchCount, 5 , "Dispatched once")
        
        model.int16 = 10
        model.int16 = 10
        XCTAssertEqual(dispatchCount, 6 , "Dispatched once")
        
        model.uint32 = 10
        model.uint32 = 10
        XCTAssertEqual(dispatchCount, 7 , "Dispatched once")
        
        model.int32 = 10
        model.int32 = 10
        XCTAssertEqual(dispatchCount, 8 , "Dispatched once")
        
        model.uint64 = 10
        model.uint64 = 10
        XCTAssertEqual(dispatchCount, 9 , "Dispatched once")
        
        model.int64 = 10
        model.int64 = 10
        XCTAssertEqual(dispatchCount, 10 , "Dispatched once")
        
        model.boolean = true
        model.boolean = true
        XCTAssertEqual(dispatchCount, 11 , "Dispatched once")
        
        model.string = "test"
        model.string = "test"
        XCTAssertEqual(dispatchCount, 12 , "Dispatched once")
        
        model.string = "test 2"
        model.string = "test 2"
        XCTAssertEqual(dispatchCount, 13 , "Dispatched once")
        
        model.float32 = 10.0
        model.float32 = 10.0
        XCTAssertEqual(dispatchCount, 15 , "Dispatched twice") // float is part of composite property
        
        model.float32 = 10.1
        model.float32 = 10.2
        XCTAssertEqual(dispatchCount, 19 , "Dispatched four times") // float is part of composite property
        
        model.double64 = 10.0
        model.double64 = 10.0
        XCTAssertEqual(dispatchCount, 20 , "Dispatched once")
        
        model.double64 = 10.1
        model.double64 = 10.2
        XCTAssertEqual(dispatchCount, 22 , "Dispatched twice")
        
        model.testType = .Active
        model.testType = .Active
        XCTAssertEqual(dispatchCount, 23 , "Dispatched once")
        
        model.localString = "new value"
        model.localString = "new value"
        XCTAssertEqual(dispatchCount, 24 , "Dispatched once")
    }

    func testArrayListeners() {
        let model = TestModel()
        var changedCount = 0
        var addedCount = 0
        var removedCount = 0
        
        model.observeChangeImmediately(self, key: "array") {
            changedCount += 1
        }
        model.observeCollectionAdd(self, key: "array") { (element: TestModel) in
            addedCount += 1
        }
        
        model.observeCollectionRemove(self, key: "array") { (element: TestModel) in
            removedCount += 1
        }
        
        model.array.append(TestModel())
        model.array[0] = TestModel()
        model.array.removeLast()
        model.array = [TestModel()]

        XCTAssertEqual(changedCount, 4 , "Dispatched four times")
        XCTAssertEqual(addedCount, 3 , "Dispatched three times")
        XCTAssertEqual(removedCount, 2 , "Dispatched two times")
        
        model.array[0].detach()
        XCTAssertEqual(removedCount, 3 , "Dispatched three times")
    }
    
    func testTreeListeners() {
        let expectation = expectationWithDescription("onChange")
        
        let parent = TestModel()
        let child = TestModel()
        let child2 = TestModel()
        
        var changedCount1 = 0
        var changedCount2 = 0
        var changedCount3 = 0
        
        parent.observeTreeChange(self) {
            changedCount1 += 1
        }
        child.observeTreeChange(self) {
            changedCount2 += 1
        }
        child2.observeTreeChange(self) {
            changedCount3 += 1
        }
        
        parent.array.append(child)
        
        delay(0.001) {
            XCTAssertEqual(changedCount1, 1 , "Correct dispatch count")
            XCTAssertEqual(changedCount2, 0 , "Correct dispatch count")
            XCTAssertEqual(changedCount3, 0 , "Correct dispatch count")
            
            child.childModel = child2
            delay(0.001) {
                XCTAssertEqual(changedCount1, 2 , "Correct dispatch count")
                XCTAssertEqual(changedCount2, 1 , "Correct dispatch count")
                XCTAssertEqual(changedCount3, 0 , "Correct dispatch count")
                child.string = "changed this"
                child.boolean = true
                
                delay(0.001) {
                    XCTAssertEqual(changedCount1, 3 , "Correct dispatch count")
                    XCTAssertEqual(changedCount2, 2 , "Correct dispatch count")
                    XCTAssertEqual(changedCount3, 0 , "Correct dispatch count")
                    
                    child2.string = "changed this"
                    child2.boolean = true
                    
                    delay(0.001) {
                        XCTAssertEqual(changedCount1, 4 , "Correct dispatch count")
                        XCTAssertEqual(changedCount2, 3 , "Correct dispatch count")
                        XCTAssertEqual(changedCount3, 1 , "Correct dispatch count")
                        expectation.fulfill()
                    }
                }
            }
        }
        waitForExpectationsWithTimeout(2.0, handler: nil)
    }

    func testRemoveParent() {
        let parent = TestModel()
        let child = TestModel()
        var changedCount = 0

        child.observeRemovedFromParent(self, callback: { (parent, key) -> Void in
            changedCount += 1
        })

        parent.childModel = child
        parent.childModel = nil

        XCTAssertEqual(changedCount, 1, "correct change count")
    }
}
