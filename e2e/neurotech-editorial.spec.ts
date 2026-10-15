import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const origin = process.env.E2E_NEUROTECH_ORIGIN || 'http://127.0.0.1:4323';
const evidence = process.env.REFINEMENT_EVIDENCE_DIR || 'output/playwright/neurotech-editorial';

test('Neurotech editorial layout preserves readable content and controls across viewports', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(evidence, { recursive: true });
  for (const [width, height] of [[1440, 1000], [906, 926], [838, 1000], [768, 1024], [761, 900], [760, 900], [390, 844], [320, 640], [1024, 600], [1152, 900], [1280, 720], [1920, 1000]]) {
    await page.setViewportSize({ width, height });
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
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Neurotech Sans');
    for (const heading of await page.locator('main h1, main h2, main h3').all()) {
      const bounds = await heading.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return { textLeft: text.left, textRight: text.right, boxLeft: box.left, boxRight: box.right };
      });
      expect(bounds.textLeft).toBeGreaterThanOrEqual(bounds.boxLeft - 2);
      expect(bounds.textRight).toBeLessThanOrEqual(bounds.boxRight + 2);
    }
    const activityReadability = await page.locator('.nt-activity--reverse').evaluate(row => {
      const paragraph = row.querySelector('p')!;
      const luminance = (color: string) => {
        const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const foreground = luminance(getComputedStyle(paragraph).color);
      const background = luminance(getComputedStyle(row).backgroundColor);
      return {
        contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
        fontSize: parseFloat(getComputedStyle(paragraph).fontSize),
      };
    });
    expect(activityReadability.contrast).toBeGreaterThanOrEqual(4.5);
    expect(activityReadability.fontSize).toBeGreaterThanOrEqual(17);
    for (const action of await page.locator('[data-hero-actions] a').all()) {
      const actionBox = (await action.boundingBox())!;
      expect(actionBox.height).toBeGreaterThanOrEqual(50);
      const wave = (await page.locator('.nt-hero__wave').boundingBox())!;
      expect(actionBox.y + actionBox.height + 12).toBeLessThanOrEqual(wave.y);
    }
    for (const control of await page.locator('[data-hero-actions] a, .nt-join__actions a, .community-socials a, .contact-form button').all()) {
      const rect = (await control.boundingBox())!;
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    }
    if (width > 760) {
      const word = await page.locator('.nt-hero h1 span').evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return { right: rect.right };
      });
      const photo = (await page.locator('.nt-hero__visual').boundingBox())!;
      expect(word.right + 20).toBeLessThanOrEqual(photo.x);
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
    const toggle = page.locator('#society-assistant-neurotech .assistant-toggle');
    await expect(toggle.locator('img')).toHaveAttribute('src', '/images/neurotech-assistant-neuron-gold.webp');
    const toggleBox = (await toggle.boundingBox())!;
    expect(toggleBox.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox.width).toBeLessThanOrEqual(64);
    expect(toggleBox.height).toBeLessThanOrEqual(64);
    await toggle.click();
    const panel = page.locator('#society-assistant-neurotech .assistant-panel');
    await expect(panel).toBeVisible();
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.x).toBeGreaterThanOrEqual(8);
    expect(panelBox.y).toBeGreaterThanOrEqual(8);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width - 8);
    expect(panelBox.y + panelBox.height + 8).toBeLessThanOrEqual(toggleBox.y);
    if ([906, 390, 320].includes(width)) await page.screenshot({ path: join(evidence, `assistant-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  }
  expect(errors).toEqual([]);
});
