//
//  ScopeTests.swift
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

class ScopeTests: XCTestCase {
    var parent = TestModel()
    var child = TestModel()
    var child2 = TestModel()
    var child3 = TestModel()
    var scope = Scope(name: "Testing")

    override func setUp() {
        parent = TestModel()
        child = TestModel()
        child2 = TestModel()
        child3 = TestModel()
        scope = Scope(name: "Testing")
    }
    
    override func tearDown() {
        super.tearDown()
    }
    
    func testAutomaticScopeCreation() {
        parent.isScopeRoot = true
        scope = parent.scope!
        XCTAssertEqual(scope.modelObjects.count, 1 , "Correct amount of models in scope")
        parent.childModel = child
        XCTAssertEqual(scope.modelObjects.count, 2 , "Correct amount of models in scope")
        
        parent.childModel = child2
        XCTAssertEqual(scope.modelObjects.count, 2 , "Correct amount of models in scope")
        
        parent.childModel = child3
        XCTAssertEqual(scope.modelObjects.count, 2 , "Correct amount of models in scope")

        parent.isScopeRoot = false
        XCTAssertEqual(scope.modelObjects.count, 0 , "Correct amount of models in scope")
    }
    
    func testAutomaticLateScopeCreation() {
        parent.childModel = child
        child.childModel = child2
        child.childModel2 = child2
        child2.childModel = child3
        
        parent.isScopeRoot = true
        let scope = parent.scope!
        
        XCTAssertEqual(scope.modelObjects.count, 4 , "Correct amount of models in scope")
        
        parent.isScopeRoot = false
        XCTAssertEqual(scope.modelObjects.count, 0 , "Correct amount of models in scope")
    }
    
    func testScope() {
        parent.setScopeAndMakeRootModel(scope)
        parent.childModel = child
        
        XCTAssertEqual(scope.modelObjects.count, 2 , "Correct amount of models in scope")
    }
    
    func testScopeFragmentCount() {
        parent.setScopeAndMakeRootModel(scope)
        var fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 0 , "Adding root model shouldn't change scope")
        
        parent.childModel = child
        child.childModel = child2
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 3 , "Correct amount of fragments")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Add , "Correct fragment type")
        XCTAssertEqual(fragments[1].type, SyncFragmentType.Change , "Correct fragment type")
        XCTAssertEqual(fragments[2].type, SyncFragmentType.Add , "Correct fragment type")
        
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 0 , "Fragments cleared out after getting")
        
        child.string = "Testing"
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 1 , "Correct amount of fragments")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Change , "Correct fragment type")
        
        parent.childModel = nil
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 1 , "Child removals captured")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Change , "Correct fragment type")
        XCTAssertEqual(fragments[0].properties!["childModel"] as? NSNull, NSNull() , "Child model removed")
        
        child.string = "Testing more"
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 0 , "Removed object no longer listened to")
    }
    
    func testScopeFragmentCountWhenAddingAndChanging() {
        parent.setScopeAndMakeRootModel(scope)
        parent.childModel = child
        child.childModel = child2
        
        parent.string = "testing more"
        child.string = "testing more"
        
        let fragments = scope.getAndClearSyncFragments()
        
        XCTAssertEqual(fragments.count, 3 , "Changes don't create fragments when object have been added")
    }
    
    func testScopeFragmentCountWhenChangingAndRemoving() {
        parent.setScopeAndMakeRootModel(scope)
        parent.childModel = child
        child.childModel = child2
        scope.getAndClearSyncFragments()
        
        child.string = "testing more"
        child2.string = "testing more"
        parent.childModel = nil

        var fragments = scope.getAndClearSyncFragments()
        
        XCTAssertEqual(fragments.count, 1 , "Changes don't create fragments when object has been removed")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Change , "Correct fragment type")
    }
    
    func testScopeFragmentCountWhenRemovingAndChanging() {
        parent.setScopeAndMakeRootModel(scope)
        parent.childModel = child
        child.childModel = child2
        scope.getAndClearSyncFragments()
        
        parent.childModel = nil
        child.string = "testing more"
        child2.string = "testing more"
        
        var fragments = scope.getAndClearSyncFragments()
        
        XCTAssertEqual(fragments.count, 1 , "Changes don't create fragments when object has been removed")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Change , "Correct fragment type")
    }
    
    func testScopeFragmentCountWhenAddingAndRemoving() {
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        parent.childModel = child
        child.childModel = child2
        
        parent.childModel = nil
        
        let fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 1, "Changes don't create fragments when adding and removing")
    }
    
    func testScopeFragmentListening() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self) { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 3, "Changes don't create fragments when object have been added")
            
            var fragment = changeSet.syncFragments[0]
         
            XCTAssert(fragment.type == SyncFragmentType.Add, "Fragment is correct")
            XCTAssertEqual(fragment.objectUUID, self.child.uuid, "Fragment is correct")
            XCTAssert(fragment.properties!.count > 2, "Sending up all default values")
            XCTAssertEqual(fragment.properties!["string"] as? String, "testing", "Fragment is correct")
            XCTAssertEqual(fragment.properties!["childModel2"] as? String, self.child2.uuid.UUIDString.lowercaseString, "Fragment is correct")
            
            fragment = changeSet.syncFragments[1]
            XCTAssertEqual(fragment.type, SyncFragmentType.Change, "Fragment is correct")
            XCTAssertEqual(fragment.objectUUID, self.parent.uuid, "Fragment is correct")
            XCTAssertEqual(fragment.properties!.count, 2, "Fragment is correct")
            XCTAssertEqual(fragment.properties!["string"] as? String, "testing parent", "Fragment is correct")
            XCTAssertEqual(fragment.properties!["childModel"] as? String, self.child.uuid.UUIDString.lowercaseString, "Fragment is correct")
            
            fragment = changeSet.syncFragments[2]
            XCTAssertEqual(fragment.type, SyncFragmentType.Add, "Fragment is correct")
            XCTAssertEqual(fragment.objectUUID, self.child2.uuid, "Fragment is correct")
            XCTAssert(fragment.properties!.count > 2, "Sending up all default values")
            XCTAssertEqual(fragment.properties!["string"] as? String, "testing2", "Fragment is correct")
            XCTAssertEqual(fragment.properties!["integer"] as? Int, 10, "Fragment is correct")

            expectation.fulfill()
        }
        
        parent.childModel = child
        child.childModel2 = child2
        parent.string = "testing parent"
        child.string = "testing"
        child2.string = "testing2"
        child2.integer = 10

        waitForExpectationsWithTimeout(1, handler: nil)
    }

    func testSubsequentRemoval() {
        parent.setScopeAndMakeRootModel(scope)
        var fragments = scope.getAndClearSyncFragments()
  
        parent.childModel = child
        parent.childModel = nil
        fragments = scope.getAndClearSyncFragments()
        XCTAssertEqual(fragments.count, 1 , "Correct amount of fragments")
        XCTAssertEqual(fragments[0].type, SyncFragmentType.Change , "Correct type of fragment")
        XCTAssertEqual(fragments[0].properties!["childModel"] as? NSNull, NSNull() , "Correct type of fragment")
    }
    
    func testEnumerationParsing() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            
            let fragment = changeSet.syncFragments[0]
            XCTAssertEqual(fragment.properties!["testType"] as? Int, 1, "Fragment is correct")

            expectation.fulfill()
        })
        
        parent.testType = .Active
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testDateParsing() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            let fragment = changeSet.syncFragments[0]
            XCTAssertEqual(fragment.properties!["date"] as? Double, 10.0, "Fragment is correct")
            
            expectation.fulfill()
        })
        
        parent.date = NSDate(timeIntervalSince1970: 10)
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testColorParsing() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            let fragment = changeSet.syncFragments[0]
            XCTAssertEqual(fragment.properties!["color"] as? UInt, 0xFF3F7F3F, "Fragment is correct")
            
            expectation.fulfill()
        })
        
        parent.color = UIColor(red: 1.0, green: 0.25, blue: 0.5, alpha: 0.25)
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testImageParsing() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            let fragment = changeSet.syncFragments[0]
            let str = fragment.properties!["image"]! as! String
            XCTAssert(str.characters.count > 100, "Fragment is correct")
            
            expectation.fulfill()
        })
        
        UIGraphicsBeginImageContextWithOptions(CGSize(width: 10, height: 10), true, 0)
        UIColor.whiteColor().setFill()
        UIRectFill(CGRect(x: 0, y: 0, width: 10, height: 10))
        let image = UIGraphicsGetImageFromCurrentImageContext();

        parent.image = image
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testCompositeProperties() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            let fragment = changeSet.syncFragments[0]
            XCTAssertEqual(fragment.properties!.count, 1, "Property count is correct")
            XCTAssert(fragment.properties!["compositeProperty"] == nil, "Don't record compositeProperty")
            
            expectation.fulfill()
        })
        
        parent.float32 = 10.0 // Will invalidate composite property
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testLocalProperties() {
        let expectation = expectationWithDescription("onChange")
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        scope.onChanges.listen(self, callback: { changeSet in
            XCTAssertEqual(changeSet.syncFragments.count, 1, "Created a fragment")
            let fragment = changeSet.syncFragments[0]
            XCTAssertEqual(fragment.properties!.count, 1, "Property count is correct")
            XCTAssert(fragment.properties!["localString"] == nil, "Don't record localString")
            
            expectation.fulfill()
        })
        
        parent.localString = "local change"
        parent.string = "changed"
        waitForExpectationsWithTimeout(1, handler: nil)
    }
    
    func testMinUpdateInterval() {
        parent.setScopeAndMakeRootModel(scope)
        scope.getAndClearSyncFragments()
        
        let date = NSDate()
        var syncFragmentCount = 0
        while NSDate().timeIntervalSinceDate(date) < 0.14 {
            parent.throttledProperty++
            let fragments = scope.getAndClearSyncFragments()
            syncFragmentCount += fragments.count
        }
        XCTAssertEqual(syncFragmentCount, 3, "Only 3 fragments created")
    }
}
