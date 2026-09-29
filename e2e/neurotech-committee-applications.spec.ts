import { expect, test } from '@playwright/test';

const origin = 'http://127.0.0.1:4323';

test('Neurotech header leads to four role applications', async ({ page }) => {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const cta = page.locator('.society-committee-banner');
  await expect(cta).toContainText('Committee applications are out!');
  await expect(cta.locator('[data-seconds]')).toHaveText(/^\d{2}$/);
  const apply = cta.getByRole('link', { name: 'Apply' });
  await expect(apply).toHaveAttribute('href', '/committee-applications');
  await expect(apply).toBeVisible();
  await apply.click();
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

test('Committee banner stays below the header while scrolling', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
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

test('Homepage banner and activity layout fit phone and wide desktop', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1686, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const apply = page.locator('.society-committee-banner').getByRole('link', { name: 'Apply' });
    await expect(apply).toBeVisible();
    const button = await apply.boundingBox();
    expect(button?.height).toBeGreaterThanOrEqual(44);
    if (width < 760) {
      const countdown = await page.locator('.society-committee-banner__countdown').boundingBox();
      expect(countdown!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
    }
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (width >= 1686) {
      const sections = await page.locator('.nt-hero__inner, .nt-facts, .nt-section-heading, .nt-activity-list').evaluateAll(elements => elements.map(element => {
        const { x, width } = element.getBoundingClientRect();
        return { x: Math.round(x), width: Math.round(width) };
      }));
      expect(sections).toEqual(Array.from({ length: 4 }, () => ({ x: 0, width })));
      const widths = await page.locator('.nt-activity__image').evaluateAll(images => images.map(image => Math.round(image.getBoundingClientRect().width)));
      expect(new Set(widths).size).toBe(1);
    }
  }
});
