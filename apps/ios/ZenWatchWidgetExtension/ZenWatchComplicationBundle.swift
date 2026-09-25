import SwiftUI
import WidgetKit

// Placeholder for the watch-complication ticket (spec story 181: "a watch complication showing
// my next deadline"). Scaffold only: proves the complication extension target builds and
// embeds in the watch app — the real deadline data arrives with that ticket.
struct ZenComplicationEntry: TimelineEntry {
    let date: Date
}

struct ZenComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZenComplicationEntry { ZenComplicationEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (ZenComplicationEntry) -> Void) {
        completion(ZenComplicationEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZenComplicationEntry>) -> Void) {
        completion(Timeline(entries: [ZenComplicationEntry(date: .now)], policy: .never))
    }
}

struct ZenComplication: Widget {
    let kind = "ZenComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZenComplicationProvider()) { _ in
            Text("zen")
        }
        .configurationDisplayName("zen")
        .description("Your next deadline.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner])
    }
}

@main
struct ZenWatchComplicationBundle: WidgetBundle {
    var body: some Widget {
        ZenComplication()
    }
}
