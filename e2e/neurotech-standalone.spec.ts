import { expect, test, type Page, type Route } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const evidenceDirectory = process.env.E2E_APPLICATIONS_URL
  ? 'output/playwright/neurotech-applications/live'
  : 'output/playwright/neurotech-applications';
const roles = [
  'events-community',
  'workshops-projects',
  'industry-partnerships',
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function capture(page: Page, filename: string) {
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, filename), fullPage: true });
}

async function mockApplication(route: Route, status = 200) {
  if (route.request().method() !== 'POST') return route.continue();
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(status === 200 ? { message: 'Your application has been sent.' } : { message: 'The application service is unavailable. Please try again.' }),
  });
}

async function fillCommonFields(page: Page, answers: Record<string, string> = {}) {
  await page.getByLabel('Full name').fill('Test Applicant');
  await page.getByLabel('Email address').fill('student@example.com');
  await page.getByLabel('Course').fill('Neuroscience');
  await page.getByLabel('Year of study').fill('Year 2');
  await page.getByLabel('Relevant experience').fill('I have helped organise a student workshop.');
  await page.getByLabel('Why would you like this role?').fill('I want to make neurotech welcoming.');
  await page.getByLabel('What time could you realistically contribute?').fill('Two hours per week');
  for (const [label, value] of Object.entries(answers)) await page.getByLabel(label).fill(value);
  await page.getByLabel(/I agree to my answers/).check();
}

test.describe('standalone Neurotech committee applications', () => {
  test('role index stays usable at desktop and phone widths', async ({ page }) => {
    for (const [width, filename] of [[1440, 'home-1440.png'], [390, 'home-390.png'], [320, 'home-320.png']] as const) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Join the committee.');
      await expect(page.locator('.committee-role-card')).toHaveCount(3);
      await expect(page.getByText('Social Media & Content Officer', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Wellbeing Champion', { exact: true })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await capture(page, filename);
    }
  });

  test('all three open role cards open their tailored forms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    for (const role of roles) {
      const card = page.locator(`.committee-role-card[href="/${role}"]`);
      await expect(card).toHaveCount(1);
      await card.click();
      await expect(page.locator('#role-title')).toBeVisible();
      await expect(page.locator('#committee-application-form')).toBeVisible();
      await expect(page.locator('form')).toHaveAttribute('action', '/api/committee-applications');
      await expect(page.locator('#mockPost')).toHaveCount(0);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    }
  });

  test('required fields block an incomplete application', async ({ page }) => {
    await page.goto('/events-community', { waitUntil: 'domcontentloaded' });
    const form = page.locator('#committee-application-form');
    await expect(form).toBeVisible();
    expect(await form.evaluate((element) => !(element as HTMLFormElement).checkValidity())).toBe(true);
    await form.getByRole('button', { name: /Send application/ }).click();
    await expect(page.locator('#fullName')).toBeFocused();
    await expect(page.locator('#committee-form-success')).toBeHidden();
  });

  test('mocks a successful standard application and shows confirmation', async ({ page }) => {
    await page.route('**/api/committee-applications', route => mockApplication(route));
    await page.goto('/events-community', { waitUntil: 'domcontentloaded' });
    await fillCommonFields(page, {
      'What would the event look like?': 'A low-pressure welcome evening with a short demo and conversation.',
      'How would you make it welcoming and practical to run?': 'Share access details early and keep a backup room plan.',
    });
    await page.getByRole('button', { name: /Send application/ }).click();
    await expect(page.locator('#committee-form-success')).toBeVisible();
    await expect(page.locator('#committee-application-form')).toBeHidden();
  });

  test('filled roles redirect to the remaining vacancies', async ({ page }) => {
    for (const role of ['social-media-content', 'wellbeing-champion']) {
      await page.goto('/' + role, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('.committee-role-card')).toHaveCount(3);
      await expect(page.locator('#committee-application-form')).toHaveCount(0);
    }
  });

  test('keeps answers when the application request fails', async ({ page }) => {
    await page.route('**/api/committee-applications', route => mockApplication(route, 502));
    await page.goto('/workshops-projects', { waitUntil: 'domcontentloaded' });
    const experience = 'I have helped organise a practical student workshop.';
    await fillCommonFields(page, {
      'What would participants explore or make?': 'A small EEG signal visualiser.',
      'How would you run it with the resources available to a student society?': 'Use a short demo, clear instructions and shared equipment.',
    });
    await page.getByLabel('Relevant experience').fill(experience);
    await page.getByRole('button', { name: /Send application/ }).click();
    await expect(page.locator('#committee-form-message')).toContainText('application service is unavailable');
    await expect(page.locator('#committee-application-form')).toBeVisible();
    await expect(page.getByLabel('Relevant experience')).toHaveValue(experience);
    await expect(page.getByLabel('What would participants explore or make?')).toHaveValue('A small EEG signal visualiser.');
  });
});
