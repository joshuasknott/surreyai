import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;
const freeMembershipHref = 'https://surreyunion.org/shop/artificial-intelligence-society/9a8a30d9-b5e2-4d40-a864-8e688f5a306a';
const aiPlusHref = '/resources?access=ai-plus';
const viewports = [
  { name: 'desktop', width: 1440, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 320, height: 740 },
] as const;

const freeBenefits = [
  'Events, talks and workshops',
  'Community and networking',
  'WhatsApp and Discord communities',
  'Hackathons and collaborative projects',
  'Selected free learning resources',
  'Society updates and opportunities',
];

const aiPlusBenefits = [
  'Discounts on paid society events',
  'Priority for limited-capacity events',
  'Private AI+ club',
  'Exclusive 1:1 mentoring from the committee',
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));

  expect(overflow.html).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

function expectCardsDoNotOverlap(cards: Locator) {
  return expect.poll(async () => {
    const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    }));

    if (boxes.length !== 2 || !boxes.every((box) => box.width > 0 && box.height > 0)) return false;
    return boxes[0].right <= boxes[1].left + 1
      || boxes[1].right <= boxes[0].left + 1
      || boxes[0].bottom <= boxes[1].top + 1
      || boxes[1].bottom <= boxes[0].top + 1;
  }).toBe(true);
}

test('homepage places the separate memberships section between the hero and programme', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 768 });
  await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });

  const hero = page.locator('.home-hero');
  const memberships = page.locator('#memberships');
  const programme = page.locator('#programme');
  await expect(hero).toBeVisible();
  await expect(memberships).toBeVisible();
  await expect(programme).toBeVisible();
  await expect(page.locator('a[href^="/committee/planner"]')).toHaveCount(0);
  await expect(memberships.getByRole('heading', { name: 'Memberships', exact: true })).toBeVisible();

  const order = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero');
    const memberships = document.querySelector('#memberships');
    const programme = document.querySelector('#programme');
    if (!hero || !memberships || !programme) return null;
    return {
      heroBeforeMemberships: Boolean(hero.compareDocumentPosition(memberships) & Node.DOCUMENT_POSITION_FOLLOWING),
      membershipsBeforeProgramme: Boolean(memberships.compareDocumentPosition(programme) & Node.DOCUMENT_POSITION_FOLLOWING),
      resourcesInsideMemberships: memberships.querySelectorAll('.resource-card').length,
    };
  });

  expect(order).toEqual({
    heroBeforeMemberships: true,
    membershipsBeforeProgramme: true,
    resourcesInsideMemberships: 0,
  });
});

for (const viewport of viewports) {
  test(`membership cards preserve content and responsive bounds at ${viewport.name} size`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });

    const section = page.locator('#memberships');
    const cards = section.locator('.membership-card');
    await expect(section).toBeVisible();
    await expect(cards).toHaveCount(2);

    const freeCard = cards.filter({ has: page.getByRole('heading', { name: 'Free Membership', exact: true }) });
    const aiPlusCard = cards.filter({ has: page.getByRole('heading', { name: 'Surrey AI+', exact: true }) });
    await expect(freeCard).toHaveCount(1);
    await expect(aiPlusCard).toHaveCount(1);

    for (const benefit of freeBenefits) await expect(freeCard).toContainText(benefit);
    for (const benefit of aiPlusBenefits) await expect(aiPlusCard).toContainText(benefit);

    await expect(freeCard.locator(`a[href="${freeMembershipHref}"]`)).toHaveCount(1);
    await expect(freeCard.locator(`a[href="${freeMembershipHref}"]`)).toBeVisible();
    await expect(aiPlusCard.locator(`a[href="${aiPlusHref}"]`)).toHaveCount(1);
    await expect(aiPlusCard.locator(`a[href="${aiPlusHref}"]`)).toBeVisible();
    await expect(aiPlusCard.getByText('COMING SOON', { exact: true })).toBeVisible();

    await expectCardsDoNotOverlap(cards);
    await expectNoHorizontalOverflow(page);
    await mkdir('output/memberships', { recursive: true });
    await section.screenshot({ path: `output/memberships/home-memberships-${viewport.name}.png` });
  });
}

test('homepage keeps the resources navigation separate from memberships', async ({ page }) => {
  await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });
  const resourcesLink = page.getByRole('link', { name: 'Resources', exact: true }).first();
  await expect(resourcesLink).toHaveAttribute('href', '/resources');
  await expect(page.locator('#memberships .resource-card')).toHaveCount(0);
});

test('Explore AI+ routes to the filtered resource library', async ({ page }) => {
  await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#memberships').getByRole('link', { name: 'Explore AI+', exact: true }).click();
  await expect(page).toHaveURL(`${aiOrigin}/resources?access=ai-plus`);
  await expect(page.getByRole('button', { name: 'AI+', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resource-card[data-resource-access="ai-plus"]:visible')).toHaveCount(3);
  await expect(page.locator('.resource-card[data-resource-access="free"]:visible')).toHaveCount(0);
});
