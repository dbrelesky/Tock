const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const tests = [
    'flap-tests',
    'clock-tests',
    'cascade-tests',
    'secondary-tests',
    'admin-tests',
    'weather-tests'
  ];

  let allPassed = true;

  for (const test of tests) {
    const page = await browser.newPage();
    const url = 'http://localhost:3000/tests/' + test + '.html';
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForSelector('#summary', { timeout: 10000 });
      await page.waitForTimeout(2000);

      const summary = await page.textContent('#summary');
      const failures = await page.evaluate(() => {
        const els = document.querySelectorAll('.fail');
        return Array.from(els).map(e => e.textContent);
      });

      console.log('=== ' + test + ' ===');
      console.log(summary.trim());
      if (failures.length > 0) {
        allPassed = false;
        failures.forEach(f => console.log('  FAIL: ' + f.trim()));
      }
      console.log('');
    } catch (err) {
      allPassed = false;
      console.log('=== ' + test + ' ===');
      console.log('ERROR: ' + err.message);
      console.log('');
    }
    await page.close();
  }

  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
