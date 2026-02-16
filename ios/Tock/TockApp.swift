import SwiftUI

@main
struct TockApp: App {
    var body: some Scene {
        WindowGroup {
            WebViewContainer()
                .background(Color(red: 0x11/255.0, green: 0x11/255.0, blue: 0x11/255.0))
                .preferredColorScheme(.dark)
                .ignoresSafeArea()
                .statusBarHidden(false)
        }
    }
}
