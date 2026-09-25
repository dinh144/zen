import Testing
@testable import ZenAPIClient

@Test func appGroupIdentifierIsWellFormed() {
    #expect(appGroupID == "group.com.dinh144.zen")
    #expect(appGroupID.hasPrefix("group."))
}
