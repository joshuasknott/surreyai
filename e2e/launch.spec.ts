import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const publicRoutes = ['/'] as const;
const mojibakePattern = /[âÃÂ\uFFFD]|ðŸ|ï¿½/;

const sites = [
  {
    key: 'ai',
    name: 'AI',
    origin: 'http://127.0.0.1:4321',
    unionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/artificial-intelligence-society',
    linktreeUrl: 'https://linktr.ee/surreyaisociety',
    joinUrl: 'https://surreyunion.org/shop/artificial-intelligence-society/9a8a30d9-b5e2-4d40-a864-8e688f5a306a',
    hasThemeToggle: false,
  },
  {
    key: 'business',
    name: 'Business',
    origin: 'http://127.0.0.1:4322',
    unionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/business-society',
    linktreeUrl: 'https://linktr.ee/surreybusinesssociety',
    joinUrl: 'https://chat.whatsapp.com/IIk88Q5Y2Du65aC5wmkAPE',
    hasThemeToggle: false,
  },
  {
    key: 'neurotech',
    name: 'Neurotech',
    origin: 'http://127.0.0.1:4323',
    unionUrl: 'https://surreyunion.org/your-activity/clubs-and-societies-a-z/neurotech-society',
    linktreeUrl: 'https://linktr.ee/surreyneurotechsociety',
    joinUrl: 'https://surreyunion.org/shop/neurotech-society/dff8af2e-9be8-4415-ba54-6e492d3daca8',
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
  if (fullPage) {
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
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
    test('old society pages permanently redirect to homepage sections', async ({ request }) => {
      for (const [route, anchor] of [['about', 'about'], ['events', 'activities'], ['committee', 'committee'], ['join', 'join']]) {
        const response = await request.get(`${site.origin}/${route}`, { maxRedirects: 0 });
        expect(response.status()).toBe(301);
        expect(response.headers().location).toBe(`/#${anchor}`);
      }
    });

    test('single page has signatories, working section anchors and branded assets', async ({ page, request }) => {
      await page.goto(site.origin);
      for (const role of ['President', 'Vice President', 'Treasurer']) {
        await expect(page.locator('#committee article').filter({ has: page.getByText(role, { exact: true }) }).locator('h3')).not.toBeEmpty();
      }
      const broken = await page.locator('a[href^="/#"], a[href^="#"]').evaluateAll(links => links
        .map(link => (link as HTMLAnchorElement).hash.slice(1))
        .filter(id => !document.getElementById(id)));
      expect(broken).toEqual([]);
      await expect(page.locator('header a[href="/events"], main a[href="/events"], footer a[href="/events"]')).toHaveCount(0);
      await expect(page.locator('.society-header .society-brand img')).toHaveAttribute('src', '/logos/society.png');
      for (const path of ['/logos/society.png', '/social-cover.png', '/favicon.png', '/apple-touch-icon.png']) {
        const response = await request.get(`${site.origin}${path}`);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/png');
      }
      const sitemap = await (await request.get(`${site.origin}/sitemap.xml`)).text();
      expect(sitemap.match(/<loc>/g)).toHaveLength(1);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoHorizontalOverflow(page);
        if (width === 390 || width === 1440) {
          await page.locator('#committee').scrollIntoViewIfNeeded();
          await captureRefinementEvidence(page, `${site.key}-committee-${width}`);
        }
      }
    });

    test('contact form prepares an encoded email without pretending to send', async ({ page }) => {
      await page.goto(site.origin);
      const form = page.locator('[data-contact-form]');
      await expect(form).toHaveAttribute('data-direct', 'false');
      await form.getByLabel('Your name').fill('Test & Visitor');
      await form.getByLabel('Your email').fill('visitor@example.test');
      await form.getByLabel('Your message').fill('Hello & thanks! Can I join from another course?');
      await form.getByRole('button', { name: 'Prepare email' }).click();
      await expect(form.getByRole('status')).toContainText('Your email is ready');
      const draft = form.getByRole('link', { name: 'Open email app' });
      const href = (await draft.getAttribute('href'))!;
      expect(href).toContain(`mailto:${await form.getAttribute('data-email')}?subject=`);
      expect(new URL(href).searchParams.get('body')).toContain('Hello & thanks!');
      await expect(form.getByRole('status')).not.toContainText('has been sent');
      await form.getByLabel('Your message').fill('Updated message for the society committee.');
      expect(new URL((await draft.getAttribute('href'))!).searchParams.get('body')).toContain('Updated message');
    });

    test('direct contact delivery shows success or preserves the message on failure', async ({ page }) => {
      await page.route(site.origin + '/', async route => {
        const response = await route.fetch();
        const html = (await response.text()).replace('data-direct="false"', 'data-direct="true"');
        await route.fulfill({ response, body: html });
      });
      let attempts = 0;
      await page.route('**/api/contact', route => route.fulfill({ status: ++attempts === 1 ? 502 : 200, json: { message: attempts === 1 ? 'Unavailable' : 'Sent' } }));
      await page.goto(site.origin);
      const form = page.locator('[data-contact-form]');
      await form.getByLabel('Your name').fill('Test Visitor');
      await form.getByLabel('Your email').fill('visitor@example.test');
      await form.getByLabel('Your message').fill('A test message that should stay available after an error.');
      await form.locator('button[type="submit"]').click();
      await expect(form.getByRole('status')).toContainText('couldn’t confirm delivery');
      await expect(form.getByLabel('Your message')).toHaveValue(/should stay available/);
      await expect(form.getByRole('link', { name: 'Open email app' })).toBeVisible();
      await form.locator('button[type="submit"]').click();
      await expect(form.getByRole('status')).toContainText('has been sent');
      await expect(form.getByLabel('Your message')).toHaveValue('');
    });

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

    test('join dropdown fits the viewport and supports keyboard and outside dismissal', async ({ page }) => {
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
      const header = page.locator('.society-header');
      const menu = header.locator('[data-join-menu]');
      const trigger = menu.locator('summary');
      const panel = menu.getByRole('navigation');
      for (const width of [320, 390, 768, 1440]) {
        const height = width === 768 ? 390 : 844;
        await page.setViewportSize({ width, height });
        await expect(panel).toBeHidden();
        await expect(header.locator('a:visible')).toHaveCount(1);
        expect((await trigger.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        await trigger.click();
        await expect(panel).toBeVisible();
        await expect(panel.getByRole('link', { name: 'Join the society' })).toHaveAttribute('href', site.unionUrl);
        await expect(panel.getByRole('link', { name: 'Linktree' })).toHaveAttribute('href', site.linktreeUrl);
        for (const link of await panel.locator('a').all()) {
          await expect(link.locator('svg')).toHaveCount(1);
          await expect(link).toHaveAccessibleName(/.+/);
          expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        }
        for (const social of await page.locator('.community-socials a').all()) {
          await expect(panel.locator(`a[href="${await social.getAttribute('href')}"]`)).toHaveCount(1);
        }
        const bounds = (await panel.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
        await captureRefinementEvidence(page, `${site.key}-join-menu-${width}`);
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
        await expectNoHorizontalOverflow(page);
      }
      await trigger.press('Enter');
      await page.keyboard.press('Tab');
      await expect(panel.getByRole('link', { name: 'Join the society' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await trigger.press('Space');
      await expect(panel).toBeVisible();
      await page.keyboard.press('Shift+Tab');
      await expect(panel).toBeHidden();
      await trigger.click();
      await page.locator('main h1').click();
      await expect(panel).toBeHidden();
      await trigger.click();
      await trigger.click();
      await expect(panel).toBeHidden();
    });

    test('hero offers the Union society page followed by Linktree', async ({ page }) => {
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
      const links = page.locator('[data-hero-actions] a');
      await expect(links).toHaveCount(2);
      await expect(links.nth(0)).toHaveAccessibleName('Join the society');
      await expect(links.nth(0)).toHaveAttribute('href', site.unionUrl);
      await expect(links.nth(1)).toHaveAccessibleName('Linktree');
      await expect(links.nth(1)).toHaveAttribute('href', site.linktreeUrl);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
      }
    });

    test('social links have labelled icons and generous click targets', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(site.origin, { waitUntil: 'domcontentloaded' });
      const socialLinks = page.locator('.community-socials a');
      for (const link of await socialLinks.all()) {
        await expect(link.locator('svg')).toHaveCount(1);
        await expect(link).toHaveAccessibleName(/.+/);
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      }
      if (site.key !== 'business') {
        await expect(page.locator('#committee')).toContainText('Joshua Knott');
        await expect(page.locator('#committee')).not.toContainText('Josh Knott');
      }
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

    test('join section links to the correct joining destination', async ({ page }) => {
      await page.goto(url(site.origin, '/join'), { waitUntil: 'domcontentloaded' });

      const membershipLink = page.locator(`#join a[href="${site.joinUrl}"]`).first();
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
      await expect(recovery.getByRole('link', { name: /Activities/ })).toHaveAttribute('href', '/#activities');
      await expect(recovery.getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/#join');
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

    test('admin CMS routes are not available', async ({ page }) => {
      for (const path of ['/admin', '/admin/login', '/admin/invite/accept']) {
        const response = await page.goto(url(site.origin, path), { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(404);
      }
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
