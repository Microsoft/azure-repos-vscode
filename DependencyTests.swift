//
//  DependencyTests.swift
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

class DependencyTests: XCTestCase {
    var testModel = TestModel()
    var anotherTestModel = AnotherTestModel()
    
    override func setUp() {
        testModel = TestModel()
        anotherTestModel = AnotherTestModel()
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testDependentListeners() {
        var fireCount1 = 0
        var fireCount2 = 0
        
        testModel.observeChangeImmediately(self, key: "compositeProperty") { () -> Void in
            fireCount1 += 1
        }
        
        anotherTestModel.observeChangeImmediately(self, key: "anotherCompositeProperty") { () -> Void in
            fireCount2 += 1
        }
        
        testModel.float32 = 2.0
        testModel.float32 = 3.0
        testModel.anotherArray = [anotherTestModel]
        
        XCTAssertEqual(fireCount1, 3, "Dispatched three times")
        XCTAssertEqual(fireCount2, 0, "Not dispatched")
        
        anotherTestModel.anotherString = "kiva"
        anotherTestModel.anotherInteger = 1
        
        XCTAssertEqual(fireCount1, 3, "Dispatched three times")
        XCTAssertEqual(fireCount2, 2, "Dispatched twice")
    }
}
