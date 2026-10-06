import { expect, test } from '@playwright/test';

const origin = process.env.E2E_AI_ORIGIN || 'http://127.0.0.1:4321';

test('AI Society header leads to seven distinct committee applications', async ({ page }) => {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const cta = page.locator('.society-committee-banner');
  await expect(cta).toHaveAttribute('data-committee-deadline', '2026-10-06T13:44:00Z');
  await expect(cta).toContainText('Committee applications are out!');
  await expect(cta.locator('[data-seconds]')).toHaveText(/^\d{2}$/);
  const apply = cta.getByRole('link', { name: 'Apply' });
  await expect(apply).toHaveAttribute('href', '/committee-applications');
  await expect(apply).toBeVisible();
  await apply.click();

  await expect(page).toHaveURL(`${origin}/committee-applications`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Join the committee\s*2026–27/);
  await expect(page.locator('.committee-role-card')).toHaveCount(7);

  const roles = [
    'workshops-learning', 'industry-partnerships', 'career-opportunities', 'projects-hackathons',
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
  for (const path of ['', '/committee-applications', '/committee-applications/social-media-content']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (!path) {
      const banner = page.locator('.society-committee-banner');
      await expect(page.locator('.society-header .society-brand span')).toBeVisible();
      expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(90);
      const apply = await banner.getByRole('link', { name: 'Apply' }).boundingBox();
      expect(apply!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('Career & Opportunities application asks for an idea and an accessibility plan', async ({ page }) => {
  await page.goto(`${origin}/committee-applications/career-opportunities`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Career & Opportunities Officer');
  await expect(page.locator('textarea[name="careerIdea"]')).toHaveAttribute('required', '');
  await expect(page.locator('textarea[name="careerPlan"]')).toHaveAttribute('required', '');
  await expect(page.locator('input[name="fullName"]')).toBeVisible();
});

test('Committee banner stays below the header while scrolling', async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    if (width === 390) await expect(page.locator('.society-header .society-brand span')).toBeVisible();
    if (width === 768) expect((await page.locator('.society-committee-banner strong').boundingBox())!.height).toBeLessThanOrEqual(22);
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 900);
    });
    const positions = await page.evaluate(() => {
      const header = document.querySelector('.society-header')!.getBoundingClientRect();
      const banner = document.querySelector('.society-committee-banner')!.getBoundingClientRect();
      return { scrollY: window.scrollY, headerTop: Math.round(header.top), gap: Math.round(banner.top - header.bottom) };
    });
    expect(positions.scrollY).toBeGreaterThan(100);
    expect(positions.headerTop).toBe(0);
    expect(Math.abs(positions.gap)).toBeLessThanOrEqual(1);
    await expect(page.locator('.society-committee-banner').getByRole('link', { name: 'Apply' })).toBeInViewport();
  }
});
