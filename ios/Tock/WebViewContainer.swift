import SwiftUI
import WebKit

struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true

        // Inject viewport and color-scheme meta to prevent WebKit dark-mode color shifts.
        // The webapp already has a dark design with explicit colors.
        let colorSchemeScript = WKUserScript(
            source: """
                document.querySelector('head').insertAdjacentHTML(
                    'afterbegin',
                    '<meta name="color-scheme" content="light dark">'
                );
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(colorSchemeScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        // Disable bounce and scroll indicators for a native feel
        webView.scrollView.bounces = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false

        // Keep the screen awake while the clock is visible
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Load the bundled webapp
        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url {
                // Allow file:// URLs (our bundled webapp) and about:blank
                if url.isFileURL || url.scheme == "about" {
                    decisionHandler(.allow)
                    return
                }
                // Allow Open-Meteo API requests (weather data)
                if url.scheme == "https" && (url.host == "api.open-meteo.com" || url.host == "geocoding-api.open-meteo.com") {
                    decisionHandler(.allow)
                    return
                }
            }
            // Block all other external navigation
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Disable extra scrolling via JS for a tighter native feel
            webView.evaluateJavaScript("""
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = 'auto';
                document.body.style.webkitOverflowScrolling = 'touch';
            """)
        }
    }
}
