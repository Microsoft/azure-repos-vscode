//
//  ImmediatePropertyListeners.swift
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

class ImmediatePropertyListenerTests: XCTestCase {
    func testSpecificPropertyListeners() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChange(self, key: "string") {
            dispatchCount += 1
        }
        
        model.string = "test"
        model.string = "test 2"
        model.integer = 1
        model.float32 = 2.5
        
        delayTest(self, delay: 0.01) {
            XCTAssertEqual(dispatchCount, 1 , "Dispatched once")
        }
    }
    
    func testMultiPropertyListeners() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChange(self, keys: ["string", "integer"]) {
            dispatchCount += 1
        }
        
        model.string = "test"
        model.integer = 1
        model.string = "test"
        model.integer = 1
        model.float32 = 2.5
        
        delayTest(self, delay: 0.01) {
            XCTAssertEqual(dispatchCount, 1 , "Dispatched once")
        }
    }
    
    func testNoDispatchForNoChange() {
        let model = TestModel()
        var dispatchCount = 0
        
        model.observeChange(self) {
            dispatchCount += 1
        }
    
        model.integer = 10
        model.integer = 10
        
        model.uint = 10
        model.uint = 10
        
        model.uint8 = 10
        model.uint8 = 10
        
        model.int8 = 10
        model.int8 = 10
        
        model.uint16 = 10
        model.uint16 = 10
        
        model.int16 = 10
        model.int16 = 10
        
        model.uint32 = 10
        model.uint32 = 10
  
        model.int32 = 10
        model.int32 = 10

        model.uint64 = 10
        model.uint64 = 10
   
        model.int64 = 10
        model.int64 = 10
   
        model.boolean = true
        model.boolean = true
 
        model.string = "test"
        model.string = "test"
     
        model.string = "test 2"
        model.string = "test 2"
 
        model.float32 = 10.0
        model.float32 = 10.0
 
        model.float32 = 10.1
        model.float32 = 10.2
  
        model.double64 = 10.0
        model.double64 = 10.0
   
        model.double64 = 10.1
        model.double64 = 10.2
    
        model.testType = .Active
        model.testType = .Active
        
        delayTest(self, delay: 0.01) {
            XCTAssertEqual(dispatchCount, 1 , "Dispatched once")
        }
    }
}
