import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const publicRoutes = ['/', '/about', '/committee', '/events', '/join'] as const;
const primaryNavLinks = {
  ai: ['About', 'Events', 'Projects', 'Join'],
  business: ['About', 'Activities', 'Events', 'Join'],
  neurotech: ['What we do', 'Events', 'About', 'Committee', 'Updates', 'Contact'],
} as const;
const mojibakePattern = /[âÃÂ\uFFFD]|ðŸ|ï¿½/;

const sites = [
  {
    key: 'ai',
    name: 'AI',
    origin: 'http://127.0.0.1:4321',
    joinUrl: 'https://surreyunion.org/shop/ai-and-data-science-society/293e762b-01b8-46f4-a541-2260e4d9ec4f',
    hasThemeToggle: false,
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

async function captureRefinementEvidence(page: Page, name: string, fullPage = false) {
  const directory = process.env.REFINEMENT_EVIDENCE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${name}.png`), fullPage });
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
  expect(text).not.toContain('return Astro.redirect');
}

async function expectNoHashLinks(page: Page) {
  const hashLinks = await page.locator('main a[href="#"], header a[href="#"], footer a[href="#"]').count();
  expect(hashLinks).toBe(0);
}

async function expectAccessibilityBasics(page: Page) {
  const issues = await page.evaluate(() => {
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element: Element) =>
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      element.querySelector('img')?.getAttribute('alt') ||
      '';

    const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const unnamedControls = [...document.querySelectorAll('button, a[href]')]
      .filter(isVisible)
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 120));
    const imagesWithoutAlt = [...document.querySelectorAll('img:not([alt])')]
      .map((element) => element.outerHTML.slice(0, 120));
    const unlabelledFields = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input:not([type="hidden"]), textarea, select')]
      .filter(isVisible)
      .filter((element) => {
        const labelledBy = element.getAttribute('aria-labelledby');
        return !element.labels?.length &&
          !element.getAttribute('aria-label') &&
          !element.getAttribute('title') &&
          !(labelledBy && document.getElementById(labelledBy));
      })
      .map((element) => element.outerHTML.slice(0, 120));

    return { duplicateIds, unnamedControls, imagesWithoutAlt, unlabelledFields };
  });

  expect(issues).toEqual({
    duplicateIds: [],
    unnamedControls: [],
    imagesWithoutAlt: [],
    unlabelledFields: [],
  });
}

for (const site of sites) {
  test.describe(`${site.name} public launch checks`, () => {
    for (const route of publicRoutes) {
      test(`${route} renders without mojibake, hash links, or mobile overflow`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        const response = await page.goto(url(site.origin, route), { waitUntil: 'domcontentloaded' });
        expect(response?.status(), `${site.name} ${route} status`).toBe(200);
        expect(new URL(page.url()).pathname.replace(/\/$/, '') || '/').toBe(route);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main h1')).toHaveCount(1);
        await expect(page.locator('body')).toContainText(/Surrey|Committee|Events|Member|Join|About/i);

        await expectNoBrokenPublicText(page);
        await expectNoHashLinks(page);
        await expectNoHorizontalOverflow(page);
        await expectAccessibilityBasics(page);
        await captureRefinementEvidence(page, `${site.key}-${route.slice(1) || 'home'}-mobile`, true);

        await page.setViewportSize({ width: 1440, height: 1000 });
        await expectNoHorizontalOverflow(page);
        await captureRefinementEvidence(page, `${site.key}-${route.slice(1) || 'home'}-desktop`, true);
      });
    }

    test('publishes social preview metadata and a sitemap', async ({ page, request }) => {
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveAttribute('content', /^https?:\/\/.+/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

      const sitemap = await request.get(url(site.origin, '/sitemap.xml'));
      expect(sitemap.status()).toBe(200);
      expect(await sitemap.text()).toContain('<urlset');
    });

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

      const menuButton = page.locator('button[aria-controls$="mobile-menu"]');
      await expect(menuButton).toHaveAccessibleName(/open navigation menu/i);
      const buttonBox = await menuButton.boundingBox();
      expect(buttonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      await menuButton.click();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      await expect(menuButton).toHaveAccessibleName(/close navigation menu/i);

      const expectedLinks = primaryNavLinks[site.key];
      for (const label of expectedLinks) {
        await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
      }
      const menuId = await menuButton.getAttribute('aria-controls');
      const menu = page.locator(`#${menuId}`);
      const menuBox = await menu.boundingBox();
      for (const link of await menu.locator('a').all()) {
        const box = await link.boundingBox();
        expect(box?.y ?? -1).toBeGreaterThanOrEqual(menuBox?.y ?? 0);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((menuBox?.y ?? 0) + (menuBox?.height ?? 0) + 1);
      }
      await captureRefinementEvidence(page, `${site.key}-mobile-menu`);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(menuButton).toBeFocused();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      await menuButton.click();
      await page.setViewportSize({ width: 1152, height: 768 });
      await expect(menu).toBeHidden();
      await page.setViewportSize({ width: 320, height: 740 });
      await expectNoHorizontalOverflow(page);
    });

    test('keyboard skip link and reduced-motion mode work', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });

      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('href', '#main-content');
      await expect(focusedElement).toBeVisible();
      await captureRefinementEvidence(page, `${site.key}-keyboard-reduced-motion`);

      const motion = await page.evaluate(() => {
        const durationMs = (value: string) => Math.max(...value.split(',').map((duration) => {
          const parsed = Number.parseFloat(duration);
          return duration.trim().endsWith('ms') ? parsed : parsed * 1000;
        }));
        return [...document.querySelectorAll<HTMLElement>('main *, header *, footer *')].reduce(
          (maximums, element) => {
            const style = getComputedStyle(element);
            return {
              animation: Math.max(maximums.animation, durationMs(style.animationDuration)),
              transition: Math.max(maximums.transition, durationMs(style.transitionDuration)),
            };
          },
          { animation: 0, transition: 0 },
        );
      });
      expect(motion.animation).toBeLessThanOrEqual(0.1);
      expect(motion.transition).toBeLessThanOrEqual(0.1);
    });

    test('join page links to the correct Students Union membership URL', async ({ page }) => {
      await page.goto(url(site.origin, '/join'), { waitUntil: 'domcontentloaded' });

      const membershipLink = page.locator(`a[href="${site.joinUrl}"]`).first();
      await expect(membershipLink).toBeVisible();
      await expect(membershipLink).toHaveAttribute('target', '_blank');
      await membershipLink.hover();
      await captureRefinementEvidence(page, `${site.key}-membership-hover`);
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

    test('assistant handles loading, service errors, retry and reset without losing close focus', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      let releaseResponse!: () => void;
      const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
      let attempts = 0;
      await page.route('**/api/assistant/chat', async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await responseGate;
          await route.fulfill({ status: 503, json: { message: 'The assistant is unavailable right now. Please try again shortly.' } });
        } else {
          await route.fulfill({ status: 200, json: { message: 'Find confirmed dates on the Events page.' } });
        }
      });
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
      const widget = page.locator('[data-assistant-widget]');
      const toggle = widget.locator('.assistant-toggle');
      const panel = widget.locator('.assistant-panel');
      const input = widget.locator('.assistant-input');
      const send = widget.locator('.assistant-send');
      const reset = widget.locator('.assistant-reset');
      const recovery = widget.locator('.assistant-recovery');
      await toggle.click();
      await expect(input).toBeFocused();
      await expect(send).toBeDisabled();
      await input.fill('   ');
      await expect(send).toBeDisabled();
      await input.fill('What events are coming up?');
      await expect(send).toBeEnabled();
      await send.click();
      await expect(widget.locator('.assistant-message.loading')).toBeVisible();
      await expect(widget.locator('.assistant-starters')).toBeHidden();
      await expect(reset).toBeDisabled();
      await expect(input).toBeDisabled();
      await captureRefinementEvidence(page, `${site.key}-assistant-loading`);
      await widget.locator('.assistant-close').click();
      await expect(toggle).toBeFocused();
      releaseResponse();
      await expect(widget.locator('.assistant-message.error')).toHaveText(/unavailable/);
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await expect(recovery).toBeVisible();
      await expect(recovery.getByRole('link', { name: /Events/ })).toHaveAttribute('href', '/events');
      await expect(recovery.getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/join');
      await captureRefinementEvidence(page, `${site.key}-assistant-error`);
      await input.fill('Where are the confirmed dates?');
      await send.click();
      await expect(widget.locator('.assistant-message.assistant')).toContainText('Events page');
      await expect(recovery).toBeHidden();
      await reset.click();
      await expect(widget.locator('.assistant-message')).toHaveCount(0);
      await expect(widget.locator('.assistant-starters')).toBeVisible();
      await expect(send).toBeDisabled();
      await expect(input).toBeFocused();
      expect(attempts).toBe(2);
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

    if (site.key === 'ai') {
      test('mobile homepage uses the small hero and defers the 3D project', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const requestedUrls: string[] = [];
        page.on('request', (request) => requestedUrls.push(request.url()));
        const mobileHeroResponse = page.waitForResponse(
          (response) => response.url().includes('/_image') && response.url().includes('w=828'),
        );

        await page.goto(site.origin, { waitUntil: 'load' });
        await page.locator('.home-hero').waitFor();
        await mobileHeroResponse;

        expect(requestedUrls.some((requestUrl) => requestUrl.includes('w=828'))).toBe(true);
        expect(requestedUrls.some((requestUrl) => requestUrl.includes('w=1800'))).toBe(false);
        expect(requestedUrls.some((requestUrl) => requestUrl.endsWith('.glb'))).toBe(false);
        expect(requestedUrls.some((requestUrl) => requestUrl.includes('HintzeHallExperience'))).toBe(false);
      });
    }

    if (site.key === 'business') {
      test('homepage content is visible without scroll-reveal timing', async ({ page }) => {
        await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
        const hiddenContent = await page.locator('.business-reveal').evaluateAll((elements) =>
          elements.filter((element) => {
            const style = getComputedStyle(element);
            return style.opacity === '0' || style.visibility === 'hidden';
          }).length,
        );
        expect(hiddenContent).toBe(0);
      });
    }

    if (site.key === 'neurotech') {
      test('BCI diagram keeps its explanations visible on compact screens', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
        const diagram = page.getByRole('region', { name: 'A brain-computer interface, step by step' });
        await diagram.scrollIntoViewIfNeeded();
        const picture = diagram.getByRole('img');
        await expect(picture).toBeVisible();
        await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        for (const explanation of [
          'Measure electrical activity from the scalp.',
          'Process signals into usable information.',
          'Translate intent into an action.',
        ]) {
          await expect(diagram.getByText(explanation, { exact: true })).toBeVisible();
        }
        await expectNoHorizontalOverflow(page);
        await captureRefinementEvidence(page, 'neurotech-bci-mobile');
      });
    }

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
