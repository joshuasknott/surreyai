import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

const previewHost = process.env.E2E_HOST || '127.0.0.1';
const aiOrigin = `http://${previewHost}:4321`;
const screenshotWidths = [320, 390, 768, 1024, 1182, 1440];

const officers = [
  { name: 'Joshua Knott', role: 'President' },
  { name: 'Poppy Holmes', role: 'Vice President' },
  { name: 'Vinayak Vadhera', role: 'Treasurer' },
];

const teams = [
  { name: 'Workshops & Learning', members: ["Amanda Lages O'Connor", 'Samuel Joyson Rekala', 'Tadavarthi Kusumitha'] },
  { name: 'Events & Socials', members: ['Fatima Waheed', 'George Mahon', 'Miguel Antonio'] },
  { name: 'Industry & Partnerships', members: ['Ibrahim Haque', 'Samuel Young'] },
  { name: 'Projects & Hackathons', members: ['Bibek Limbu', 'Muhammad Zain Khan'] },
  { name: 'Careers & Opportunities', members: ['Deepanshu Dariya'] },
];

async function portraitImage(portrait: Locator) {
  const nestedImage = portrait.locator('img').first();
  return (await nestedImage.count()) ? nestedImage : portrait;
}

async function expectPortraitsLoaded(portraits: Locator) {
  for (const portrait of await portraits.all()) {
    await portrait.scrollIntoViewIfNeeded();
    const image = await portraitImage(portrait);
    await expect.poll(() => image.evaluate((element) => {
      const image = element instanceof HTMLImageElement ? element : element.querySelector('img');
      return Boolean(image?.complete && image.naturalWidth > 0);
    })).toBe(true);
  }
}

async function expectNoCommitteeOverflow(page: Page, section: Locator) {
  const result = await section.evaluate((element) => {
    const sectionBox = element.getBoundingClientRect();
    const labels = [...element.querySelectorAll<HTMLElement>('h2, h3, p, li span')];
    const portraits = [...element.querySelectorAll<HTMLElement>('.flow-committee__portrait')];
    return {
      section: element.scrollWidth - element.clientWidth,
      labels: labels.filter((label) => label.scrollWidth > label.clientWidth + 1).map((label) => label.textContent),
      portraitsOutside: portraits.filter((portrait) => {
        const box = portrait.getBoundingClientRect();
        return box.left < sectionBox.left - 1 || box.right > sectionBox.right + 1;
      }).length,
    };
  });
  expect(result.section).toBeLessThanOrEqual(1);
  expect(result.labels).toEqual([]);
  expect(result.portraitsOutside).toBe(0);

  const pageOverflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));
  expect(pageOverflow.html).toBeLessThanOrEqual(1);
  expect(pageOverflow.body).toBeLessThanOrEqual(1);
}

test('AI homepage committee preserves roster, portraits, hierarchy and responsive bounds', async ({ page }) => {
  await mkdir('output/committee-home', { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${aiOrigin}/`, { waitUntil: 'domcontentloaded' });

  const section = page.locator('#committee');
  await expect(section).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Meet the committee.' })).toBeVisible();

  const officerCards = section.locator('.flow-officers > article');
  await expect(officerCards).toHaveCount(officers.length);
  for (const [index, officer] of officers.entries()) {
    const card = officerCards.nth(index);
    await expect(card.locator('h3')).toHaveText(officer.name);
    await expect(card.locator('p')).toHaveText(officer.role);
  }

  const teamCards = section.locator('.flow-teams > article');
  await expect(teamCards).toHaveCount(teams.length);
  for (const [index, team] of teams.entries()) {
    const card = teamCards.nth(index);
    await expect(card.locator('h3')).toHaveText(team.name);
    await expect(card.locator('ul > li > span')).toHaveText(team.members);
  }

  const portraits = section.locator('.flow-committee__portrait');
  await expect(portraits).toHaveCount(14);
  await expectPortraitsLoaded(portraits);

  const motionDuration = await section.evaluate((element) => {
    const maxDurationMs = (value: string) => Math.max(...value.split(',').map((part) => {
      const number = Number.parseFloat(part);
      if (!Number.isFinite(number)) return 0;
      return part.trim().endsWith('ms') ? number : number * 1000;
    }));
    return [...element.querySelectorAll<HTMLElement>('*')].reduce((maximum, child) => {
      const style = getComputedStyle(child);
      return Math.max(maximum, maxDurationMs(style.animationDuration), maxDurationMs(style.transitionDuration));
    }, 0);
  });
  expect(motionDuration).toBeLessThanOrEqual(1);

  for (const width of screenshotWidths) {
    await page.setViewportSize({ width, height: 900 });
    await section.scrollIntoViewIfNeeded();
    await expectNoCommitteeOverflow(page, section);
    await page.evaluate(() => document.fonts.ready);

    const treasurerName = officerCards.nth(2).locator('h3');
    const nameLineCount = await treasurerName.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
    });
    expect(nameLineCount).toBe(1);

    if (width >= 1024) {
      const connectorGap = await section.evaluate((element) => {
        const connector = element.querySelector('.flow-committee__branches')!.getBoundingClientRect();
        const officers = element.querySelector('.flow-officers')!.getBoundingClientRect();
        return connector.top - officers.bottom;
      });
      expect(connectorGap).toBeGreaterThan(0);
    }

    const tierBounds = await section.evaluate((element) => [...element.querySelectorAll<HTMLElement>('.flow-officers .flow-committee__portrait, .flow-teams .flow-committee__portrait')]
      .reduce((tiers, portrait) => {
        const tier = portrait.closest('.flow-officer') ? 'officers' : 'teams';
        const box = portrait.getBoundingClientRect();
        const style = getComputedStyle(portrait);
        (tiers[tier] ??= []).push({ width: box.width, height: box.height, radius: style.borderRadius });
        return tiers;
      }, {} as Record<string, Array<{ width: number; height: number; radius: string }>>));

    for (const tier of Object.values(tierBounds)) {
      const first = tier[0];
      expect(tier.every((bound) => Math.abs(bound.width - first.width) <= 1 && Math.abs(bound.height - first.height) <= 1)).toBe(true);
      expect(tier.every((bound) => bound.width > 0 && bound.height > 0 && bound.radius !== '0px')).toBe(true);
    }

    // Fixed site chrome is checked separately; omit it from section comparisons.
    await section.screenshot({
      path: `output/committee-home/section-${width}.png`,
      style: '.society-skip:not(:focus), [data-assistant-widget] { visibility: hidden !important; }',
    });
  }
});
