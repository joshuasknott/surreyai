import { expect, test } from '@playwright/test';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`Hack page links to the live event site at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Hack', exact: true }).first()).toHaveAttribute('href', '/hack');
    await page.getByRole('link', { name: 'Hack', exact: true }).first().click();
    await expect(page).toHaveURL(`${aiOrigin}/hack`);

    await page.goto(`${aiOrigin}/hack`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Build something worth showing.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A national build weekend, taking shape from Surrey.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the hack' })).toHaveAttribute(
      'href',
      'https://surrey-ai-hack-2027.vercel.app/',
    );
    await expect(page.getByRole('link', { name: 'Join the waitlist' }).first()).toHaveAttribute(
      'href',
      'https://surrey-ai-hack-2027.vercel.app/#waitlist',
    );
    await expect(page.getByRole('link', { name: 'Resources', exact: true }).first()).toHaveAttribute('href', '/resources');

    const overflow = await page.evaluate(() => ({
      html: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflow.html).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
  });
}
