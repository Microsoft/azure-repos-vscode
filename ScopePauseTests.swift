//
//  ScopePauseTests.swift
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

class ScopePauseTest: XCTestCase {
    var root = TestModel()
    var scope = Scope(name: "Testing")
    var client = Client(transportAdapterFactory: { TestTransportAdapter() })
    var firstMessage: ScopeStateMessage!
    let uuid = NSUUID()
    
    override func setUp() {
        root = TestModel()
        scope = Scope(name: "Testing")
        root.setScopeAndMakeRootModel(scope)
        XCTAssertEqual(scope.modelObjects.count, 1, "Correct number of objects in scope to start with")
        
        client = Client(transportAdapterFactory: { TestTransportAdapter() })
        let msg = SessionCreateReplyMessage(index: 1, sessionToken: "jeah", error: nil)
        client.receivedMessage(msg)
        client.session!.scopeAttach(scope, scopeIndex: 0)
        
        let childUUID = NSUUID()
        
        let json: [String: AnyObject] = [
            "type": "ScopeState",
            "index": 1,
            "scopeIndex": 0,
            "rootUUID": uuid.UUIDString,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": [
                        "string": "set correctly",
                        "integer": 10,
                        "childModel": childUUID.UUIDString
                    ]
                ],
                [
                    "type": "add",
                    "uuid": childUUID.UUIDString,
                    "properties": ["string": "ok"],
                    "clsName": "TestModel"
                ]
            ]
        ]
        
        firstMessage = NetworkMessage.unserializeDictionary(json) as! ScopeStateMessage
        client.receivedMessage(firstMessage)
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testPause() {
        let json: [String: AnyObject] = [
            "type": "ScopeSync",
            "index": 2,
            "scopeIndex": 0,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": ["string": "changed"],
                ]
            ]
        ]
        
        root.scope?.pauseIncomingMessages()
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        XCTAssertEqual(root.string!, "set correctly", "Property not yet changed")

        root.scope?.resumeIncomingMessages()
        XCTAssertEqual(root.string!, "changed", "Property changed")
    }
    
    func testMultiMessagePause() {
        root.scope?.pauseIncomingMessages()
        
        var json: [String: AnyObject] = [
            "type": "ScopeSync",
            "index": 2,
            "scopeIndex": 0,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": ["string": "changed"],
                ]
            ]
        ]
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        
        json = [
            "type": "ScopeSync",
            "index": 3,
            "scopeIndex": 0,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": ["integer": 20],
                ]
            ]
        ]
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        
        XCTAssertEqual(root.string!, "set correctly", "Property not yet changed")
        XCTAssertEqual(root.integer, 10, "Property not yet changed")
        
        root.scope?.resumeIncomingMessages()
        XCTAssertEqual(root.string!, "changed", "Property changed")
        XCTAssertEqual(root.integer, 20, "Property changed")
    }
    
}
