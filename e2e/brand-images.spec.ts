import { expect, test, type Locator } from '@playwright/test';

async function expectImage(image: Locator, filename: string) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) =>
    element.complete && element.naturalWidth > 0 ? new URL(element.currentSrc).pathname : '',
  )).toBe(filename);
}

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`public brand images at DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });

    test('selects the right logo in the header and footer', async ({ page }) => {
      await page.goto('/resources');
      const capsule = `/logos/optimized/surrey-ai-capsule-${44 * deviceScaleFactor}.webp`;
      await expectImage(page.locator('.society-header .society-brand img'), capsule);
      await expectImage(page.locator('.society-footer .society-brand img'), capsule);
      await expectImage(page.locator('.assistant-toggle img'), '/logos/optimized/society-112.webp');
    });

    test('uses display-sized artwork and a single favicon on project demos', async ({ page }) => {
      await page.goto('/projects/agentic-builder');
      await expectImage(page.locator('.project-demo-back img'), `/logos/optimized/surrey-ai-avatar-light-${40 * deviceScaleFactor}.webp`);
      await expectImage(page.locator('.aw-showcase-brand img'), `/logos/optimized/surrey-ai-wordmark-${312 * deviceScaleFactor}.webp`);
      const icon = page.locator('link[rel="icon"]');
      await expect(icon).toHaveCount(1);
      await expect(icon).toHaveAttribute('sizes', '32x32');
      const response = await page.request.get((await icon.getAttribute('href'))!);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/png');
    });
  });
}
