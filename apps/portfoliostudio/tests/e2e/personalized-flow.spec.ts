import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const onboardingStorageKey = "portfolio-studio:onboarding:v1";

async function uploadStudentCv(page: Page, testInfo: TestInfo) {
  await page.goto("/new");
  const cvPath = testInfo.outputPath("morgan-ellis-cv.txt");
  await writeFile(
    cvPath,
    [
      "Morgan Ellis",
      "Headline: Software engineer and researcher",
      "Email: morgan@example.com",
      "Location: Guildford, UK",
      "",
      "Profile",
      "I make dependable tools that help people learn and make decisions.",
      "",
      "Education",
      "BSc Computer Science, University of Surrey: 2023–2026",
      "",
      "Experience",
      "Junior Developer, Bright Labs: Built accessible internal tools for a student services team.",
      "",
      "Projects",
      "Campus Route: A wayfinding prototype for new students.",
      "",
      "Skills",
      "TypeScript, Python, user research",
    ].join("\n"),
  );
  await page.locator('input[type="file"]').setInputFiles(cvPath);
  await expect(page.getByText("morgan-ellis-cv.txt")).toBeVisible();
  await expect(
    page.getByText("Review imported text", { exact: true }),
  ).toBeVisible();
  return cvPath;
}

async function openCategory(page: Page, name: string) {
  const category = page
    .locator("details.student-category")
    .filter({ hasText: name })
    .first();
  await category.locator(":scope > summary").click();
  return category;
}

test("CV facts personalise all ten directions and survive edits, design switching, and information review", async ({
  page,
}, testInfo) => {
  await uploadStudentCv(page, testInfo);

  const education = await openCategory(page, "Education");
  await expect(education.locator("input").first()).toHaveValue(
    /BSc Computer Science/,
  );
  const experience = await openCategory(page, "Experience");
  await expect(experience.locator("input").first()).toHaveValue(
    /Junior Developer/,
  );
  const projects = await openCategory(page, "Projects");
  await expect(projects.locator("input").first()).toHaveValue(/Campus Route/);
  await page.screenshot({
    path: testInfo.outputPath("personalized-review.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose a starting point.")).toBeVisible();
  const cards = page.locator(".design-card");
  await expect(cards).toHaveCount(10);
  await expect(cards.filter({ hasText: "Morgan Ellis" })).toHaveCount(10);
  await page.screenshot({
    path: testInfo.outputPath("personalized-gallery.png"),
    fullPage: true,
  });

  await cards
    .first()
    .getByRole("button", { name: /Choose / })
    .click();
  await page.getByRole("button", { name: "Open my editor" }).click();
  await expect(page.locator(".workshop-steps")).toContainText("Personalise");
  const canvas = page.frameLocator('iframe[title="Editable portfolio canvas"]');
  await expect(
    canvas.getByRole("heading", {
      name: /Software engineer and researcher|Morgan Ellis/,
    }),
  ).toBeVisible();

  const customHeading = "Morgan builds calm, useful systems";
  const hero = canvas.locator('h1[contenteditable="true"]').first();
  await hero.click();
  await hero.fill(customHeading);
  await hero.blur();
  await expect(
    canvas.getByRole("heading", { name: customHeading }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Browse designs", exact: true })
    .click();
  const designDialog = page.getByRole("dialog").last();
  await expect(designDialog.locator(".design-card")).toHaveCount(10);
  await designDialog
    .locator(".design-card")
    .nth(1)
    .getByRole("button", { name: /Choose / })
    .click();
  await designDialog.getByRole("button", { name: /^Use / }).click();
  await expect(
    canvas.getByRole("heading", { name: customHeading }),
  ).toBeVisible();

  await page
    .locator(".editor-library-actions")
    .getByRole("button", { name: "Your information", exact: true })
    .click();
  const informationDialog = page.getByRole("dialog").last();
  await expect(informationDialog).toContainText("Your information");
  await informationDialog
    .locator("label")
    .filter({ hasText: "Headline" })
    .locator("input")
    .fill("Software engineer, researcher and mentor");
  await informationDialog
    .getByRole("button", { name: "Update my information" })
    .click();
  await expect(
    canvas.getByRole("heading", { name: customHeading }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Information updated\. Your customised writing was kept|Your information and connected sections are updated|Your edited writing will stay as it is/,
    ),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("personalized-editor-mobile.png"),
    fullPage: false,
  });
});

test("guest scratch keeps student facts and prompt without an automatic AI request", async ({
  page,
}, testInfo) => {
  let aiRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/ai/generate")) aiRequests += 1;
  });
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page.locator('input[placeholder*="Amina Patel"]').fill("Priya Nair");
  await page
    .locator('input[placeholder*="Computer science"]')
    .fill("Mathematics student");
  await page
    .locator("textarea")
    .first()
    .fill("I explain difficult ideas with care.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create from scratch" }).click();
  const prompt = "A quiet, typographic portfolio for a mathematics student.";
  await page.locator('textarea[placeholder*="clean, editorial"]').fill(prompt);
  await page.screenshot({
    path: testInfo.outputPath("scratch-onboarding.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open my editor" }).click();
  await expect(
    page.locator('textarea[aria-label="Ask AI to change your portfolio"]'),
  ).toHaveValue(prompt);
  await expect(
    page
      .frameLocator('iframe[title="Editable portfolio canvas"]')
      .getByRole("heading", { name: /Mathematics student|Priya Nair/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Create a free Studio account to use AI/),
  ).toBeVisible();
  expect(aiRequests).toBe(0);
  const saved = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((entry) =>
      entry.startsWith("portfolio-studio:brief:"),
    );
    return key ? JSON.parse(sessionStorage.getItem(key) || "null") : null;
  });
  expect(saved?.prompt).toBe(prompt);
  const onboarding = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    onboardingStorageKey,
  );
  expect(onboarding).toBeNull();
});
