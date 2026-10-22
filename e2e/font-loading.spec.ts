import { expect, test, type Route } from '@playwright/test';

const pages = [
  { name: 'AI', url: 'http://127.0.0.1:4321/', text: 'Surrey AI Society' },
  { name: 'planner', url: 'http://127.0.0.1:4321/committee/planner', text: 'Committee planner' },
  { name: 'Business', url: 'http://127.0.0.1:4322/', text: 'Surrey Business Society' },
  { name: 'Neurotech', url: 'http://127.0.0.1:4323/', text: 'Surrey Neurotech Society' },
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const target of pages) {
    test(`${target.name} paints at ${viewport.width}px while Google Fonts is stalled`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const fontRequests: Route[] = [];
      // Leave the request pending, rather than failing it: silent network drops
      // must not leave an otherwise healthy page blank until the browser times out.
      await page.route('https://fonts.googleapis.com/**', route => { fontRequests.push(route); });
      try {
        await page.goto(target.url, { waitUntil: 'domcontentloaded' });
        await expect.poll(() => fontRequests.length).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() =>
          performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint')
        )).toBe(true);
        await expect(page.locator('body')).toContainText(target.text);
      } finally {
        // Release paused routes before screenshots and context teardown.
        await Promise.allSettled(fontRequests.map(route => route.abort()));
      }
      await page.screenshot({ path: testInfo.outputPath('stalled-fonts.png') });
    });
  }
}

test('font styles apply after the external stylesheet finishes loading', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    contentType: 'text/css', body: 'body { --loaded-font-stylesheet: applied; }',
  }));
  await page.goto(pages[0].url, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--loaded-font-stylesheet').trim()
  )).toBe('applied');
});
