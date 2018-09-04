//
//  ModelObjectTests.swift
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

class ModelObjectTests: XCTestCase {
    func testModelProperties() {
        let model = TestModel()
        
        var prop = model.properties["integer"]
        XCTAssertEqual(prop!.key, "integer" , "Property recognized")
        
        prop = model.properties["nonDynamicInt"]
        XCTAssert(prop == nil, "Non-dynamic property not recognized")
        
        prop = model.properties["nonDynamicString"]
        XCTAssert(prop == nil, "Non-dynamic property not recognized")
    }
    
    func testChildModelObjectsAccessor() {
        let model = TestModel()
        let model2 = TestModel()
        let model3 = TestModel()
        let model4 = TestModel()
        let model5 = TestModel()
        
        model.childModel = model2
        model.childModel2 = model3
        model.array = [model4, model5]
        
        XCTAssertEqual(model.childModelObjects.count, 4 , "All child models should be returned")
        XCTAssertNotNil(model.childModelObjects.indexOf(model2), "Model should be found")
        XCTAssertNotNil(model.childModelObjects.indexOf(model3), "Model should be found")
        XCTAssertNotNil(model.childModelObjects.indexOf(model4), "Model should be found")
        XCTAssertNotNil(model.childModelObjects.indexOf(model5), "Model should be found")
    }
    
    func testModelObjectPropertyRemoveParentUsingDifferingParentAndChildTypes() {
        let model = TestModel()
        let model2 = AnotherTestModel()
        
        model.anotherArray = [model2]
        model.anotherChildModel = model2
        XCTAssertEqual(model2.parents.count, 2, "Should add parent when set as child model")
        
        model.anotherArray = []
        XCTAssertEqual(model2.parents.count, 1, "Should remove parent when unset as child model")
        
        model.anotherChildModel = nil
        XCTAssertEqual(model2.parents.count, 0, "Should remove parent when unset as child model")
    }
}
