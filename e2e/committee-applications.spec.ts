import { expect, test } from '@playwright/test';

const origin = `http://${process.env.E2E_HOST || '127.0.0.1'}:4321`;

test('AI Society pages omit the committee application strip', async ({ page }) => {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    for (const path of ['', '/committee-applications', '/committee-applications/social-media-content']) {
      await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.society-committee-banner')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (!path) await page.screenshot({ path: `output/committee-fetch-fix/ai-${width}.png` });
    }
  }
});

test('AI Society retains seven role pages after applications close', async ({ page, request }) => {
  await page.goto(`${origin}/committee-applications`, { waitUntil: 'domcontentloaded' });

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
  for (const role of roles) {
    await page.goto(`${origin}/committee-applications/${role}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Applications have closed/).first()).toBeVisible();
    await expect(page.locator('#committee-application-form')).toHaveCount(0);
  }
  for (const path of ['/api/committee-applications', '/api/committee-upload']) {
    const response = await request.post(`${origin}${path}`, { data: {}, headers: { origin } });
    expect(response.status()).toBe(410);
    expect(await response.json()).toMatchObject({ message: 'Committee applications have closed.' });
  }
});

test('Committee cards and forms fit a narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['', '/committee-applications', '/committee-applications/social-media-content']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (!path) {
      await expect(page.locator('.society-header .society-brand span')).toBeVisible();
      await expect(page.locator('.society-committee-banner')).toHaveCount(0);
    }
  }
});

test('Career & Opportunities role remains readable after closure', async ({ page }) => {
  await page.goto(`${origin}/committee-applications/career-opportunities`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Career & Opportunities Officer');
  await expect(page.getByText(/Applications have closed/).first()).toBeVisible();
  await expect(page.locator('#committee-application-form')).toHaveCount(0);
});

test('AI header remains usable without the committee strip', async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.society-committee-banner')).toHaveCount(0);
    await page.goto(`${origin}/committee-applications`, { waitUntil: 'domcontentloaded' });
    if (width === 390) await expect(page.locator('.society-header .society-brand span')).toBeVisible();
    await expect(page.locator('.society-committee-banner')).toHaveCount(0);
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 900);
    });
    const positions = await page.evaluate(() => {
      const header = document.querySelector('.society-header')!.getBoundingClientRect();
      return { scrollY: window.scrollY, headerTop: Math.round(header.top) };
    });
    expect(positions.scrollY).toBeGreaterThan(100);
    expect(positions.headerTop).toBe(0);
    await expect(page.locator('.society-header .society-nav-join')).toBeInViewport();
  }
});
