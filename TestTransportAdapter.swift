//
//  TestTransportAdapter.swift
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

@testable import Jetstream

class TestConnectionOptions: ConnectionOptions {
    var url: NSURL { return NSURL(string: "http://localhost")! }
}

public class TestTransportAdapter: TransportAdapter {
    public let onStatusChanged = Signal<(TransportStatus)>()
    public let onMessage = Signal<(NetworkMessage)>()
    
    public var adapterName: String { return "TestTransportAdapter" }
    public var status: TransportStatus = .Closed {
        didSet {
            onStatusChanged.fire(status)
        }
    }
    public let options: ConnectionOptions
    
    let onConnectCalled = Signal<()>()
    let onDisconnectCalled = Signal<()>()
    let onReconnectCalled = Signal<()>()
    let onSendMessageCalled = Signal<(NetworkMessage)>()
    let onSessionEstablishedCalled = Signal<(Session)>()
    
    init(options: ConnectionOptions) {
        self.options = options
    }
    
    convenience init() {
        self.init(options: TestConnectionOptions())
    }
    
    public func connect() {
        onConnectCalled.fire()
    }
    
    public func disconnect() {
        onDisconnectCalled.fire()
    }
    
    public func reconnect() {
        onReconnectCalled.fire()
    }
    
    public func sendMessage(message: NetworkMessage) {
        onSendMessageCalled.fire(message)
    }
    
    public func sessionEstablished(session: Session) {
        onSessionEstablishedCalled.fire(session)
    }
}
