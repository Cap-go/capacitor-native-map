import XCTest
@testable import NativeMapPlugin

final class MapEngineProjectionTests: XCTestCase {
    func testEngineEventNamesStable() {
        XCTAssertEqual(MapEngineProjection.updateEvent, "nativeMapEngineUpdate")
        XCTAssertEqual(MapEngineProjection.shownEvent, "nativeMapEngineShown")
        XCTAssertEqual(MapEngineProjection.hiddenEvent, "nativeMapEngineHidden")
        XCTAssertEqual(MapEngineProjection.webEvent, "nativeMapEngineWeb")
    }
}