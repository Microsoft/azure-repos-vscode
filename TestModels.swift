//
//  TestModel.swift
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

@objc enum TestType: Int {
    case Normal
    case Active
};

@objc public class TestModel: ModelObject {
    dynamic var string: String?
    dynamic var integer: Int = 0
    dynamic var testType: TestType = .Normal
    dynamic var uint: UInt = 0
    dynamic var float32: Float = 0.0
    dynamic var uint8: UInt8 = 0
    dynamic var int8: Int8 = 0
    dynamic var uint16: UInt16 = 0
    dynamic var int16: Int16 = 0
    dynamic var uint32: UInt32 = 0
    dynamic var int32: Int32 = 0
    dynamic var uint64: UInt64 = 0
    dynamic var int64: UInt64 = 0
    dynamic var double64: Double = 0
    dynamic var boolean: Bool = false
    dynamic var date: NSDate?
    dynamic var color: UIColor?
    dynamic var image: UIImage?
    dynamic var localString: String?
    dynamic var localModel: ModelObject?
    dynamic var localModelArray: [ModelObject] = []
    
    dynamic var array: [TestModel] = []
    dynamic var array2: [TestModel] = []
    dynamic var anotherArray: [AnotherTestModel] = []
    dynamic var childModel: TestModel?
    dynamic var childModel2: TestModel?
    dynamic var anotherChildModel: AnotherTestModel?
    
    dynamic var throttledProperty: Int = 0
    
    private var nonDynamicInt: Int = 0
    private var nonDynamicString = ""
    
    var compositeProperty: String {
        return "\(float32) \(anotherArray.count)"
    }
    
    override public class func getPropertyAttributes() -> [String: [PropertyAttribute]] {
        return [
            "localString": [.Local],
            "localModel": [.Local],
            "localModelArray": [.Local],
            "compositeProperty": [.Composite(["float32", "anotherArray"])],
            "throttledProperty": [.MinSyncInterval(0.05)]
        ]
    }
}

@objc public class AnotherTestModel: ModelObject {
    dynamic var anotherString: String? = ""
    dynamic var anotherInteger: Int = 0
    
    dynamic var anotherCompositeProperty: String {
        get {
            return "\(anotherString) \(anotherInteger)"
        }
    }
    
    override public class func getPropertyAttributes() -> [String: [PropertyAttribute]] {
        return [
            "anotherCompositeProperty": [.Composite(["anotherString", "anotherInteger"])]
        ]
    }
}