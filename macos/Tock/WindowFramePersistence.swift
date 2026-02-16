import AppKit

enum WindowFramePersistence {
    private static let key = "tock-window-frame"

    static func save(window: NSWindow) {
        let frame = window.frame
        let dict: [String: CGFloat] = [
            "x": frame.origin.x,
            "y": frame.origin.y,
            "w": frame.size.width,
            "h": frame.size.height
        ]
        UserDefaults.standard.set(dict, forKey: key)
    }

    static func restore(window: NSWindow) {
        guard let dict = UserDefaults.standard.dictionary(forKey: key) as? [String: CGFloat] else { return }
        guard let x = dict["x"], let y = dict["y"], let w = dict["w"], let h = dict["h"] else { return }
        let frame = NSRect(x: x, y: y, width: w, height: h)
        // Verify the frame is still on a visible screen
        let onScreen = NSScreen.screens.contains { $0.visibleFrame.intersects(frame) }
        if onScreen {
            window.setFrame(frame, display: true)
        }
    }

    static func observe(window: NSWindow) {
        NotificationCenter.default.addObserver(
            forName: NSWindow.didMoveNotification,
            object: window,
            queue: .main
        ) { notification in
            if let w = notification.object as? NSWindow {
                save(window: w)
            }
        }
        NotificationCenter.default.addObserver(
            forName: NSWindow.didResizeNotification,
            object: window,
            queue: .main
        ) { notification in
            if let w = notification.object as? NSWindow {
                save(window: w)
            }
        }
    }
}
