const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:3333';
const OUTPUT_DIR = path.join(__dirname, 'new_captures');

// iPhone 15 Pro Max dimensions (for App Store 6.7")
const VIEWPORT = { width: 430, height: 932 };
const DEVICE_SCALE = 3; // 3x for 1290x2796

async function main() {
  const fs = require('fs');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Capture 1: Main clock with seconds
  console.log('Capturing: main clock with seconds...');
  let page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  await page.goto(`${BASE_URL}/marketing/capture_seconds.html`);
  await page.waitForTimeout(3000); // Let animations settle
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'capture_withseconds.png'), fullPage: false });
  await page.close();

  // Capture 2: Clock without seconds
  console.log('Capturing: clock without seconds...');
  page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  await page.goto(`${BASE_URL}/marketing/capture_noseconds.html`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'capture_noseconds.png'), fullPage: false });
  await page.close();

  // Capture 3: Settings panel open
  console.log('Capturing: settings panel...');
  page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  await page.goto(`${BASE_URL}/marketing/capture_settings.html`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'capture_settings.png'), fullPage: false });
  await page.close();

  // Capture 4: Different cities config (London, Tokyo, Sydney, Paris)
  console.log('Capturing: different cities...');
  page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  await page.goto(`${BASE_URL}/index.html`);
  await page.evaluate(() => {
    localStorage.setItem('tock-showSeconds', 'true');
    localStorage.setItem('tock-useCelsius', 'false');
    localStorage.setItem('tock-cities', JSON.stringify([
      { name: "London", tz: "Europe/London" },
      { name: "Tokyo", tz: "Asia/Tokyo" },
      { name: "Sydney", tz: "Australia/Sydney" },
      { name: "Paris", tz: "Europe/Paris" }
    ]));
  });
  await page.reload();
  await page.waitForTimeout(3000);
  // Hide the settings gear for clean capture
  await page.evaluate(() => {
    const gear = document.getElementById('admin-trigger');
    if (gear) gear.style.display = 'none';
  });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'capture_intl_cities.png'), fullPage: false });
  await page.close();

  // Capture 5: Mid-flip animation (try to catch a digit change)
  console.log('Capturing: mid-flip attempt...');
  page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  await page.goto(`${BASE_URL}/marketing/capture_seconds.html`);
  await page.waitForTimeout(2000);
  // Wait for a second boundary and capture rapidly
  const captures = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `capture_flip_${String(i).padStart(2,'0')}.png`), fullPage: false });
  }
  console.log('  Took 20 rapid captures to catch mid-flip');
  await page.close();

  await browser.close();
  console.log(`\nDone! Captures saved to ${OUTPUT_DIR}`);
}

main().catch(console.error);
