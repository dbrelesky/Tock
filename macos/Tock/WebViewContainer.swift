import SwiftUI
import WebKit

struct WebViewContainer: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()

        // Prevent WebKit from applying automatic dark mode color adjustments
        // The webapp already has a dark design with explicit colors
        let colorSchemeScript = WKUserScript(
            source: "document.querySelector('head').insertAdjacentHTML('afterbegin', '<meta name=\"color-scheme\" content=\"light dark\">')",
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(colorSchemeScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.setValue(false, forKey: "drawsBackground")

        // Disable scroll indicators and bouncing
        if let scrollView = webView.enclosingScrollView {
            scrollView.hasVerticalScroller = false
            scrollView.hasHorizontalScroller = false
        }

        // Load the bundled webapp
        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        }

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Allow file:// URLs (our bundled webapp) and about:blank
            if let url = navigationAction.request.url {
                if url.isFileURL || url.scheme == "about" {
                    decisionHandler(.allow)
                    return
                }
            }
            // Block all external navigation
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Disable WKWebView scroll bounce and scrollbars via JS
            webView.evaluateJavaScript("""
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = 'auto';
                document.body.style.webkitOverflowScrolling = 'auto';
            """)
        }
    }
}
