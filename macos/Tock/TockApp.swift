import SwiftUI

@main
struct TockApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            WebViewContainer()
                .frame(minWidth: 400, minHeight: 600)
                .background(Color(red: 0x11/255.0, green: 0x11/255.0, blue: 0x11/255.0))
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 480, height: 720)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("About Tock") {
                    NSApp.orderFrontStandardAboutPanel(options: [
                        .applicationName: "Tock",
                        .applicationVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0",
                        .credits: NSAttributedString(
                            string: "A split-flap clock for your Mac",
                            attributes: [
                                .foregroundColor: NSColor.labelColor,
                                .font: NSFont.systemFont(ofSize: 12)
                            ]
                        )
                    ])
                }
            }
        }
    }
}
