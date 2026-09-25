import SwiftUI
import WidgetKit

// Placeholder for the widgets ticket (spec stories 49-50, 151-156). Scaffold only: proves the
// widget extension target builds and embeds in the shared App Group — the real at-hand/drift/
// deadline timelines arrive with that ticket.
struct ZenPlaceholderEntry: TimelineEntry {
    let date: Date
}

struct ZenPlaceholderProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZenPlaceholderEntry { ZenPlaceholderEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (ZenPlaceholderEntry) -> Void) {
        completion(ZenPlaceholderEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZenPlaceholderEntry>) -> Void) {
        completion(Timeline(entries: [ZenPlaceholderEntry(date: .now)], policy: .never))
    }
}

struct ZenPlaceholderWidget: Widget {
    let kind = "ZenPlaceholderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZenPlaceholderProvider()) { _ in
            Text("zen")
        }
        .configurationDisplayName("zen")
        .description("Capture into zen.")
    }
}

@main
struct ZenWidgetBundle: WidgetBundle {
    var body: some Widget {
        ZenPlaceholderWidget()
    }
}
