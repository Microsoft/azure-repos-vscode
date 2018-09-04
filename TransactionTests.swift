//
//  TransactionTests.swift
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

class TransactionTests: XCTestCase {
    var root = TestModel()
    var child = TestModel()
    var scope = Scope(name: "Testing")
    var client = Client(transportAdapterFactory: { TestTransportAdapter() })
    var firstMessage: ScopeStateMessage!
    
    override func setUp() {
        root = TestModel()
        child = TestModel()
        root.childModel = child
        scope = Scope(name: "Testing")
        root.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
 
        client = Client(transportAdapterFactory: { TestTransportAdapter() })
        let msg = SessionCreateReplyMessage(index: 1, sessionToken: "jeah", error: nil)
        client.receivedMessage(msg)
        client.session!.scopeAttach(scope, scopeIndex: 0)
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testChangeSetSuccessfulCompletionWithoutModifications() {
        var didCall = false
        
        root.scope!.modify {
            self.root.integer = 10
            self.root.float32 = 10.0
            self.root.string = "test"
        }.observeCompletion(self) { error in
            XCTAssertNil(error, "No error")
            didCall = true
        }
        
        let json: [String: AnyObject] = [
            "type": "ScopeSyncReply",
            "index": 2,
            "replyTo": 1,
            "fragmentReplies": [
                [String: AnyObject](),
            ]
        ]
        
        let reply = ScopeSyncReplyMessage.unserialize(json)
        client.transport.messageReceived(reply!)

        XCTAssertEqual(didCall, true, "Did invoke completion block")
        XCTAssertEqual(self.root.integer, 10, "No rollback")
        XCTAssert(self.root.float32 == 10.0, "No rollback")
        XCTAssertEqual(self.root.string!, "test", "No rollback")
    }
    
    func testChangeSetSuccessfulCompletionWithModifications() {
        var didCall = false
        
        root.scope!.modify {
            self.root.integer = 10
            self.root.float32 = 10.0
            self.root.string = "test"
        }.observeCompletion(self) { error in
            XCTAssertNil(error, "No error")
            didCall = true
        }
        
        let json: [String: AnyObject] = [
            "type": "ScopeSyncReply",
            "index": 2,
            "replyTo": 1,
            "fragmentReplies": [
                ["modifications": [
                    "integer": 20,
                    "double64": 20.0
                ]]
            ]
        ]
        
        let reply = ScopeSyncReplyMessage.unserialize(json)
        client.transport.messageReceived(reply!)
        
        XCTAssertEqual(didCall, true, "Did invoke completion block")
        XCTAssertEqual(self.root.integer, 20, "Applied modification")
        XCTAssert(self.root.float32 == 10.0, "No rollback")
        XCTAssertEqual(self.root.string!, "test", "No rollback")
        XCTAssert(self.root.double64 == 20.0, "Applied modification")
    }
    
    func testChangeSetFragmentReplyMismatch() {
        var didCall = false
        
        root.scope!.modify {
            self.root.integer = 10
            self.root.float32 = 10.0
            self.root.string = "test"
        }.observeCompletion(self) { error in
            XCTAssertEqual(error!.localizedDescription, "Failed to apply change set", "Errored out")
            didCall = true
        }

        let json: [String: AnyObject] = [
            "type": "ScopeSyncReply",
            "index": 2,
            "replyTo": 1,
            "fragmentReplies": [[String: AnyObject]]()
        ]

        let reply = ScopeSyncReplyMessage.unserialize(json)
        client.transport.messageReceived(reply!)
        
        XCTAssertEqual(didCall, true, "Did invoke completion block")
        XCTAssertEqual(self.root.integer, 0, "Did rollback")
        XCTAssert(self.root.float32 == 0.0, "Did rollback")
        XCTAssertNil(self.root.string, "Did rollback")
    }
    
    func testChangeInvalidMessageTypeError() {
        var didCall = false
        
        root.scope!.modify {
            self.root.integer = 10
            self.root.float32 = 10.0
            self.root.string = "test"
        }.observeCompletion(self) { error in
            XCTAssertEqual(error!.localizedDescription, "Failed to apply change set", "Errored out")
            didCall = true
        }
        
        client.transport.messageReceived(ReplyMessage(index: 2, replyTo: 1))

        XCTAssertEqual(didCall, true, "Did invoke completion block")
        XCTAssertEqual(self.root.integer, 0, "Did rollback")
        XCTAssert(self.root.float32 == 0.0, "Did rollback")
        XCTAssertNil(self.root.string, "Did rollback")
    }
    
    func testSpecificFragmentReversal() {
        var didCall = false
        
        root.scope!.modify {
            self.root.integer = 20
            self.child.integer = 20
        }.observeCompletion(self) { error in
            XCTAssertEqual(self.root.integer, 0, "Kept change")
            XCTAssertEqual(self.child.integer, 20, "Reverted change")
            didCall = true
        }
        
        let json: [String: AnyObject] = [
            "type": "ScopeSyncReply",
            "index": 2,
            "replyTo": 1,
            "fragmentReplies": [
                [String: AnyObject](),
                ["error": [
                    "type": "invalid-type",
                    "message": "Invalid type for property 'name'"
                    ]
                ]
            ]
        ]
        
        let reply = ScopeSyncReplyMessage.unserialize(json)
        client.transport.messageReceived(reply!)
        XCTAssertEqual(didCall, true, "Did invoke completion block")
    }
}
