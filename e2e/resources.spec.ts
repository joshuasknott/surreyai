import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;
const portfolioStudioHref = 'https://portfolio-studio-1uu.pages.dev';
const viewports = [
  { name: 'desktop', width: 1440, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 320, height: 740 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));

  expect(overflow.html).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

async function expectResourceFilterState(page: Page, access: 'all' | 'free' | 'ai-plus') {
  const cards = page.locator('.resource-card');
  const expectedVisible = access === 'all'
    ? cards
    : page.locator(`.resource-card[data-resource-access="${access}"]`);

  for (const filter of ['all', 'free', 'ai-plus'] as const) {
    const button = page.getByRole('button', { name: filter === 'all' ? 'All resources' : filter === 'free' ? 'Free' : 'AI+', exact: true });
    await expect(button).toHaveAttribute('aria-pressed', String(filter === access));
  }

  if (access === 'all') {
    await expect(cards).toHaveCount(6);
    await expect(page.locator('.resource-card:visible')).toHaveCount(6);
  } else {
    await expect(expectedVisible).toHaveCount(3);
    await expect(page.locator(`.resource-card:not([data-resource-access="${access}"]):visible`)).toHaveCount(0);
  }
}

for (const viewport of viewports) {
  test(`AI resources page preserves the library at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${aiOrigin}/resources`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible();
    const cards = page.locator('.resource-card');
    await expect(cards).toHaveCount(6);
    await expect(page.locator('.resource-card[data-resource-access="free"]')).toHaveCount(3);
    await expect(page.locator('.resource-card[data-resource-access="ai-plus"]')).toHaveCount(3);
    await expect(page.locator('.membership-card')).toHaveCount(0);
    await expect(page.locator(`a[href="${portfolioStudioHref}"]`)).toHaveCount(1);
    await expect(page.locator(`a[href="${portfolioStudioHref}"]`)).toBeVisible();

    await expectResourceFilterState(page, 'all');
    const freeFilter = page.getByRole('button', { name: 'Free', exact: true });
    await freeFilter.focus();
    await expect(freeFilter).toBeFocused();
    await page.keyboard.press('Enter');
    await expectResourceFilterState(page, 'free');

    const aiPlusFilter = page.getByRole('button', { name: 'AI+', exact: true });
    await aiPlusFilter.focus();
    await page.keyboard.press('Enter');
    await expectResourceFilterState(page, 'ai-plus');

    await page.getByRole('button', { name: 'All resources', exact: true }).click();
    await expectResourceFilterState(page, 'all');

    // Planned resources are intentionally informational cards, while Portfolio Studio
    // remains the only existing resource action and keeps its published destination.
    const resourceLinks = await cards.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(resourceLinks).toEqual([portfolioStudioHref]);

    await expect(page.getByRole('link', { name: 'About', exact: true, includeHidden: true })).toHaveAttribute('href', '/#about');
    await expect(page.getByRole('link', { name: 'Events', exact: true, includeHidden: true })).toHaveAttribute('href', '/#programme');
    await expect(page.getByRole('link', { name: 'Committee', exact: true, includeHidden: true })).toHaveAttribute('href', '/#committee');

    await expectNoHorizontalOverflow(page);
    const brand = await page.locator('.society-header .society-brand').boundingBox();
    const join = await page.locator('.society-header .society-nav-join').boundingBox();
    expect(brand).not.toBeNull();
    expect(join).not.toBeNull();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(join!.x);
    await mkdir('output/memberships', { recursive: true });
    await page.screenshot({ path: `output/memberships/resources-${viewport.name}.png`, fullPage: true });
  });
}

test('AI+ resources query selects the AI+ filter directly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${aiOrigin}/resources?access=ai-plus`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: 'AI+', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resource-card[data-resource-access="ai-plus"]')).toHaveCount(3);
  await expect(page.locator('.resource-card[data-resource-access="free"]:visible')).toHaveCount(0);
  await expect(page.locator('.resource-card[data-resource-access="ai-plus"]:visible')).toHaveCount(3);
});

test('all resources and Portfolio Studio remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });

  try {
    const page = await context.newPage();
    await page.goto(`${aiOrigin}/resources`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.resource-card:visible')).toHaveCount(6);
    await expect(page.locator(`a[href="${portfolioStudioHref}"]`)).toBeVisible();
  } finally {
    await context.close();
  }
});
