//
//  ModelValueTests.swift
//  Jetstream
//
//  Created by Tuomas Artman on 4/13/15.
//  Copyright (c) 2015 Uber Technologies Inc. All rights reserved.
//

import XCTest
@testable import Jetstream

class ModelValueTests: XCTestCase {
    
    func testEqaulity() {
        let string = "test"
        XCTAssertTrue(string.equalTo(string), "Should have passed")
        XCTAssertFalse(string.equalTo(1), "Should not have passed")
        
        let int: Int = 1
        XCTAssertTrue(int.equalTo(int), "Should have passed")
        XCTAssertFalse(int.equalTo(string), "Should not have passed")
        
        let uint: Int = 1
        XCTAssertTrue(uint.equalTo(uint), "Should have passed")
        XCTAssertFalse(uint.equalTo(string), "Should not have passed")
        
        let int8: Int8 = 1
        XCTAssertTrue(int8.equalTo(int8), "Should have passed")
        XCTAssertFalse(int8.equalTo(string), "Should not have passed")
        
        let uint8: UInt8 = 1
        XCTAssertTrue(uint8.equalTo(uint8), "Should have passed")
        XCTAssertFalse(uint8.equalTo(string), "Should not have passed")
        
        let int16: Int16 = 1
        XCTAssertTrue(int16.equalTo(int16), "Should have passed")
        XCTAssertFalse(int16.equalTo(string), "Should not have passed")
        
        let uint16: UInt16 = 1
        XCTAssertTrue(uint16.equalTo(uint16), "Should have passed")
        XCTAssertFalse(uint16.equalTo(string), "Should not have passed")
        
        let int32: Int32 = 1
        XCTAssertTrue(int32.equalTo(int32), "Should have passed")
        XCTAssertFalse(int32.equalTo(string), "Should not have passed")
        
        let uint32: UInt32 = 1
        XCTAssertTrue(uint32.equalTo(uint32), "Should have passed")
        XCTAssertFalse(uint32.equalTo(string), "Should not have passed")
        
        let float: Float = 1.0
        XCTAssertTrue(float.equalTo(float), "Should have passed")
        XCTAssertFalse(float.equalTo(string), "Should not have passed")
        
        let double: Double = 1.0
        XCTAssertTrue(double.equalTo(double), "Should have passed")
        XCTAssertFalse(double.equalTo(string), "Should not have passed")
        
        let bool: Bool = true
        XCTAssertTrue(bool.equalTo(bool), "Should have passed")
        XCTAssertFalse(bool.equalTo(string), "Should not have passed")
    }

}
