//
//  StateMessageTests.swift
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

class StateMessageTests: XCTestCase {
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
        
        XCTAssertEqual(root.uuid, uuid, "Message applied")
        XCTAssertEqual(root.string!, "set correctly", "Message applied")
        XCTAssertEqual(root.childModel!.uuid, childUUID, "Message applied")
        XCTAssertEqual(root.childModel!.string!, "ok", "Message applied")
        XCTAssertEqual(scope.modelObjects.count, 2, "Correct number of objects in scope")
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testReaplying() {
        root.observeChange(self, callback: { () -> Void in
            XCTFail("Should not observe changes")
        })
        
        client.receivedMessage(firstMessage)
        
        XCTAssertEqual(root.uuid, firstMessage.rootUUID, "Message applied")
        XCTAssertEqual(root.string!, "set correctly", "Message applied")
        XCTAssertEqual(root.childModel!.string!, "ok", "Message applied")
        XCTAssertEqual(scope.modelObjects.count, 2, "Correct number of objects in scope")
    }
    
    func testReapplyingRemoval() {
        let json: [String: AnyObject] = [
            "type": "ScopeState",
            "index": 2,
            "scopeIndex": 0,
            "rootUUID": uuid.UUIDString,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": ["string": "set correctly"],
                ]
            ]
        ]

        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)

        XCTAssertNil(root.childModel, "Removed child")
        XCTAssertEqual(scope.modelObjects.count, 1, "Correct number of objects in scope")
    }
    
    func testReapplyingMoving() {
        let json: [String: AnyObject] = [
            "type": "ScopeState",
            "index": 2,
            "scopeIndex": 0,
            "rootUUID": uuid.UUIDString,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": [
                        "string": "set correctly",
                        "childModel2": root.childModel!.uuid.UUIDString
                    ],
                ],
                [
                    "type": "add",
                    "uuid": root.childModel!.uuid.UUIDString,
                    "properties": ["string": "ok"],
                    "clsName": "TestModel"
                ]
            ]
        ]
        
        XCTAssert(root.childModel != nil, "Child model moved")
        
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        
        XCTAssert(root.childModel == nil, "Child model moved")
        XCTAssert(root.childModel2 != nil, "Child model moved")
        XCTAssertEqual(scope.modelObjects.count, 2, "Correct number of objects in scope")
    }
    
    func testAddingDependentFirst() {
        let childUUID = NSUUID()
        let childUUID2 = NSUUID()
        
        let json: [String: AnyObject] = [
            "type": "ScopeState",
            "index": 2,
            "scopeIndex": 0,
            "rootUUID": uuid.UUIDString,
            "fragments": [
                [
                    "type": "add",
                    "uuid": childUUID2.UUIDString,
                    "clsName": "TestModel",
                    "properties": ["string": "ok2"]
                ],
                [
                    "type": "add",
                    "uuid": childUUID.UUIDString,
                    "clsName": "TestModel",
                    "properties": [
                        "string": "ok1",
                        "childModel": childUUID2.UUIDString
                    ],
                    "clsName": "TestModel"
                ],
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": [
                        "string": "set correctly",
                        "childModel2": childUUID.UUIDString
                    ]
                ],
            ]
        ]
        
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        
        XCTAssertEqual(root.childModel2!.uuid, childUUID, "Child model added")
        XCTAssertEqual(root.childModel2!.childModel!.uuid, childUUID2, "Child model added")
        XCTAssertEqual(scope.modelObjects.count, 3, "Correct number of objects in scope")
    }
    
    func testModelValueTypes() {
        let json: [String: AnyObject] = [
            "type": "ScopeState",
            "index": 2,
            "scopeIndex": 0,
            "rootUUID": uuid.UUIDString,
            "fragments": [
                [
                    "type": "change",
                    "uuid": uuid.UUIDString,
                    "clsName": "TestModel",
                    "properties": [
                        "string": "set correctly",
                        "testType": 1,
                        "color": 0xFF108040 as UInt,
                        "date" : 100.0,
                        "image": "/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA8AAD/4QMxaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzAxNCA3OS4xNTY3OTcsIDIwMTQvMDgvMjAtMDk6NTM6MDIgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjlFNkU5QzAzNTMyMjExRTQ4QzI0RTkzQ0VENjIxMzQ5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjlFNkU5QzA0NTMyMjExRTQ4QzI0RTkzQ0VENjIxMzQ5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OUU2RTlDMDE1MzIyMTFFNDhDMjRFOTNDRUQ2MjEzNDkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6OUU2RTlDMDI1MzIyMTFFNDhDMjRFOTNDRUQ2MjEzNDkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7gAOQWRvYmUAZMAAAAAB/9sAhAAGBAQEBQQGBQUGCQYFBgkLCAYGCAsMCgoLCgoMEAwMDAwMDBAMDg8QDw4MExMUFBMTHBsbGxwfHx8fHx8fHx8fAQcHBw0MDRgQEBgaFREVGh8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx//wAARCAAKAAoDAREAAhEBAxEB/8QATAABAQAAAAAAAAAAAAAAAAAAAAcBAQEAAAAAAAAAAAAAAAAAAAAGEAEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCRplQgAAP/2Q=="
                    ]
                ]
            ]
        ]
        client.receivedMessage(NetworkMessage.unserializeDictionary(json)!)
        XCTAssertEqual(root.testType, TestType.Active, "Applied enum")
       
        var comp: [CGFloat] = Array(count: 4, repeatedValue: 0);
        root.color!.getRed(&comp[0], green: &comp[1], blue: &comp[2], alpha: &comp[3])
        let red = Int(comp[0] * 255)
        let green = Int(comp[1] * 255)
        let blue = Int(comp[2] * 255)
        let alpha = Int(comp[3] * 255)
        
        XCTAssertEqual(red, 0xFF, "Applied color")
        XCTAssertEqual(green, 0x10, "Applied color")
        XCTAssertEqual(blue, 0x80, "Applied color")
        XCTAssertEqual(alpha, 0x40, "Applied color")

        XCTAssertEqual(root.date!, NSDate(timeIntervalSince1970: 100.0), "Applied date")
        XCTAssertEqual(root.image!.size.width, CGFloat(10), "Applied image")
        XCTAssertEqual(root.image!.size.height, CGFloat(10), "Applied image")
    }
}
