import SwiftUI

// Placeholder for the watch ticket (spec stories 179-183). Scaffold only: proves the watchOS
// app target builds, is embedded in the phone app and shares the App Group — voice capture and
// the deadline glance arrive with that ticket.
@main
struct ZenWatchApp: App {
    var body: some Scene {
        WindowGroup {
            Text("zen")
        }
    }
}
