import { test, expect } from "@playwright/test";
import type { PortfolioDocument } from "../../shared/portfolio";

// Browser contract coverage uses an explicit fake provider response. Provider
// authentication, quotas and validation are covered separately by server tests.
test("a full-page AI prompt receives saved student facts and remains editable", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "browser-qa",
          name: "Taylor",
          email: "taylor@example.com",
          isAdmin: false,
        },
      },
    }),
  );
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({ json: { settings: { mode: "society", provider: null } } }),
  );
  let requestDocument: PortfolioDocument | undefined;
  await page.route("**/api/ai/generate", async (route) => {
    const body = route.request().postDataJSON();
    requestDocument = body.document;
    const document = structuredClone(body.document) as PortfolioDocument;
    document.sections.push({
      ...structuredClone(document.sections[0]),
      id: "generated-education",
      type: "education",
      title: "My education",
      subtitle: "",
      body: "",
      image: "",
      items: document.student!.education,
      layout: "list",
    });
    await route.fulfill({
      json: {
        document,
        summary: "Built your education section using the details you supplied.",
      },
    });
  });
  await page.goto("/new?mode=scratch");
  await page.locator('input[type="file"]').setInputFiles({
    name: "taylor-cv.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Taylor Chen\nMathematics student\ntaylor@example.com\n\nEducation\nBSc Mathematics\nUniversity of Surrey\n2025–2028\n\nSkills\nPython, statistics\n",
    ),
  });
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toHaveValue("Taylor Chen");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create from scratch", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "What do you have in mind?" })
    .fill(
      "Build my whole portfolio from my information, with a clear education section and a minimal design.",
    );
  await page
    .getByRole("button", { name: "Open my editor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send AI request", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Keep changes", exact: true }),
  ).toBeVisible();
  expect(requestDocument?.student?.education[0].title).toContain(
    "BSc Mathematics",
  );
  expect(requestDocument?.sections).toHaveLength(1);
  await page.getByRole("button", { name: "Keep changes", exact: true }).click();
  const canvas = page.frameLocator('iframe[title="Editable portfolio canvas"]');
  await expect(
    canvas.getByRole("heading", { name: "My education", exact: true }),
  ).toBeVisible();
  const title = canvas.getByRole("heading", {
    name: "My education",
    exact: true,
  });
  await title.fill("Learning so far");
  await canvas
    .getByRole("heading", { name: "Learning so far", exact: true })
    .blur();
  await expect(
    canvas.getByRole("heading", { name: "Learning so far" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    canvas.getByRole("heading", { name: "My education", exact: true }),
  ).toBeVisible();
});

test("an AI response cannot overwrite edits made while it was running", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "browser-qa",
          name: "Taylor",
          email: "taylor@example.com",
          isAdmin: false,
        },
      },
    }),
  );
  await page.route("**/api/ai/settings", (route) =>
    route.fulfill({ json: { settings: { mode: "society", provider: null } } }),
  );
  let release: (() => void) | undefined;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ai/generate", async (route) => {
    const body = route.request().postDataJSON();
    await responseGate;
    await route.fulfill({
      json: { document: body.document, summary: "A proposed edit." },
    });
  });
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Taylor Chen");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Open my editor", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Ask AI to change your portfolio" })
    .fill("Improve my introduction");
  await page
    .getByRole("button", { name: "Send AI request", exact: true })
    .click();
  await expect(page.getByText("Thinking about your portfolio…")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Portfolio name", exact: true })
    .fill("My newest title");
  release!();
  await expect(
    page.getByText(/Your portfolio changed while AI was working/),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Portfolio name", exact: true }),
  ).toHaveValue("My newest title");
  await expect(
    page.getByRole("button", { name: "Keep changes", exact: true }),
  ).toHaveCount(0);
});
