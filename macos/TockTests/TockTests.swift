import XCTest
import WebKit
@testable import Tock

// MARK: - TimeFormatter Tests

final class TimeFormatterTests: XCTestCase {

    func testNycTimeFormat() {
        let time = TimeFormatter.nycTime()
        // Format: "h:mm AM" or "hh:mm PM" — e.g. "2:05 PM" or "12:00 AM"
        let pattern = #"^1?\d:\d{2} (AM|PM)$"#
        XCTAssertNotNil(time.range(of: pattern, options: .regularExpression),
                        "Expected h:mm AM/PM format, got: \(time)")
    }

    func testNycTimeNotEmpty() {
        XCTAssertFalse(TimeFormatter.nycTime().isEmpty)
    }

    func testNycTimeContainsColon() {
        XCTAssert(TimeFormatter.nycTime().contains(":"))
    }

    func testNycTimeContainsPeriod() {
        let time = TimeFormatter.nycTime()
        XCTAssert(time.hasSuffix("AM") || time.hasSuffix("PM"),
                  "Time should end with AM or PM, got: \(time)")
    }
}

// MARK: - WindowFramePersistence Tests

final class WindowFramePersistenceTests: XCTestCase {

    private let testKey = "tock-window-frame"

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: testKey)
        super.tearDown()
    }

    func testSaveStoresFrameInUserDefaults() {
        let window = NSWindow(contentRect: NSRect(x: 100, y: 200, width: 480, height: 720),
                              styleMask: [.titled], backing: .buffered, defer: false)
        WindowFramePersistence.save(window: window)

        let dict = UserDefaults.standard.dictionary(forKey: testKey) as? [String: CGFloat]
        XCTAssertNotNil(dict)
        // Compare against actual window.frame (macOS may adjust for title bar)
        let frame = window.frame
        XCTAssertEqual(dict?["x"], frame.origin.x)
        XCTAssertEqual(dict?["y"], frame.origin.y)
        XCTAssertEqual(dict?["w"], frame.size.width)
        XCTAssertEqual(dict?["h"], frame.size.height)
    }

    func testRestoreWithNoSavedFrame() {
        UserDefaults.standard.removeObject(forKey: testKey)
        let window = NSWindow(contentRect: NSRect(x: 50, y: 50, width: 400, height: 600),
                              styleMask: [.titled], backing: .buffered, defer: false)
        let originalFrame = window.frame
        WindowFramePersistence.restore(window: window)
        XCTAssertEqual(window.frame, originalFrame)
    }
}

// MARK: - Bundle Resource Tests

final class BundleResourceTests: XCTestCase {

    func testIndexHtmlBundled() {
        XCTAssertNotNil(Bundle.main.url(forResource: "index", withExtension: "html"),
                        "index.html should be bundled")
    }

    func testStylesCssBundled() {
        XCTAssertNotNil(Bundle.main.url(forResource: "styles", withExtension: "css"),
                        "styles.css should be bundled")
    }

    func testFlapJsBundled() {
        XCTAssertNotNil(Bundle.main.url(forResource: "flap", withExtension: "js"),
                        "flap.js should be bundled")
    }

    func testFlapJsContainsWeatherFunctions() {
        guard let url = Bundle.main.url(forResource: "flap", withExtension: "js"),
              let content = try? String(contentsOf: url) else {
            XCTFail("Could not read flap.js")
            return
        }
        let expected = ["getWeatherSVG", "getWeatherIcon", "fetchWeather",
                        "geocodeCity", "weatherCache", "loadUseCelsius", "cToF"]
        for fn in expected {
            XCTAssert(content.contains(fn), "flap.js should contain \(fn)")
        }
    }

    func testIndexHtmlHasWeatherToggle() {
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html"),
              let content = try? String(contentsOf: url) else {
            XCTFail("Could not read index.html")
            return
        }
        XCTAssert(content.contains("toggle-celsius"), "Should have celsius toggle")
        XCTAssert(content.contains("primary-label-row"), "Should have primary-label-row")
    }

    func testStylesCssHasWeatherStyles() {
        guard let url = Bundle.main.url(forResource: "styles", withExtension: "css"),
              let content = try? String(contentsOf: url) else {
            XCTFail("Could not read styles.css")
            return
        }
        XCTAssert(content.contains(".weather-info"), "Should have .weather-info style")
        XCTAssert(content.contains(".weather-temp"), "Should have .weather-temp style")
        XCTAssert(content.contains(".weather-icon"), "Should have .weather-icon style")
    }
}

// MARK: - WKWebView Integration Tests

final class WebViewIntegrationTests: XCTestCase {

    private var webView: WKWebView!

    override func setUp() {
        super.setUp()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 480, height: 720), configuration: config)
    }

    override func tearDown() {
        webView = nil
        super.tearDown()
    }

    private func loadBundledPage() -> Bool {
        guard let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html") else {
            return false
        }
        webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        return true
    }

    func testWeatherSVGFunctionExists() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "getWeatherSVG is function")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("typeof getWeatherSVG") { result, error in
                XCTAssertNil(error)
                XCTAssertEqual(result as? String, "function")
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testCtoFConversion() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "cToF(0) == 32")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("cToF(0)") { result, error in
                XCTAssertNil(error)
                XCTAssertEqual(result as? Int, 32)
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testCtoFBodyTemp() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "cToF(37) == 99")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("cToF(37)") { result, error in
                XCTAssertNil(error)
                XCTAssertEqual(result as? Int, 99)
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testGetWeatherIconMapping() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "WMO mapping")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            let js = """
            JSON.stringify({
                clear: getWeatherIcon(0),
                partlyCloudy: getWeatherIcon(2),
                overcast: getWeatherIcon(3),
                rain: getWeatherIcon(61),
                snow: getWeatherIcon(71),
                thunder: getWeatherIcon(95)
            })
            """
            self.webView.evaluateJavaScript(js) { result, error in
                XCTAssertNil(error)
                guard let jsonStr = result as? String,
                      let data = jsonStr.data(using: .utf8),
                      let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
                    XCTFail("Invalid JSON response")
                    exp.fulfill()
                    return
                }
                XCTAssertEqual(dict["clear"], "sun")
                XCTAssertEqual(dict["partlyCloudy"], "cloud-sun")
                XCTAssertEqual(dict["overcast"], "cloud")
                XCTAssertEqual(dict["rain"], "rain")
                XCTAssertEqual(dict["snow"], "snow")
                XCTAssertEqual(dict["thunder"], "thunderstorm")
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testGetWeatherSVGReturnsSVG() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "SVG output")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("getWeatherSVG('sun')") { result, error in
                XCTAssertNil(error)
                let svg = result as? String ?? ""
                XCTAssert(svg.hasPrefix("<svg"), "Should start with <svg")
                XCTAssert(svg.contains("fill=\"none\""), "Should be outline only")
                XCTAssert(svg.contains("stroke=\"#e0d8b0\""), "Should have correct stroke")
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testWeatherCacheExists() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "weatherCache exists")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("typeof weatherCache") { result, error in
                XCTAssertNil(error)
                XCTAssertEqual(result as? String, "object")
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }

    func testLoadUseCelsiusDefault() {
        guard loadBundledPage() else { XCTFail("No index.html"); return }
        let exp = expectation(description: "default Fahrenheit")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.webView.evaluateJavaScript("localStorage.removeItem('tock-useCelsius'); loadUseCelsius()") { result, error in
                XCTAssertNil(error)
                XCTAssertEqual(result as? Bool, false, "Default should be Fahrenheit")
                exp.fulfill()
            }
        }
        waitForExpectations(timeout: 10.0)
    }
}

// MARK: - Navigation Policy Tests

final class NavigationPolicyTests: XCTestCase {

    func testCoordinatorCreated() {
        let container = WebViewContainer()
        let coordinator = container.makeCoordinator()
        XCTAssertNotNil(coordinator)
        XCTAssert(coordinator is WKNavigationDelegate)
    }
}
