import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;
const hackOrigin = 'https://surrey-ai-hack-2027.vercel.app/';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 320, height: 740 },
];

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));
  expect(overflow.html).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

test.describe('AI Hack homepage promotion', () => {
  test.beforeAll(async () => {
    await mkdir('output/hack-homepage', { recursive: true });
  });

  for (const viewport of viewports) {
    test(`promotes Surrey AI Hack 2027 accessibly at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });

      const header = page.locator('.society-header');
      await expect(header.locator('a[href="/hack"]')).toHaveCount(0);

      const promotion = page.locator('#surrey-ai-hack');
      await expect(promotion).toBeVisible();
      await expect(promotion.locator('img[alt*="Surrey AI Hack" i]')).toHaveCount(1);

      const cta = promotion.getByRole('link', { name: 'Explore Surrey AI Hack 2027', exact: true });
      await expect(cta).toHaveAttribute('href', hackOrigin);
      await expect(cta).toHaveAttribute('target', '_blank');
      await expect(cta).toHaveAttribute('rel', /noopener/);
      await cta.focus();
      await expect(cta).toBeFocused();

      await expectNoHorizontalOverflow(page);
      await promotion.locator('h2').click();
      await expect.poll(() => promotion.locator('img[alt*="Surrey AI Hack" i]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await promotion.screenshot({ path: `output/hack-homepage/section-${viewport.name}.png` });
      await page.screenshot({ path: `output/hack-homepage/home-${viewport.name}.png`, fullPage: true });

      await page.goto(`${aiOrigin}/resources`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.society-header a[href="/hack"]')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    });
  }
});
