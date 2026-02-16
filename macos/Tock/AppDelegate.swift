import AppKit

class AppDelegate: NSObject, NSApplicationDelegate {
    private var menuBarController: MenuBarController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        menuBarController = MenuBarController()

        // Restore saved window frame
        if let window = NSApp.windows.first {
            WindowFramePersistence.restore(window: window)
            WindowFramePersistence.observe(window: window)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        menuBarController?.stop()
    }
}
