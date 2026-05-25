import { expect, test, type Page } from '@playwright/test';

const publicRoutes = ['/', '/about', '/committee', '/events', '/join'] as const;
const navLinks = ['Home', 'About', 'Committee', 'Events', 'Join'] as const;
const mojibakePattern = /[âÃÂ\uFFFD]|ðŸ|ï¿½/;

const sites = [
  {
    key: 'ai',
    name: 'AI',
    origin: 'http://127.0.0.1:4321',
    joinUrl: 'https://surreyunion.org/shop/ai-and-data-science-society/293e762b-01b8-46f4-a541-2260e4d9ec4f',
    hasThemeToggle: true,
  },
  {
    key: 'business',
    name: 'Business',
    origin: 'http://127.0.0.1:4322',
    joinUrl: 'https://surreyunion.org/shop/business-society/5c580cdd-8641-44e0-acd6-69d9545eacdb',
    hasThemeToggle: false,
  },
  {
    key: 'neurotech',
    name: 'Neurotech',
    origin: 'http://127.0.0.1:4323',
    joinUrl: 'https://surreyunion.org/shop/neurotech-society/d5784e49-49f7-4bd4-a66c-b4f3971103af',
    hasThemeToggle: false,
  },
] as const;

function url(origin: string, path: string) {
  return `${origin}${path}`;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth,
  }));

  expect(overflow.html).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

async function expectNoBrokenPublicText(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(mojibakePattern);
}

async function expectNoHashLinks(page: Page) {
  const hashLinks = await page.locator('main a[href="#"], header a[href="#"], footer a[href="#"]').count();
  expect(hashLinks).toBe(0);
}

for (const site of sites) {
  test.describe(`${site.name} public launch checks`, () => {
    for (const route of publicRoutes) {
      test(`${route} renders without mojibake, hash links, or mobile overflow`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        const response = await page.goto(url(site.origin, route), { waitUntil: 'domcontentloaded' });
        expect(response?.status(), `${site.name} ${route} status`).toBe(200);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('body')).toContainText(/Surrey|Committee|Events|Member|Join|About/i);

        await expectNoBrokenPublicText(page);
        await expectNoHashLinks(page);
        await expectNoHorizontalOverflow(page);
      });
    }

    test('404 renders a not-found state', async ({ page }) => {
      const response = await page.goto(url(site.origin, '/launch-e2e-not-found'), { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(404);
      await expect(page.locator('main')).toContainText(/404|not found|couldn't be found/i);
      await expectNoBrokenPublicText(page);
      await expectNoHashLinks(page);
    });

    test('mobile navigation opens and reveals links', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: /open navigation menu/i }).click();

      for (const label of navLinks) {
        await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
      }
    });

    test('join page links to the correct Students Union membership URL', async ({ page }) => {
      await page.goto(url(site.origin, '/join'), { waitUntil: 'domcontentloaded' });

      const membershipLink = page.locator(`a[href="${site.joinUrl}"]`).first();
      await expect(membershipLink).toBeVisible();
      await expect(membershipLink).toHaveAttribute('target', '_blank');
    });

    test('assistant opens, closes, and is usable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

      const toggle = page.locator('[data-assistant-widget] .assistant-toggle');
      await expect(toggle).toBeVisible();
      await toggle.click();

      const panel = page.locator('[data-assistant-widget] .assistant-panel');
      await expect(panel).toBeVisible();
      await expect(page.locator('[data-assistant-widget] textarea[name="message"]')).toBeVisible();
      await expect(page.locator('[data-assistant-widget] .assistant-send')).toBeVisible();

      const box = await panel.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);

      await page.locator('[data-assistant-widget] .assistant-close').click();
      await expect(panel).toBeHidden();
      await expect(toggle).toBeVisible();
    });

    test('admin access is blocked while login and invite states render', async ({ page }) => {
      const adminResponse = await page.goto(url(site.origin, '/admin'), { waitUntil: 'domcontentloaded' });
      const adminBlocked =
        page.url().includes('/admin/login') ||
        page.url().includes('clerk.accounts.dev') ||
        [401, 403].includes(adminResponse?.status() ?? 0);
      expect(adminBlocked).toBe(true);

      const loginResponse = await page.goto(url(site.origin, '/admin/login'), { waitUntil: 'domcontentloaded' });
      expect(loginResponse?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toContainText(/Admin Dashboard|Sign in/i);

      const inviteResponse = await page.goto(url(site.origin, '/admin/invite/accept'), { waitUntil: 'domcontentloaded' });
      expect(inviteResponse?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toContainText(/Invalid invitation|invite token is missing/i);
    });

    if (site.hasThemeToggle) {
      test('AI theme toggle works and persists', async ({ page }) => {
        await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

        const initialTheme = await page.locator('html').getAttribute('data-theme');
        await page.locator('#theme-toggle').click();

        const toggledTheme = await page.locator('html').getAttribute('data-theme');
        expect(toggledTheme).not.toBe(initialTheme);
        expect(await page.evaluate(() => localStorage.getItem('surrey-ai-theme'))).toBe(toggledTheme);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute('data-theme', toggledTheme ?? '');
      });
    } else {
      test('has no public theme toggle or persisted theme system', async ({ page }) => {
        await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#theme-toggle')).toHaveCount(0);
        await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
        expect(await page.evaluate(() => localStorage.getItem('surrey-ai-theme'))).toBeNull();
      });
    }
  });
}
