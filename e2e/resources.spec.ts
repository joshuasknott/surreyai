import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 320, height: 740 },
]) {
  test(`AI resources navigation works at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize(viewport);

    await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Resources', exact: true }).first().click();
    await expect(page).toHaveURL(`${aiOrigin}/resources`);
    await expect(page.getByRole('heading', { name: 'Useful things to help you build.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Portfolio Studio' })).toHaveAttribute(
      'href',
      'https://portfolio-studio-1uu.pages.dev',
    );

    await expect(page.getByRole('link', { name: 'About', exact: true, includeHidden: true })).toHaveAttribute('href', '/#about');
    await expect(page.getByRole('link', { name: 'Events', exact: true, includeHidden: true })).toHaveAttribute('href', '/#programme');
    await expect(page.getByRole('link', { name: 'Committee', exact: true, includeHidden: true })).toHaveAttribute('href', '/#committee');

    const overflow = await page.evaluate(() => ({
      html: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflow.html).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
    const brand = await page.locator('.society-header .society-brand').boundingBox();
    const actions = await page.locator('.society-header__actions').boundingBox();
    expect(brand).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(actions!.x);
    await page.locator('.resource-card').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await mkdir('output/migration', { recursive: true });
    await page.screenshot({ path: `output/migration/resources-${viewport.name}.png`, fullPage: true });
  });
}
