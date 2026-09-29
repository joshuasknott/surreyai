import { expect, test } from '@playwright/test';

const origin = 'http://127.0.0.1:4321';

test('AI Society header leads to six distinct committee applications', async ({ page }) => {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const cta = page.locator('.society-committee-banner');
  await expect(cta).toHaveAttribute('href', '/committee-applications');
  await expect(cta).toContainText('Committee applications are out!');
  await expect(cta.locator('[data-seconds]')).toHaveText(/^\d{2}$/);
  await cta.click();

  await expect(page).toHaveURL(`${origin}/committee-applications`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Join the committee\s*2026–27/);
  await expect(page.locator('.committee-role-card')).toHaveCount(6);

  const roles = [
    'workshops-learning', 'industry-partnerships', 'projects-hackathons',
    'social-media-content', 'events-socials', 'wellbeing-champion',
  ];
  for (const role of roles) {
    await expect(page.locator(`.committee-role-card[href="/committee-applications/${role}"]`)).toHaveCount(1);
  }
  await page.locator('.committee-role-card[href="/committee-applications/workshops-learning"]').click();
  await expect(page).toHaveURL(`${origin}/committee-applications/workshops-learning`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Workshops & Learning Officer');
  await expect(page.locator('textarea[name="workshopTopic"]')).toBeVisible();
  await expect(page.locator('textarea[name="workshopOutline"]')).toBeVisible();
  await expect(page.locator('input[name="fullName"]')).toBeVisible();
});

test('Social Media application includes brand assets and a 15 MB mock post upload', async ({ page }) => {
  await page.goto(`${origin}/committee-applications/social-media-content`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Social Media & Content Officer');
  await expect(page.locator('.committee-assets a')).toHaveCount(3);
  await expect(page.locator('input[name="mockPost"]')).toHaveAttribute('required', '');
  await expect(page.locator('#mock-post-help')).toContainText('15 MB');
  await expect(page.locator('textarea[name="postCaption"]')).toBeVisible();
  await expect(page.locator('textarea[name="postApproach"]')).toBeVisible();
});

test('Committee cards and forms fit a narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/committee-applications', '/committee-applications/social-media-content']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
