import Foundation

enum TimeFormatter {
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.timeZone = TimeZone(identifier: "America/New_York")
        f.dateFormat = "h:mm a"
        return f
    }()

    static func nycTime() -> String {
        formatter.string(from: Date())
    }
}
