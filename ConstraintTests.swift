//
//  ConstraintTests.swift
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

class ConstraintTests: XCTestCase {
    func testMultipleMatching() {
        let json: [[String: AnyObject]] = [
            [
                "type": "add",
                "uuid": NSUUID().UUIDString,
                "clsName": "TestModel",
                "properties": ["string": "set correctly"]
            ],
            [
                "type": "add",
                "uuid": NSUUID().UUIDString,
                "clsName": "AnotherTestModel",
                "properties": ["anotherString": "set correctly"]
            ],
            [
                "type": "change",
                "uuid": NSUUID().UUIDString,
                "clsName": "TestModel",
                "properties": ["integer": 3]
            ]
        ]
        let fragments = json.map { SyncFragment.unserialize($0)! }
        
        
        let constraints1: [String: AnyObject] = [
            "string": "set correctly"
        ]
        let constraints2: [String: AnyObject] = [
            "anotherString": "set correctly"
        ]
        let constraints3: [String: AnyObject] = [
            "integer": 3
        ]
        let constraints = [
            Constraint(type: .Add, clsName: "TestModel", properties: constraints1, allowAdditionalProperties: false),
            Constraint(type: .Add, clsName: "AnotherTestModel", properties: constraints2, allowAdditionalProperties: false),
            Constraint(type: .Change, clsName: "TestModel", properties: constraints3, allowAdditionalProperties: false),
        ]
        
        XCTAssertTrue(Constraint.matchesAllConstraints(constraints, syncFragments: fragments), "Constraint should match fragment")
    }
    
    func testSimpleValueExistsChangeMatching() {
        let json: [String: AnyObject] = [
            "type": "change",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set new value", "integer": NSNull(), "childModel":"11111-11111-11111-11111-1111"]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Change, clsName: "TestModel", properties: [
            "string": HasNewValuePropertyConstraint(),
            "integer": HasNewValuePropertyConstraint(),
            "childModel": HasNewValuePropertyConstraint()
        ])
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    

    
    func testSimpleAddMatching() {
        let json: [String: AnyObject] = [
            "type": "add",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly"]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Add, clsName: "TestModel")
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleAddWithPropertiesMatching() {
        let json: [String: AnyObject] = [
            "type": "add",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly"]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Add, clsName: "TestModel", properties: ["string": "set correctly"], allowAdditionalProperties: false)
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleAddWithPropertiesMatchingWithBadAdditionalProperties() {
        let json: [String: AnyObject] = [
            "type": "add",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "integer": 3]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Add, clsName: "TestModel", properties: ["string": "set correctly"], allowAdditionalProperties: false)
        XCTAssertFalse(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleAddWithPropertiesMatchingWithAllowedAdditionalProperties() {
        let json: [String: AnyObject] = [
            "type": "add",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "integer": 3]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Add, clsName: "TestModel", properties: ["string": "set correctly"], allowAdditionalProperties: true)
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleAddWithArrayInsertPropertyMatching() {
        let json: [String: AnyObject] = [
            "type": "add",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "array": [NSUUID().UUIDString]]
        ]
        let fragment = SyncFragment.unserialize(json)
        
        let constraint = Constraint(type: .Add, clsName: "TestModel", properties: [
            "string": "set correctly",
            "array": ArrayPropertyConstraint(type: .Insert)
        ], allowAdditionalProperties: false)
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleChangeWithArrayInsertPropertyMatching() {
        let json: [String: AnyObject] = [
            "type": "change",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "array": [NSUUID().UUIDString]]
        ]
        let fragment = SyncFragment.unserialize(json)
        fragment!.originalProperties = [
            "array": []
        ]
        
        let constraint = Constraint(type: .Change, clsName: "TestModel", properties: [
            "string": "set correctly",
            "array": ArrayPropertyConstraint(type: .Insert)
        ], allowAdditionalProperties: false)
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleChangeWithArrayInsertPropertyNotMatching() {
        let json: [String: AnyObject] = [
            "type": "change",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "array": [NSUUID().UUIDString]]
        ]
        let fragment = SyncFragment.unserialize(json)
        fragment!.originalProperties = [
            "array": [NSUUID().UUIDString]
        ]
        
        let constraint = Constraint(type: .Change, clsName: "TestModel", properties: [
            "string": "set correctly",
            "array": ArrayPropertyConstraint(type: .Insert)
        ], allowAdditionalProperties: false)
        XCTAssertFalse(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleChangeWithArrayRemovePropertyMatching() {
        let json: [String: AnyObject] = [
            "type": "change",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "array": []]
        ]
        let fragment = SyncFragment.unserialize(json)
        fragment!.originalProperties = [
            "array": [NSUUID().UUIDString]
        ]
        
        let constraint = Constraint(type: .Change, clsName: "TestModel", properties: [
            "string": "set correctly",
            "array": ArrayPropertyConstraint(type: .Remove)
        ], allowAdditionalProperties: false)
        XCTAssertTrue(constraint.matches(fragment!), "Constraint should match fragment")
    }
    
    func testSimpleChangeWithArrayRemovePropertyNotMatching() {
        let json: [String: AnyObject] = [
            "type": "change",
            "uuid": NSUUID().UUIDString,
            "clsName": "TestModel",
            "properties": ["string": "set correctly", "array": [NSUUID().UUIDString]]
        ]
        let fragment = SyncFragment.unserialize(json)
        fragment!.originalProperties = [
            "array": [NSUUID().UUIDString]
        ]
        
        let constraint = Constraint(type: .Change, clsName: "TestModel", properties: [
            "string": "set correctly",
            "array": ArrayPropertyConstraint(type: .Remove)
        ], allowAdditionalProperties: false)
        XCTAssertFalse(constraint.matches(fragment!), "Constraint should match fragment")
    }
}
