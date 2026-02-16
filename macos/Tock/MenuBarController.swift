import AppKit

class MenuBarController {
    private var statusItem: NSStatusItem?
    private var timer: Timer?

    init() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.font = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
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
        statusItem?.button?.title = TimeFormatter.nycTime()
    }

    @objc private func statusBarClicked() {
        NSApp.activate(ignoringOtherApps: true)
        if let window = NSApp.windows.first(where: { $0.isVisible || $0.canBecomeMain }) {
            window.makeKeyAndOrderFront(nil)
        }
    }
}
