import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const origin = process.env.E2E_NEUROTECH_ORIGIN || 'http://127.0.0.1:4323';
const evidence = process.env.REFINEMENT_EVIDENCE_DIR || 'output/playwright/neurotech-editorial';

test('Neurotech editorial layout preserves readable content and controls across viewports', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(evidence, { recursive: true });
  for (const width of [1440, 838, 390, 320, 1024, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const image of await page.locator('main img:not([aria-hidden="true"])').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: join(evidence, `editorial-${width}-full.png`), fullPage: true });
    await page.screenshot({ path: join(evidence, `editorial-${width}-hero.png`) });
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('body')).toHaveClass(/nt-editorial/);
    expect(await page.evaluate(() => document.fonts.check('48px "Neurotech Serif"'))).toBe(true);
    for (const control of await page.locator('[data-hero-actions] a, .nt-join__actions a, .community-socials a, .contact-form button').all()) {
      const rect = (await control.boundingBox())!;
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    }
    if (width > 760) {
      const word = (await page.locator('.nt-hero h1 span').boundingBox())!;
      const photo = (await page.locator('.nt-hero__visual').boundingBox())!;
      expect(word.x + word.width).toBeLessThanOrEqual(photo.x);
    } else {
      for (const copy of await page.locator('.nt-activity__copy').all()) {
        const box = (await copy.boundingBox())!;
        const heading = (await copy.locator('h3').boundingBox())!;
        const paragraph = (await copy.locator('p').boundingBox())!;
        expect(box.height - heading.height - paragraph.height).toBeLessThanOrEqual(56);
      }
    }
    await expect(page.locator('#committee article')).toHaveCount(3);
    await expect(page.locator('.society-committee-banner')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
