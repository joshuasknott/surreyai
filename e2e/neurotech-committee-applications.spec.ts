import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const origin = process.env.E2E_NEUROTECH_ORIGIN || 'http://127.0.0.1:4323';
const mascot = '/images/neurotech-assistant-neuron-gold.webp';
const evidenceDir = process.env.REFINEMENT_EVIDENCE_DIR;

test('Closed Neurotech applications are no longer advertised', async ({ page, request }) => {
  for (const path of ['/', '/committee-applications', '/committee-applications/social-media-content']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.society-committee-banner')).toHaveCount(0);
    await expect(page.locator('[data-committee-apply], [data-committee-countdown]')).toHaveCount(0);
    if (path !== '/') {
      await expect(page.getByText(/Applications have closed/).first()).toBeVisible();
      await expect(page.locator('#committee-application-form')).toHaveCount(0);
    }
  }
  for (const path of ['/api/committee-applications', '/api/committee-upload']) {
    const response = await request.post(`${origin}${path}`, { data: {}, headers: { origin } });
    expect(response.status()).toBe(410);
    expect(await response.json()).toMatchObject({ message: 'Committee applications have closed.' });
  }
});

for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) {
  test(`Neurotech neuron mascot and assistant fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('.assistant-toggle');
    await expect(toggle.locator('img')).toHaveAttribute('src', mascot);
    await expect.poll(() => toggle.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const target = (await toggle.boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.x + target.width).toBeLessThanOrEqual(width);
    expect(target.y + target.height).toBeLessThanOrEqual(height);
    if (evidenceDir) {
      await mkdir(evidenceDir, { recursive: true });
      await page.screenshot({ path: join(evidenceDir, `neurotech-${width}-closed.png`) });
    }
    await toggle.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('.assistant-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.assistant-brand img')).toHaveAttribute('src', mascot);
    await expect(panel.locator('textarea')).toBeFocused();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(target.y);
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
    if (evidenceDir) await page.screenshot({ path: join(evidenceDir, `neurotech-${width}-open.png`) });
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await expect(panel).toBeVisible();
    await panel.locator('.assistant-close').click();
    await expect(panel).toBeHidden();
  });
}

test('Neurotech activity layout fits phone and wide desktop', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1686, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.society-committee-banner')).toHaveCount(0);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-hero-actions] a').first()).toBeVisible();
  }
});
