#!/usr/bin/env node

/**
 * iOS Port Validation Tests
 *
 * Validates the iOS port of the Tock macOS app by checking:
 * 1. File structure completeness
 * 2. Swift source correctness (iOS APIs, no macOS-only APIs)
 * 3. Xcode project consistency (pbxproj references)
 * 4. Info.plist correctness for iOS
 * 5. Asset catalog structure
 * 6. Widget extension configuration
 * 7. Parity with macOS app features
 * 8. Web app resource bundling references
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(ROOT, 'ios');
const MACOS_DIR = path.join(ROOT, 'macos');

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
    total++;
    if (condition) {
        passed++;
        console.log(`  PASS: ${message}`);
    } else {
        failed++;
        console.log(`  FAIL: ${message}`);
    }
}

function fileExists(relPath) {
    return fs.existsSync(path.join(IOS_DIR, relPath));
}

function readFile(relPath) {
    return fs.readFileSync(path.join(IOS_DIR, relPath), 'utf8');
}

function readRootFile(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ============================================================
// 1. FILE STRUCTURE TESTS
// ============================================================
console.log('\n1. File Structure Tests');
console.log('─'.repeat(50));

const requiredFiles = [
    'Tock.xcodeproj/project.pbxproj',
    'Tock/TockApp.swift',
    'Tock/WebViewContainer.swift',
    'Tock/TimeFormatter.swift',
    'Tock/Info.plist',
    'Tock/Tock.entitlements',
    'Tock/Assets.xcassets/Contents.json',
    'Tock/Assets.xcassets/AppIcon.appiconset/Contents.json',
    'Tock/Assets.xcassets/AccentColor.colorset/Contents.json',
    'TockWidget/TockWidgetBundle.swift',
    'TockWidget/TockTimeWidget.swift',
    'TockWidget/FlipCardView.swift',
    'TockWidget/Info.plist',
    'TockWidget/Assets.xcassets/Contents.json',
    'TockWidget/Assets.xcassets/AccentColor.colorset/Contents.json',
    'TockWidget/Assets.xcassets/WidgetBackground.colorset/Contents.json',
    'TockTests/TockTests.swift',
];

for (const file of requiredFiles) {
    assert(fileExists(file), `File exists: ${file}`);
}

// Verify NO macOS-only files were copied
assert(!fileExists('Tock/AppDelegate.swift'), 'No AppDelegate.swift (macOS-only)');
assert(!fileExists('Tock/MenuBarController.swift'), 'No MenuBarController.swift (macOS-only)');
assert(!fileExists('Tock/WindowFramePersistence.swift'), 'No WindowFramePersistence.swift (macOS-only)');

// ============================================================
// 2. SWIFT SOURCE — iOS API USAGE
// ============================================================
console.log('\n2. Swift Source — iOS API Usage');
console.log('─'.repeat(50));

// TockApp.swift
const tockApp = readFile('Tock/TockApp.swift');
assert(tockApp.includes('import SwiftUI'), 'TockApp imports SwiftUI');
assert(tockApp.includes('@main'), 'TockApp has @main attribute');
assert(tockApp.includes('struct TockApp: App'), 'TockApp conforms to App');
assert(tockApp.includes('WebViewContainer()'), 'TockApp uses WebViewContainer');
assert(tockApp.includes('.preferredColorScheme(.dark)'), 'TockApp uses dark color scheme');
assert(tockApp.includes('.ignoresSafeArea()'), 'TockApp uses ignoresSafeArea for full-screen');
assert(!tockApp.includes('NSApplicationDelegateAdaptor'), 'TockApp has no macOS NSApplicationDelegateAdaptor');
assert(!tockApp.includes('.windowStyle'), 'TockApp has no macOS windowStyle');
assert(!tockApp.includes('.defaultSize'), 'TockApp has no macOS defaultSize');
assert(!tockApp.includes('NSApp'), 'TockApp has no macOS NSApp references');

// WebViewContainer.swift
const webView = readFile('Tock/WebViewContainer.swift');
assert(webView.includes('import SwiftUI'), 'WebViewContainer imports SwiftUI');
assert(webView.includes('import WebKit'), 'WebViewContainer imports WebKit');
assert(webView.includes('UIViewRepresentable'), 'WebViewContainer uses UIViewRepresentable (iOS)');
assert(!webView.includes('NSViewRepresentable'), 'WebViewContainer does NOT use NSViewRepresentable (macOS)');
assert(webView.includes('makeUIView'), 'WebViewContainer has makeUIView');
assert(webView.includes('updateUIView'), 'WebViewContainer has updateUIView');
assert(!webView.includes('makeNSView'), 'WebViewContainer has NO makeNSView');
assert(!webView.includes('updateNSView'), 'WebViewContainer has NO updateNSView');
assert(webView.includes('WKWebView'), 'WebViewContainer uses WKWebView');
assert(webView.includes('WKNavigationDelegate'), 'WebViewContainer has WKNavigationDelegate');
assert(webView.includes('decidePolicyFor'), 'WebViewContainer has navigation policy');
assert(webView.includes('open-meteo.com'), 'WebViewContainer allows Open-Meteo API');
assert(webView.includes('geocoding-api.open-meteo.com'), 'WebViewContainer allows geocoding API');
assert(webView.includes('.cancel'), 'WebViewContainer blocks external navigation');
assert(webView.includes('scrollView.bounces = false'), 'WebViewContainer disables bounce');
assert(webView.includes('showsVerticalScrollIndicator = false'), 'WebViewContainer hides vertical scrollbar');
assert(webView.includes('showsHorizontalScrollIndicator = false'), 'WebViewContainer hides horizontal scrollbar');
assert(webView.includes('isOpaque = false'), 'WebViewContainer sets non-opaque');
assert(webView.includes('index'), 'WebViewContainer loads index.html');
assert(webView.includes('loadFileURL'), 'WebViewContainer uses loadFileURL');
assert(!webView.includes('enclosingScrollView'), 'WebViewContainer has NO macOS enclosingScrollView');
assert(!webView.includes('drawsBackground'), 'WebViewContainer has NO macOS drawsBackground');
assert(webView.includes('contentInsetAdjustmentBehavior'), 'WebViewContainer configures safe area insets');
assert(webView.includes('allowsInlineMediaPlayback'), 'WebViewContainer allows inline media');

// TimeFormatter.swift
const timeFormatter = readFile('Tock/TimeFormatter.swift');
assert(timeFormatter.includes('import Foundation'), 'TimeFormatter imports Foundation');
assert(timeFormatter.includes('enum TimeFormatter'), 'TimeFormatter is an enum');
assert(timeFormatter.includes('America/New_York'), 'TimeFormatter uses NYC timezone');
assert(timeFormatter.includes('h:mm a'), 'TimeFormatter uses 12-hour format');
assert(timeFormatter.includes('static func nycTime()'), 'TimeFormatter has nycTime() method');
assert(!timeFormatter.includes('import AppKit'), 'TimeFormatter has NO AppKit import');
assert(!timeFormatter.includes('import UIKit'), 'TimeFormatter has NO UIKit import (pure Foundation)');

// ============================================================
// 3. macOS vs iOS COMPARISON
// ============================================================
console.log('\n3. macOS vs iOS Feature Parity');
console.log('─'.repeat(50));

const macosTimeFormatter = fs.readFileSync(path.join(MACOS_DIR, 'Tock/TimeFormatter.swift'), 'utf8');
assert(timeFormatter.includes('America/New_York') && macosTimeFormatter.includes('America/New_York'),
    'Both platforms use same NYC timezone');
assert(timeFormatter.includes('h:mm a') && macosTimeFormatter.includes('h:mm a'),
    'Both platforms use same time format');

// Compare WebViewContainer navigation policies
const macosWebView = fs.readFileSync(path.join(MACOS_DIR, 'Tock/WebViewContainer.swift'), 'utf8');
assert(webView.includes('api.open-meteo.com') && macosWebView.includes('api.open-meteo.com'),
    'Both platforms allow weather API');
assert(webView.includes('geocoding-api.open-meteo.com') && macosWebView.includes('geocoding-api.open-meteo.com'),
    'Both platforms allow geocoding API');

// ============================================================
// 4. XCODE PROJECT (pbxproj) VALIDATION
// ============================================================
console.log('\n4. Xcode Project Validation');
console.log('─'.repeat(50));

const pbxproj = readFile('Tock.xcodeproj/project.pbxproj');

// SDK and deployment target
assert(pbxproj.includes('SDKROOT = iphoneos'), 'Project targets iOS SDK');
assert(!pbxproj.includes('SDKROOT = macosx'), 'Project does NOT target macOS SDK');
assert(pbxproj.includes('IPHONEOS_DEPLOYMENT_TARGET'), 'Project has iOS deployment target');
assert(!pbxproj.includes('MACOSX_DEPLOYMENT_TARGET'), 'Project has NO macOS deployment target');

// Three targets
assert(pbxproj.includes('/* Tock */'), 'Project has Tock app target');
assert(pbxproj.includes('/* TockTests */'), 'Project has TockTests target');
assert(pbxproj.includes('/* TockWidgetExtension */'), 'Project has TockWidgetExtension target');

// Source files referenced
assert(pbxproj.includes('TockApp.swift'), 'pbxproj references TockApp.swift');
assert(pbxproj.includes('WebViewContainer.swift'), 'pbxproj references WebViewContainer.swift');
assert(pbxproj.includes('TimeFormatter.swift'), 'pbxproj references TimeFormatter.swift');
assert(pbxproj.includes('TockTests.swift'), 'pbxproj references TockTests.swift');
assert(!pbxproj.includes('AppDelegate.swift'), 'pbxproj does NOT reference AppDelegate.swift');
assert(!pbxproj.includes('MenuBarController.swift'), 'pbxproj does NOT reference MenuBarController.swift');
assert(!pbxproj.includes('WindowFramePersistence.swift'), 'pbxproj does NOT reference WindowFramePersistence.swift');

// Web app resources
assert(pbxproj.includes('index.html'), 'pbxproj bundles index.html');
assert(pbxproj.includes('styles.css'), 'pbxproj bundles styles.css');
assert(pbxproj.includes('flap.js'), 'pbxproj bundles flap.js');

// Web app paths reference parent directory
assert(pbxproj.includes('../index.html'), 'index.html path is relative to ios/');
assert(pbxproj.includes('../styles.css'), 'styles.css path is relative to ios/');
assert(pbxproj.includes('../flap.js'), 'flap.js path is relative to ios/');

// Widget sources
assert(pbxproj.includes('TockWidgetBundle.swift'), 'pbxproj references TockWidgetBundle.swift');
assert(pbxproj.includes('TockTimeWidget.swift'), 'pbxproj references TockTimeWidget.swift');
assert(pbxproj.includes('FlipCardView.swift'), 'pbxproj references FlipCardView.swift');

// Build configuration
assert(pbxproj.includes('SWIFT_VERSION = 5.0'), 'Project uses Swift 5');
assert(pbxproj.includes('com.darrenbrelesky.Tock.ios'), 'Bundle ID includes .ios suffix');
assert(pbxproj.includes('TARGETED_DEVICE_FAMILY = "1,2"'), 'Targets iPhone (1) and iPad (2)');
assert(pbxproj.includes('SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"'), 'Supports device and simulator');
assert(pbxproj.includes('"com.apple.product-type.application"'), 'Has application product type');
assert(pbxproj.includes('"com.apple.product-type.bundle.unit-test"'), 'Has unit test product type');
assert(pbxproj.includes('"com.apple.product-type.app-extension"'), 'Has app extension product type');

// Build phases
assert(pbxproj.includes('PBXSourcesBuildPhase'), 'Has source build phases');
assert(pbxproj.includes('PBXResourcesBuildPhase'), 'Has resource build phases');
assert(pbxproj.includes('PBXFrameworksBuildPhase'), 'Has framework build phases');
assert(pbxproj.includes('Embed Foundation Extensions'), 'Has widget embed phase');

// Test host
assert(pbxproj.includes('TEST_HOST = "$(BUILT_PRODUCTS_DIR)/Tock.app/Tock"'),
    'Test host points to iOS app bundle (not .app/Contents/MacOS/)');

// No WebKit.framework explicit link (auto-linked on iOS via import)
assert(!pbxproj.includes('WebKit.framework'), 'No explicit WebKit.framework link (auto-linked on iOS)');

// ============================================================
// 5. INFO.PLIST VALIDATION
// ============================================================
console.log('\n5. Info.plist Validation');
console.log('─'.repeat(50));

const infoPlist = readFile('Tock/Info.plist');
assert(infoPlist.includes('LSRequiresIPhoneOS'), 'Info.plist requires iPhone OS');
assert(infoPlist.includes('<true/>'), 'LSRequiresIPhoneOS is true');
assert(infoPlist.includes('UILaunchScreen'), 'Info.plist has UILaunchScreen');
assert(infoPlist.includes('UIRequiredDeviceCapabilities'), 'Info.plist has device capabilities');
assert(infoPlist.includes('arm64'), 'Requires arm64');
assert(infoPlist.includes('UISupportedInterfaceOrientations'), 'Info.plist has supported orientations');
assert(infoPlist.includes('UIInterfaceOrientationPortrait'), 'Supports portrait');
assert(infoPlist.includes('UIInterfaceOrientationLandscapeLeft'), 'Supports landscape left');
assert(infoPlist.includes('UIInterfaceOrientationLandscapeRight'), 'Supports landscape right');
assert(infoPlist.includes('UIStatusBarStyle'), 'Info.plist has status bar style');
assert(infoPlist.includes('UIStatusBarStyleLightContent'), 'Status bar is light (for dark background)');
assert(!infoPlist.includes('LSMinimumSystemVersion'), 'No macOS LSMinimumSystemVersion');
assert(!infoPlist.includes('NSPrincipalClass'), 'No macOS NSPrincipalClass');
assert(!infoPlist.includes('NSMainStoryboardFile'), 'No macOS NSMainStoryboardFile');
assert(infoPlist.includes('CFBundleName'), 'Has bundle name');
assert(infoPlist.includes('Tock'), 'Bundle name is Tock');

// Widget Info.plist
const widgetPlist = readFile('TockWidget/Info.plist');
assert(widgetPlist.includes('NSExtension'), 'Widget plist has NSExtension');
assert(widgetPlist.includes('com.apple.widgetkit-extension'), 'Widget uses WidgetKit extension point');
assert(widgetPlist.includes('Tock Widget'), 'Widget display name is Tock Widget');

// ============================================================
// 6. ENTITLEMENTS VALIDATION
// ============================================================
console.log('\n6. Entitlements Validation');
console.log('─'.repeat(50));

const entitlements = readFile('Tock/Tock.entitlements');
assert(entitlements.includes('com.apple.security.app-sandbox'), 'Has app sandbox entitlement');
assert(entitlements.includes('com.apple.security.network.client'), 'Has network client entitlement (for weather API)');

// ============================================================
// 7. WIDGET — iOS ADAPTATIONS
// ============================================================
console.log('\n7. Widget iOS Adaptations');
console.log('─'.repeat(50));

const widgetTimeWidget = readFile('TockWidget/TockTimeWidget.swift');
assert(widgetTimeWidget.includes('import WidgetKit'), 'Widget imports WidgetKit');
assert(widgetTimeWidget.includes('import SwiftUI'), 'Widget imports SwiftUI');
assert(widgetTimeWidget.includes('TimelineProvider'), 'Widget has TimelineProvider');
assert(widgetTimeWidget.includes('StaticConfiguration'), 'Widget uses StaticConfiguration');
assert(widgetTimeWidget.includes('.systemSmall'), 'Widget supports systemSmall');
assert(widgetTimeWidget.includes('.systemMedium'), 'Widget supports systemMedium');
assert(widgetTimeWidget.includes('America/New_York'), 'Widget uses NYC timezone');
assert(widgetTimeWidget.includes('iOSApplicationExtension 17.0'), 'Widget uses iOS 17 availability check');
assert(!widgetTimeWidget.includes('macOS 14.0'), 'Widget does NOT use macOS 14 availability check');
assert(widgetTimeWidget.includes('containerBackground'), 'Widget uses containerBackground');
assert(widgetTimeWidget.includes('widgetBackground'), 'Widget uses widgetBackground modifier');

const widgetFlipCard = readFile('TockWidget/FlipCardView.swift');
assert(widgetFlipCard.includes('import SwiftUI'), 'FlipCardView imports SwiftUI');
assert(widgetFlipCard.includes('struct FlipCardView: View'), 'FlipCardView is a SwiftUI View');
assert(widgetFlipCard.includes('struct ColonView: View'), 'ColonView is a SwiftUI View');
assert(widgetFlipCard.includes('struct RoundedCornersShape: Shape'), 'RoundedCornersShape is a SwiftUI Shape');
assert(widgetFlipCard.includes('enum CardSize'), 'CardSize enum exists');

const widgetBundle = readFile('TockWidget/TockWidgetBundle.swift');
assert(widgetBundle.includes('@main'), 'Widget bundle has @main');
assert(widgetBundle.includes('WidgetBundle'), 'Widget bundle conforms to WidgetBundle');
assert(widgetBundle.includes('TockTimeWidget()'), 'Widget bundle includes TockTimeWidget');

// ============================================================
// 8. ASSET CATALOGS
// ============================================================
console.log('\n8. Asset Catalog Validation');
console.log('─'.repeat(50));

const appIconJson = JSON.parse(readFile('Tock/Assets.xcassets/AppIcon.appiconset/Contents.json'));
assert(appIconJson.images && appIconJson.images.length > 0, 'AppIcon has image entries');
assert(appIconJson.images[0].platform === 'ios', 'AppIcon targets iOS platform');
assert(appIconJson.images[0].size === '1024x1024', 'AppIcon has 1024x1024 universal size');

const accentColorJson = JSON.parse(readFile('Tock/Assets.xcassets/AccentColor.colorset/Contents.json'));
assert(accentColorJson.colors && accentColorJson.colors.length > 0, 'AccentColor has color entries');

const contentsJson = JSON.parse(readFile('Tock/Assets.xcassets/Contents.json'));
assert(contentsJson.info && contentsJson.info.author === 'xcode', 'Assets.xcassets has xcode author');

const widgetBgJson = JSON.parse(readFile('TockWidget/Assets.xcassets/WidgetBackground.colorset/Contents.json'));
assert(widgetBgJson.colors && widgetBgJson.colors.length > 0, 'WidgetBackground has color entries');
assert(widgetBgJson.colors[0].color, 'WidgetBackground has color definition');

// ============================================================
// 9. TEST SUITE VALIDATION
// ============================================================
console.log('\n9. Test Suite Validation');
console.log('─'.repeat(50));

const tests = readFile('TockTests/TockTests.swift');
assert(tests.includes('import XCTest'), 'Tests import XCTest');
assert(tests.includes('import WebKit'), 'Tests import WebKit');
assert(tests.includes('@testable import Tock'), 'Tests use @testable import');

// Count test functions
const testFunctions = tests.match(/func test\w+\(\)/g) || [];
assert(testFunctions.length >= 16, `Tests have ${testFunctions.length} test functions (expected >= 16)`);

// Test class coverage
assert(tests.includes('TimeFormatterTests'), 'Has TimeFormatter test class');
assert(tests.includes('BundleResourceTests'), 'Has BundleResource test class');
assert(tests.includes('WebViewIntegrationTests'), 'Has WebView integration test class');
assert(tests.includes('NavigationPolicyTests'), 'Has navigation policy test class');
assert(tests.includes('IOSSpecificTests'), 'Has iOS-specific test class');

// iOS-specific test assertions
assert(tests.includes('UIViewRepresentable'), 'Tests verify UIViewRepresentable');
assert(tests.includes('scrollView.bounces'), 'Tests verify scroll bounce disabled');
assert(tests.includes('contentInsetAdjustmentBehavior'), 'Tests verify content inset behavior');
assert(tests.includes('isOpaque'), 'Tests verify opacity configuration');
assert(!tests.includes('NSRect'), 'Tests have NO macOS NSRect');
assert(tests.includes('CGRect'), 'Tests use iOS-compatible CGRect');

// Ported tests from macOS
assert(tests.includes('testNycTimeFormat'), 'Has NYC time format test');
assert(tests.includes('testNycTimeNotEmpty'), 'Has NYC time not empty test');
assert(tests.includes('testNycTimeContainsColon'), 'Has NYC time colon test');
assert(tests.includes('testNycTimeContainsPeriod'), 'Has NYC time period test');
assert(tests.includes('testIndexHtmlBundled'), 'Has index.html bundle test');
assert(tests.includes('testStylesCssBundled'), 'Has styles.css bundle test');
assert(tests.includes('testFlapJsBundled'), 'Has flap.js bundle test');
assert(tests.includes('testWeatherSVGFunctionExists'), 'Has weather SVG function test');
assert(tests.includes('testCtoFConversion'), 'Has cToF conversion test');
assert(tests.includes('testCoordinatorCreated'), 'Has coordinator creation test');

// No macOS-only test patterns
assert(!tests.includes('WindowFramePersistence'), 'Tests have NO WindowFramePersistence tests');
assert(!tests.includes('NSWindow'), 'Tests have NO NSWindow references');

// ============================================================
// 10. WEB APP RESOURCES EXIST AT EXPECTED PATHS
// ============================================================
console.log('\n10. Web App Resource Paths');
console.log('─'.repeat(50));

// The pbxproj references ../index.html etc from the ios/ directory
// These resolve to the root of the repo
assert(fs.existsSync(path.join(ROOT, 'index.html')), 'Root index.html exists');
assert(fs.existsSync(path.join(ROOT, 'styles.css')), 'Root styles.css exists');
assert(fs.existsSync(path.join(ROOT, 'flap.js')), 'Root flap.js exists');

// Verify the web app has the viewport meta tag (needed for proper iPhone rendering)
const indexHtml = readRootFile('index.html');
assert(indexHtml.includes('viewport'), 'index.html has viewport meta tag');
assert(indexHtml.includes('width=device-width'), 'Viewport has device-width');

// Verify the CSS is responsive-ready
const stylesCss = readRootFile('styles.css');
assert(stylesCss.includes('.clock-wall') || stylesCss.includes('clock-wall'), 'CSS has clock-wall class');

// ============================================================
// 11. NO MACOS-ONLY API LEAKS
// ============================================================
console.log('\n11. No macOS-Only API Leaks');
console.log('─'.repeat(50));

const allSwiftFiles = [
    'Tock/TockApp.swift',
    'Tock/WebViewContainer.swift',
    'Tock/TimeFormatter.swift',
];

const macosOnlyAPIs = [
    'NSApplication', 'NSWindow', 'NSStatusBar', 'NSStatusItem',
    'NSBezierPath', 'NSImage', 'NSColor', 'NSFont',
    'NSViewRepresentable', 'NSScreen', 'NSEvent',
    'import AppKit', 'import Cocoa',
];

for (const file of allSwiftFiles) {
    const content = readFile(file);
    for (const api of macosOnlyAPIs) {
        assert(!content.includes(api), `${path.basename(file)} has no ${api}`);
    }
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '═'.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
console.log('═'.repeat(50));

if (failed > 0) {
    console.log('\nFAILED TESTS DETECTED');
    process.exit(1);
} else {
    console.log('\nALL TESTS PASSED');
    process.exit(0);
}
