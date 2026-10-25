import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function completeManualOnboarding(page: Page, name = "Jordan Lee") {
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page.locator('input[placeholder*="Amina Patel"]').fill(name);
  await page
    .locator('input[placeholder*="Computer science"]')
    .fill("Software engineering student");
  await page
    .locator("textarea")
    .fill("I build clear tools for people who are learning.");
  await expect(page.locator(".workshop-steps")).toContainText("Add details");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose a starting point.")).toBeVisible();
  await expect(page.getByText("Choose your AI.")).toHaveCount(0);
  await expect(page.locator(".workshop-steps")).toContainText("Choose design");
  await expect(
    page.getByText(
      "Pick one of ten designs, or describe a blank canvas for AI to shape.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose Cobalt" }).click();
  await page.getByRole("button", { name: "Open my editor" }).click();
  await expect(page.locator(".workshop-steps")).toContainText("Personalise");
  const canvas = page.frameLocator('iframe[title="Editable portfolio canvas"]');
  await expect(
    canvas.getByRole("heading", { name: "Software engineering student" }),
  ).toBeVisible();
  return { canvas, id: page.url().split("/").pop()! };
}

test("landing page exposes all ten designs and remains usable on mobile", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your work deserves/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore designs" }).click();
  await expect(page).toHaveURL(/\/designs$/);
  await expect(page.locator(".design-card")).toHaveCount(10);
  await expect(page.getByText("Create from scratch")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("designs-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".design-card")).toHaveCount(10);
  await page.screenshot({
    path: testInfo.outputPath("designs-mobile.png"),
    fullPage: true,
  });
});

test("onboarding supports manual details and CV text review", async ({
  page,
}, testInfo) => {
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page.locator('input[placeholder*="Amina Patel"]').fill("Jordan Lee");
  await page
    .locator('input[placeholder*="Computer science"]')
    .fill("Software engineering student");
  await page
    .locator("textarea")
    .fill("I build clear tools for people who are learning.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose a starting point.")).toBeVisible();
  await expect(page.getByText("Choose your AI.")).toHaveCount(0);

  await page.evaluate(() =>
    sessionStorage.removeItem("portfolio-studio:onboarding:v1"),
  );
  await page.goto("/new");
  const cvPath = testInfo.outputPath("sample-cv.txt");
  await writeFile(
    cvPath,
    "Jordan Lee\nSoftware engineering student\nExperience: built an accessible campus map.\n",
  );
  await page.locator('input[type="file"]').setInputFiles(cvPath);
  await expect(page.getByText("sample-cv.txt")).toBeVisible();
  await page.getByText("Review imported text", { exact: true }).click();
  await expect(page.locator("details[open] textarea")).toHaveValue(
    /accessible campus map/,
  );
});

test("guest scratch brief reaches the editor without an automatic AI request", async ({
  page,
}) => {
  let aiRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/ai/generate")) aiRequests += 1;
  });
  const prompt =
    "A quiet editorial portfolio for a landscape architecture student.";
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page.locator('input[placeholder*="Amina Patel"]').fill("Scratch QA");
  await page
    .locator('input[placeholder*="Computer science"]')
    .fill("Landscape architecture student");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose a starting point.")).toBeVisible();
  await page.getByRole("button", { name: "Create from scratch" }).click();
  await page.locator('textarea[placeholder*="clean, editorial"]').fill(prompt);
  await page.getByRole("button", { name: "Open my editor" }).click();
  await expect(
    page.locator('textarea[aria-label="Ask AI to change your portfolio"]'),
  ).toHaveValue(prompt);
  await expect(
    page.getByText("Create a free Studio account to use AI."),
  ).toBeVisible();
  expect(aiRequests).toBe(0);
  const brief = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((entry) =>
      entry.startsWith("portfolio-studio:brief:"),
    );
    return key ? JSON.parse(sessionStorage.getItem(key) || "null") : null;
  });
  expect(brief?.prompt).toBe(prompt);
});

test("editor supports direct edits, style changes, sections and undo", async ({
  page,
}) => {
  const { canvas } = await completeManualOnboarding(page);
  const title = canvas.getByRole("heading", {
    name: "Software engineering student",
  });
  await title.click();
  await title.fill("Creative engineer");
  await canvas.locator('h1[contenteditable="true"]').blur();
  await expect(
    canvas.getByRole("heading", { name: "Creative engineer" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit style" }).click();
  await expect(page.getByLabel("Heading size")).toHaveValue(/^\d+$/);
  await page.getByLabel("Heading size").fill("104");
  await expect(page.getByLabel("Heading size")).toHaveValue("104");

  await page.getByRole("button", { name: "Sections" }).click();
  const rows = page.locator(".section-row");
  const initialSectionCount = await rows.count();
  expect(initialSectionCount).toBeGreaterThanOrEqual(4);
  await page
    .locator("aside")
    .getByRole("button", { name: "Add a section" })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Experience" })
    .click();
  await page.getByRole("button", { name: "Sections" }).click();
  await expect(rows).toHaveCount(initialSectionCount + 1);

  const lastHandle = rows.nth(initialSectionCount).locator(".drag-handle");
  const liveRegion = page.locator('[id^="DndLiveRegion"]');
  await lastHandle.focus();
  await lastHandle.press("Space");
  await expect(lastHandle).toHaveAttribute("aria-pressed", "true");
  await expect(liveRegion).toContainText("was moved over droppable area");
  const initialAnnouncement = await liveRegion.textContent();
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() => liveRegion.textContent(), {
      message: "dnd-kit should announce the new over-target before drop",
    })
    .not.toBe(initialAnnouncement);
  await lastHandle.press("Space");
  await expect(rows.nth(initialSectionCount - 1)).toContainText("Experience");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(rows.nth(initialSectionCount)).toContainText("Experience");

  const experienceRow = rows.filter({
    has: page.getByRole("button", {
      name: "Experience experience",
      exact: true,
    }),
  });
  await experienceRow
    .getByRole("button", { name: "Move Experience up" })
    .click();
  await expect(rows.nth(initialSectionCount - 1)).toContainText("Experience");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(rows.nth(initialSectionCount)).toContainText("Experience");
  await experienceRow.getByRole("button", { name: "Hide section" }).click();
  await expect(experienceRow).toHaveClass(/hidden-section/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(rows).toHaveCount(initialSectionCount + 1);
  await expect(experienceRow).not.toHaveClass(/hidden-section/);
});

test("editor mobile preview and local website exports work", async ({
  page,
}, testInfo) => {
  const { id } = await completeManualOnboarding(page, "Export Test");
  await page.getByRole("button", { name: "Mobile" }).click();
  await expect(page.getByRole("button", { name: "Mobile" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: testInfo.outputPath("editor-mobile.png"),
    fullPage: false,
  });

  await page.goto(`/publish/${id}`);
  await expect(page.getByText("Ready to share")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("publish-mobile.png"),
    fullPage: true,
  });
  await page.getByText("Advanced options", { exact: true }).click();
  await expect(page.getByText("Export your website")).toBeVisible();
  const websiteDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download website" }).click();
  await expect((await websiteDownload).suggestedFilename()).toMatch(/\.zip$/);
  const sourceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download editable source" }).click();
  await expect((await sourceDownload).suggestedFilename()).toMatch(/\.zip$/);
});
