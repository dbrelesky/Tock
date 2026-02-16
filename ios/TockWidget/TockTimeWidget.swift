import WidgetKit
import SwiftUI

struct TimeEntry: TimelineEntry {
    let date: Date
}

struct TockTimeProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimeEntry {
        TimeEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (TimeEntry) -> Void) {
        completion(TimeEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimeEntry>) -> Void) {
        var entries: [TimeEntry] = []
        let now = Date()

        // Generate one entry per minute for the next 60 minutes
        for offset in 0..<60 {
            if let entryDate = Calendar.current.date(byAdding: .minute, value: offset, to: now) {
                entries.append(TimeEntry(date: entryDate))
            }
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct TockWidgetEntryView: View {
    var entry: TimeEntry
    @Environment(\.widgetFamily) var family

    private static let nycZone = TimeZone(identifier: "America/New_York")!

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallClockView(date: entry.date)
            case .systemMedium:
                MediumClockView(date: entry.date)
            default:
                SmallClockView(date: entry.date)
            }
        }
        .widgetBackground()
    }
}

struct SmallClockView: View {
    let date: Date

    private var timeComponents: (hour: [String], minute: [String], period: String) {
        parseNYCTime(date)
    }

    var body: some View {
        let tc = timeComponents
        VStack(spacing: 6) {
            Text("NYC")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundColor(Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255).opacity(0.5))
                .tracking(2)

            HStack(spacing: 3) {
                ForEach(tc.hour.indices, id: \.self) { i in
                    FlipCardView(digit: tc.hour[i], size: .small)
                }

                ColonView(size: .small)

                ForEach(tc.minute.indices, id: \.self) { i in
                    FlipCardView(digit: tc.minute[i], size: .small)
                }
            }

            Text(tc.period)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255).opacity(0.4))
        }
    }
}

struct MediumClockView: View {
    let date: Date

    private var timeComponents: (hour: [String], minute: [String], period: String) {
        parseNYCTime(date)
    }

    private var seconds: [String] {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "America/New_York")
        formatter.dateFormat = "ss"
        return Array(formatter.string(from: date)).map(String.init)
    }

    var body: some View {
        let tc = timeComponents
        let sec = seconds
        VStack(spacing: 8) {
            Text("NEW YORK")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundColor(Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255).opacity(0.5))
                .tracking(3)

            HStack(spacing: 3) {
                ForEach(tc.hour.indices, id: \.self) { i in
                    FlipCardView(digit: tc.hour[i], size: .medium)
                }

                ColonView(size: .medium)

                ForEach(tc.minute.indices, id: \.self) { i in
                    FlipCardView(digit: tc.minute[i], size: .medium)
                }

                ColonView(size: .medium)

                ForEach(sec.indices, id: \.self) { i in
                    FlipCardView(digit: sec[i], size: .medium)
                }

                Text(tc.period)
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(Color(red: 0xe0/255, green: 0xd8/255, blue: 0xb0/255).opacity(0.4))
                    .padding(.leading, 2)
            }
        }
    }
}

// MARK: - Helpers

private func parseNYCTime(_ date: Date) -> (hour: [String], minute: [String], period: String) {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: "America/New_York")
    formatter.dateFormat = "h:mm a"
    let str = formatter.string(from: date) // "3:45 PM"

    let parts = str.split(separator: " ")
    let timePart = String(parts[0])
    let period = parts.count > 1 ? String(parts[1]) : ""

    let colonSplit = timePart.split(separator: ":")
    let hourDigits = Array(String(colonSplit[0])).map(String.init)
    let minuteDigits = Array(String(colonSplit[1])).map(String.init)

    return (hourDigits, minuteDigits, period)
}

struct TockTimeWidget: Widget {
    let kind = "com.darrenbrelesky.TockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TockTimeProvider()) { entry in
            TockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tock Clock")
        .description("Split-flap clock showing NYC time")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Background Modifier

extension View {
    func widgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            return AnyView(self.containerBackground(for: .widget) {
                Color(red: 0x11/255, green: 0x11/255, blue: 0x11/255)
            })
        } else {
            return AnyView(
                self
                    .padding()
                    .background(Color(red: 0x11/255, green: 0x11/255, blue: 0x11/255))
            )
        }
    }
}
