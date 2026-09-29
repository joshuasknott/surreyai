import { expect, test } from '@playwright/test';

const origin = 'http://127.0.0.1:4323';

test('Neurotech header leads to four role applications', async ({ page }) => {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const cta = page.locator('.society-committee-banner');
  await expect(cta).toHaveAttribute('href', '/committee-applications');
  await expect(cta).toContainText('Committee applications are out!');
  await expect(cta.locator('[data-seconds]')).toHaveText(/^\d{2}$/);
  await cta.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Join the committee.');
  await expect(page.locator('.committee-role-card')).toHaveCount(4);

  await page.locator('.committee-role-card[href="/committee-applications/workshops-projects"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Workshops & Projects Officer');
  await expect(page.locator('textarea[name="workshopIdea"]')).toBeVisible();
  await expect(page.locator('textarea[name="workshopPlan"]')).toBeVisible();
});

test('Social Media form requires a mock post and supplies Neurotech assets', async ({ page }) => {
  await page.goto(`${origin}/committee-applications/social-media-content`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.committee-assets a')).toHaveCount(3);
  await expect(page.locator('input[name="mockPost"]')).toHaveAttribute('required', '');
  await expect(page.locator('#mock-post-help')).toContainText('15 MB');
  await expect(page.locator('textarea[name="postCaption"]')).toBeVisible();
});

test('Cards and form fit a narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/committee-applications', '/committee-applications/social-media-content']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
