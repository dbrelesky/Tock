import AppKit
import WebKit

class MenuBarController {
    private var statusItem: NSStatusItem?
    private var timer: Timer?

    private let cardBg = NSColor(red: 0x2a/255.0, green: 0x2a/255.0, blue: 0x2a/255.0, alpha: 1)
    private let cardBorder = NSColor(red: 0x1a/255.0, green: 0x1a/255.0, blue: 0x1a/255.0, alpha: 1)
    private let dividerColor = NSColor(red: 0x33/255.0, green: 0x33/255.0, blue: 0x33/255.0, alpha: 1)
    private let creamColor = NSColor(red: 0xe0/255.0, green: 0xd8/255.0, blue: 0xb0/255.0, alpha: 1)

    private let cardWidth: CGFloat = 12
    private let cardHeight: CGFloat = 16
    private let cardGap: CGFloat = 1.5
    private let cardRadius: CGFloat = 2
    private let menuBarHeight: CGFloat = 22

    init() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.target = self
            button.action = #selector(statusBarClicked)
            updateTime()
        }

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateTime()
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        if let item = statusItem {
            NSStatusBar.system.removeStatusItem(item)
        }
        statusItem = nil
    }

    private func updateTime() {
        let time = TimeFormatter.nycTime() // e.g. "3:45 PM"
        let image = renderMenuBarImage(time: time)
        statusItem?.button?.image = image
        statusItem?.button?.title = ""
    }

    private func renderMenuBarImage(time: String) -> NSImage {
        // Parse time: "3:45 PM" → digits ["3","4","5"], period "PM", hasLeadingHour = false
        // or "12:05 PM" → digits ["1","2","0","5"], period "PM"
        let parts = time.split(separator: " ")
        let timePart = String(parts[0]) // "3:45" or "12:05"
        let period = parts.count > 1 ? String(parts[1]) : ""

        let colonSplit = timePart.split(separator: ":")
        let hourDigits = Array(String(colonSplit[0])).map(String.init)
        let minuteDigits = Array(String(colonSplit[1])).map(String.init)

        let digitFont = NSFont.monospacedSystemFont(ofSize: 10, weight: .bold)
        let periodFont = NSFont.monospacedSystemFont(ofSize: 7, weight: .medium)

        // Calculate width
        let totalCards = hourDigits.count + minuteDigits.count
        let colonWidth: CGFloat = 5
        let periodWidth = period.isEmpty ? 0 : measureText(period, font: periodFont).width + 3
        let cardsWidth = CGFloat(totalCards) * cardWidth + CGFloat(totalCards - 1) * cardGap
        let totalWidth = cardsWidth + colonWidth + periodWidth + 4 // 4 = padding

        let size = NSSize(width: totalWidth, height: menuBarHeight)
        let image = NSImage(size: size, flipped: false) { rect in
            let yOffset = (rect.height - self.cardHeight) / 2

            var x: CGFloat = 2 // left padding

            // Draw hour digits
            for digit in hourDigits {
                self.drawCard(digit: digit, at: NSPoint(x: x, y: yOffset), font: digitFont)
                x += self.cardWidth + self.cardGap
            }

            // Draw colon (two dots)
            let colonX = x + 0.5
            let dotSize: CGFloat = 2
            let dotColor = self.creamColor.withAlphaComponent(0.6)
            dotColor.setFill()
            let topDot = NSRect(x: colonX, y: yOffset + self.cardHeight * 0.65 - dotSize/2, width: dotSize, height: dotSize)
            let bottomDot = NSRect(x: colonX, y: yOffset + self.cardHeight * 0.35 - dotSize/2, width: dotSize, height: dotSize)
            NSBezierPath(ovalIn: topDot).fill()
            NSBezierPath(ovalIn: bottomDot).fill()
            x += colonWidth

            // Draw minute digits
            for digit in minuteDigits {
                self.drawCard(digit: digit, at: NSPoint(x: x, y: yOffset), font: digitFont)
                x += self.cardWidth + self.cardGap
            }

            // Draw AM/PM
            if !period.isEmpty {
                x += 1.5
                let periodColor = self.creamColor.withAlphaComponent(0.5)
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: periodFont,
                    .foregroundColor: periodColor
                ]
                let periodStr = NSAttributedString(string: period, attributes: attrs)
                let periodSize = periodStr.size()
                let periodY = yOffset + (self.cardHeight - periodSize.height) / 2
                periodStr.draw(at: NSPoint(x: x, y: periodY))
            }

            return true
        }

        image.isTemplate = false
        return image
    }

    private func drawCard(digit: String, at origin: NSPoint, font: NSFont) {
        let cardRect = NSRect(x: origin.x, y: origin.y, width: cardWidth, height: cardHeight)

        // Card background
        let path = NSBezierPath(roundedRect: cardRect, xRadius: cardRadius, yRadius: cardRadius)
        cardBg.setFill()
        path.fill()
        cardBorder.setStroke()
        path.lineWidth = 0.5
        path.stroke()

        // Horizontal divider
        dividerColor.setStroke()
        let dividerPath = NSBezierPath()
        let midY = origin.y + cardHeight / 2
        dividerPath.move(to: NSPoint(x: origin.x + 0.5, y: midY))
        dividerPath.line(to: NSPoint(x: origin.x + cardWidth - 0.5, y: midY))
        dividerPath.lineWidth = 0.5
        dividerPath.stroke()

        // Digit text
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: creamColor
        ]
        let str = NSAttributedString(string: digit, attributes: attrs)
        let strSize = str.size()
        let textX = origin.x + (cardWidth - strSize.width) / 2
        let textY = origin.y + (cardHeight - strSize.height) / 2
        str.draw(at: NSPoint(x: textX, y: textY))
    }

    private func measureText(_ text: String, font: NSFont) -> NSSize {
        let attrs: [NSAttributedString.Key: Any] = [.font: font]
        return NSAttributedString(string: text, attributes: attrs).size()
    }

    @objc private func statusBarClicked() {
        NSApp.activate(ignoringOtherApps: true)
        if let window = NSApp.windows.first(where: { $0.isVisible || $0.canBecomeMain }) {
            window.makeKeyAndOrderFront(nil)
            if let webView = findWebView(in: window.contentView) {
                webView.evaluateJavaScript("openAdmin()")
            }
        }
    }

    private func findWebView(in view: NSView?) -> WKWebView? {
        guard let view = view else { return nil }
        if let webView = view as? WKWebView {
            return webView
        }
        for subview in view.subviews {
            if let found = findWebView(in: subview) {
                return found
            }
        }
        return nil
    }
}
