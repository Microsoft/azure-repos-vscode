//
//  ClientTests.swift
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

class ClientTests: XCTestCase {
    func testOnWaitingRepliesCountChanged() {
        let client = Client(transportAdapterFactory: { TestTransportAdapter() })
        var waitingReplyCount = 0
        client.onWaitingRepliesCountChanged.listen(self) { count in
            waitingReplyCount = Int(count)
        }
        
        client.transport.sendMessage(PingMessage(index: 0, ack: 0, resendMissing: false)) { response in }
        XCTAssertEqual(waitingReplyCount, 1, "Did fire waiting reply with count 1")
        
        client.transport.sendMessage(PingMessage(index: 1, ack: 0, resendMissing: false)) { response in }
        XCTAssertEqual(waitingReplyCount, 2, "Did fire waiting reply with count 2")
        
        client.transport.messageReceived(ReplyMessage(index: 0, replyTo: 0))
        XCTAssertEqual(waitingReplyCount, 1, "Did fire waiting reply with count 1")

        client.transport.messageReceived(ReplyMessage(index: 1, replyTo: 1))
        XCTAssertEqual(waitingReplyCount, 0, "Did fire waiting reply with count 0")
    }
    
    func testRestartSessionOnFatalError() {
        var adapter = TestTransportAdapter()
        let onSendMessage = Signal<NetworkMessage>()
        
        var factoryCallCount: Int = 0
        var transportAdapterDisconnectCallCount: Int = 0
        var sendMessageCallCount = 0

        let client = Client(transportAdapterFactory: {
            factoryCallCount++
            adapter = TestTransportAdapter()
            adapter.onDisconnectCalled.listen(self) {
                transportAdapterDisconnectCallCount++
                return
            }
            adapter.onSendMessageCalled.listen(self) { networkMessage in
                sendMessageCallCount++
                onSendMessage.fire(networkMessage)
            }
            return adapter
        })
        
        let scope1 = Scope(name: "Testing1")
        let scope1FetchParams: [String: AnyObject] = ["param0": 0, "param1": "param"]
        
        let scope2 = Scope(name: "Testing2")
        let scope2FetchParams: [String: AnyObject] = ["param0": 0, "param1": "param"]
        
        let scopesAndFetchParams: [(Scope, [String: AnyObject])] = [
            (scope1, scope1FetchParams),
            (scope2, scope2FetchParams)
        ]
        
        let sessionToken1 = "sessionToken1"
        let sessionToken2 = "sessionToken2"
        
        var msg = SessionCreateReplyMessage(index: 1, sessionToken: sessionToken1, error: nil)
        client.receivedMessage(msg)
        client.session!.scopeAttach(scope1, scopeIndex: 0, fetchParams: scope1FetchParams)
        client.session!.scopeAttach(scope2, scopeIndex: 1, fetchParams: scope2FetchParams)

        XCTAssertEqual(client.session!.token, sessionToken1, "Did set correct session token")
        XCTAssertEqual(client.session!.scopes.count, 2, "Did load scopes")
        
        // Capture state before fatal close
        let transportBeforeFatalClose = client.transport
        let sendMessageCountBeforeFatalClose = sendMessageCallCount
        var sessionCreateMessage: NetworkMessage? = nil
        onSendMessage.listenOnce(self) { networkMessage in
            sessionCreateMessage = networkMessage
        }
        
        // Simulate fatal close
        client.transport.onStatusChanged.fire(.Fatal)
        
        XCTAssertEqual(transportAdapterDisconnectCallCount, 1, "Transport was disconnected")
        XCTAssertEqual(factoryCallCount, 2, "Did create a new transport")
        XCTAssertFalse(transportBeforeFatalClose === client.transport, "Did create a new transport")
        
        // Simulate come back online with new transport adapter
        adapter.status = .Connected

        XCTAssertNotNil(sessionCreateMessage, "Did send a session create message on the new transport")
        XCTAssertEqual(sendMessageCountBeforeFatalClose + 1, sendMessageCallCount, "Did send a session create message on the new transport")
        
        var sentMessages = [NetworkMessage]()
        onSendMessage.listen(self) { networkMessage in
            sentMessages.append(networkMessage)
        }
        
        msg = SessionCreateReplyMessage(index: 1, sessionToken: sessionToken2, error: nil)
        client.receivedMessage(msg)
        onSendMessage.removeListener(self)

        XCTAssertEqual(client.session!.token, sessionToken2, "Did set correct new session token")
        XCTAssertEqual(client.session!.scopes.count, 0, "Still loading scopes")
        
        XCTAssertEqual(sentMessages.count, 2, "Did send messages to fetch scopes")
        var index = 0
        for message in sentMessages {
            if let fetchMessage = message as? ScopeFetchMessage {
                var matched = scopesAndFetchParams.filter { $0.0.name == fetchMessage.name }
                
                if matched.count == 1 {
                    let scope = matched[0].0
                    let params = matched[0].1
                    XCTAssertEqual(fetchMessage.name, scope.name, "Did send correct fetch name")
                    XCTAssertEqual(fetchMessage.params.count, params.count, "Did send correct fetch params count")
                    if fetchMessage.params.count != params.count {
                        continue
                    }
                    for (key, value) in params {
                        let fetchMessageValue: AnyObject = fetchMessage.params[key]!
                        XCTAssertTrue(fetchMessageValue === value, "Did send correct fetch params")
                    }
                } else {
                    XCTAssert(false, "Sent message was a scope fetch message for non-existing scope")
                }
            } else {
                XCTAssert(false, "Sent message was not a scope fetch message")
            }
            index++
        }
    }
}
