import {
  test,
  expect,
  request as requestFactory,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function serveArchive(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  const server = createServer(async (request, response) => {
    try {
      const pathname =
        decodeURIComponent(
          new URL(request.url || "/", "http://127.0.0.1").pathname,
        ).replace(/^\/+/, "") || "index.html";
      const file = archive.file(pathname);
      if (!file) {
        response.writeHead(404);
        response.end();
        return;
      }
      const body = await file.async("nodebuffer");
      response.writeHead(200, {
        "Content-Type": contentType(pathname),
        "Content-Length": body.length,
      });
      response.end(body);
    } catch {
      response.writeHead(500);
      response.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("The offline export server did not start.");
  return {
    url: `http://127.0.0.1:${address.port}/index.html`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function createLocalDraft(
  page: Page,
  name = "Cloud QA",
  workedOn = "Surrey open source map",
) {
  await page.goto("/new");
  await page
    .getByRole("button", { name: /I’ll enter my details instead/ })
    .click();
  await page.locator('input[placeholder*="Amina Patel"]').fill(name);
  await page
    .locator('input[placeholder*="Computer science"]')
    .fill("Software engineering student");
  await page.locator('input[placeholder*="society event"]').fill(workedOn);
  await page.locator("textarea").fill("Testing the saved portfolio flow.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose a starting point.")).toBeVisible();
  await expect(page.getByText("Choose your AI.")).toHaveCount(0);
  await page.getByRole("button", { name: "Choose Cobalt" }).click();
  await page.getByRole("button", { name: "Open my editor" }).click();
  await expect(page.locator(".workshop-steps")).toContainText("Personalise");
  await expect(
    page
      .frameLocator('iframe[title="Editable portfolio canvas"]')
      .getByRole("heading", { name: "Software engineering student" }),
  ).toBeVisible();
  return page.url().split("/").pop()!;
}

test.describe.configure({ mode: "serial" });
test("signup, cloud persistence, publishing, recovery and ownership flow", async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(90_000);
  const draftId = await createLocalDraft(page);
  const email = `cloud-qa-${Date.now()}@example.com`;
  const password = "Cloud QA password 2026!";
  const newPassword = "Cloud QA recovery 2026!";

  await page.goto(`/publish/${draftId}`);
  await expect(page.getByText("Ready to share")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Save & publish/ }),
  ).toHaveAttribute("href", new RegExp(`draft=${draftId}.*intent=publish`));
  await page.getByRole("link", { name: /Save & publish/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/auth\\?mode=signup&draft=${draftId}.*intent=publish`),
  );
  await page.locator('input[autocomplete="name"]').fill("Cloud QA");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Keep this somewhere safe." }),
  ).toBeVisible();
  const recoveryCode = await page.locator("code.recovery-code").innerText();
  expect(recoveryCode.length).toBeGreaterThan(10);
  const recoveryPath = testInfo.outputPath("recovery-code.txt");
  const recoveryDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download recovery code" }).click();
  await (await recoveryDownload).saveAs(recoveryPath);
  expect(await readFile(recoveryPath, "utf8")).toContain(recoveryCode);

  await page.getByRole("button", { name: "I’ve saved it. Continue" }).click();
  await expect(page).toHaveURL(/\/publish\/(?!local_)/);
  const projectId = page.url().split("/").pop()!;
  const projectList = await page.request.get("/api/projects");
  expect(projectList.ok()).toBeTruthy();
  const projectRecord = (await projectList.json()).projects.find(
    (candidate: { id: string }) => candidate.id === projectId,
  );
  expect(projectRecord?.aiMode).toBe("society");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("portfolio-studio:drafts:v1") || "[]"),
    ),
  ).toHaveLength(0);

  await page.goto(`/editor/${projectId}`);
  const canvas = page.frameLocator('iframe[title="Editable portfolio canvas"]');
  const hero = canvas.getByRole("heading", {
    name: "Software engineering student",
  });
  await hero.click();
  await hero.fill("Cloud product engineer");
  await canvas.locator('h1[contenteditable="true"]').blur();
  await expect(
    canvas.getByRole("heading", { name: "Cloud product engineer" }),
  ).toBeVisible();
  await canvas.locator(".pf-section-image").first().click();
  await page
    .locator(
      'input[type="file"][accept="image/jpeg,image/png,image/webp,image/gif"]',
    )
    .setInputFiles("public/images/template-cobalt-sculpture.webp");
  const uploadedImage = canvas.locator(".pf-section-image img").first();
  await expect(uploadedImage).toHaveAttribute("src", /\/api\/assets\/asset_/);
  const uploadedImageUrl = await uploadedImage.getAttribute("src");
  const ownerImageResponse = await page.request.get(
    new URL(uploadedImageUrl!, page.url()).toString(),
  );
  expect(ownerImageResponse.ok()).toBeTruthy();
  const ownerHeaders = ownerImageResponse.headersArray();
  const ownerContentType =
    ownerHeaders.find((header) => header.name.toLowerCase() === "content-type")
      ?.value || "";
  expect(ownerContentType).toMatch(/^image\//);
  await page.getByTitle("Save now").click();
  await expect(page.locator(".save-status")).toContainText(/saved/i);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByText("Cloud QA’s portfolio", { exact: true }),
  ).toBeVisible();

  await page.goto(`/settings/${projectId}`);
  await expect(page.getByText("Tell your story clearly.")).toBeVisible();
  await page.getByLabel("Your name").fill("Cloud QA Updated");
  await page.getByLabel("Headline").fill("Cloud product engineer");
  await page.getByLabel("Page title").fill("Cloud QA portfolio");
  await page
    .getByLabel("Description")
    .fill("A saved cloud portfolio for browser QA.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Portfolio settings saved.",
  );
  await page.getByRole("button", { name: /Use your own API key/ }).click();
  await page.getByLabel("Provider").selectOption("openai");
  await page.getByRole("button", { name: "Save AI settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "AI access settings saved.",
  );
  await page.reload();
  await expect(page.locator(".version-row").first()).toBeVisible();
  await page
    .locator(".version-row")
    .first()
    .getByRole("button", { name: "Restore" })
    .click();
  await expect(page.getByRole("status")).toContainText("Restored");

  await page.goto(`/publish/${projectId}`);
  await expect(page.getByText("Ready to share")).toBeVisible();
  await expect(page.getByLabel("Public portfolio slug")).toBeHidden();
  await page.getByRole("button", { name: "Publish portfolio" }).click();
  await expect(page.locator(".publish-success")).toContainText(
    "Live and ready to share",
  );
  const publicHref = await page
    .locator(".published-address a")
    .getAttribute("href");
  expect(publicHref).toMatch(/\/p\/[a-z0-9-]+$/);
  // Keep local QA on the active test origin if a persisted development env
  // advertises a different local port.
  const publishedPath = new URL(publicHref!, page.url());
  const publicUrl = `${new URL(page.url()).origin}${publishedPath.pathname}${publishedPath.search}${publishedPath.hash}`;
  await page.screenshot({
    path: testInfo.outputPath("cloud-publish.png"),
    fullPage: true,
  });

  await page.getByText("Advanced options", { exact: true }).click();
  const websiteDownload = page
    .waitForEvent("download", { timeout: 15_000 })
    .catch(() => null);
  await page.getByRole("button", { name: "Download website" }).click();
  const download = await websiteDownload;
  if (!download)
    throw new Error(
      `Website export did not download: ${(await page.locator('[role="alert"], [role="status"]').allTextContents()).join(" | ")}`,
    );
  const archivePath = testInfo.outputPath("cloud-website.zip");
  await download.saveAs(archivePath);
  const archiveBuffer = await readFile(archivePath);
  const archive = await JSZip.loadAsync(archiveBuffer);
  expect(archive.file("index.html")).toBeTruthy();
  expect(archive.file("assets/portfolio.css")).toBeTruthy();
  expect(archive.file("fonts/fonts.css")).toBeTruthy();
  expect(archive.file("portfolio.json")).toBeTruthy();
  expect(
    Object.keys(archive.files).some((path) => path.startsWith("images/")),
  ).toBeTruthy();
  const offlineServer = await serveArchive(archiveBuffer);
  const offlinePage = await page.context().newPage();
  const offlineErrors: string[] = [];
  offlinePage.on("console", (message) => {
    if (message.type() === "error") offlineErrors.push(message.text());
  });
  offlinePage.on("pageerror", (error) => offlineErrors.push(error.message));
  await offlinePage.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1")
      return route.abort();
    return route.continue();
  });
  await offlinePage.goto(offlineServer.url);
  await expect(
    offlinePage.getByRole("heading", { name: "Cloud product engineer" }),
  ).toBeVisible();
  const offlineImages = offlinePage.locator("img");
  await expect(offlineImages).not.toHaveCount(0);
  await expect
    .poll(async () =>
      offlineImages.evaluateAll(
        (images) =>
          images.filter(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ).length,
      ),
    )
    .toBeGreaterThan(0);
  expect(offlineErrors).toEqual([]);
  await offlinePage.screenshot({
    path: testInfo.outputPath("cloud-offline-export.png"),
    fullPage: true,
  });
  await offlinePage.close();
  await offlineServer.close();

  const publicPage = await page.context().newPage();
  await publicPage.goto(publicUrl);
  await expect(
    publicPage.getByRole("heading", { name: "Cloud product engineer" }),
  ).toBeVisible();
  await expect(publicPage.getByText("Surrey open source map")).toBeVisible();
  await expect(
    publicPage.getByText("Portfolio Studio", { exact: true }),
  ).toHaveCount(0);
  const publishedImage = await publicPage
    .locator("img")
    .first()
    .getAttribute("src");
  expect(publishedImage).toMatch(/\/api\/assets\/asset_/);
  const anonymous = await requestFactory.newContext();
  const imageResponse = await anonymous.get(
    new URL(publishedImage!, publicUrl).toString(),
  );
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()["content-type"]).toMatch(/^image\//);
  expect((await imageResponse.body()).byteLength).toBeGreaterThan(100);
  await anonymous.dispose();
  await publicPage.screenshot({
    path: testInfo.outputPath("cloud-public.png"),
    fullPage: true,
  });

  await page.goto(`/editor/${projectId}`);
  const editedCanvas = page.frameLocator(
    'iframe[title="Editable portfolio canvas"]',
  );
  const currentHero = editedCanvas.getByRole("heading", {
    name: "Cloud product engineer",
  });
  await currentHero.click();
  await currentHero.fill("A new cloud portfolio chapter");
  await editedCanvas.locator('h1[contenteditable="true"]').blur();
  await page.getByTitle("Save now").click();
  await expect(page.locator(".save-status")).toContainText(/saved/i);
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Cloud product engineer" }),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("heading", { name: "A new cloud portfolio chapter" }),
  ).toHaveCount(0);

  await page.goto(`/publish/${projectId}`);
  await page.getByText("Advanced options", { exact: true }).click();
  await page.getByRole("button", { name: "Publish latest changes" }).click();
  await expect(page.locator(".publish-success")).toContainText(
    "Live and ready to share",
  );
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "A new cloud portfolio chapter" }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/auth");
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Recovery code").fill(recoveryCode);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  // Reset returns the auth form to sign-in mode in the current UX. Keep this
  // fallback for a future reset view that leaves the explicit back control.
  const backToSignIn = page.getByRole("button", { name: "Back to sign in" });
  if (await backToSignIn.count()) await backToSignIn.click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const signedInDraftId = await createLocalDraft(
    page,
    "Signed-in local QA",
    "A second local project",
  );
  await page.goto(`/publish/${signedInDraftId}`);
  await expect(
    page.getByRole("button", { name: "Publish portfolio" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish portfolio" }).click();
  await expect(page).toHaveURL(/\/publish\/(?!local_)/);
  const signedInProjectId = page.url().split("/").pop()!;
  await expect(page.locator(".publish-success")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/publish/${signedInProjectId}$`));
  await page.getByRole("link", { name: "Back to editor" }).click();
  await expect(page).toHaveURL(new RegExp(`/editor/${signedInProjectId}$`));
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: /Options for Signed-in local QA/ })
    .click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete portfolio" })
    .click();
  await expect(
    page.getByText("Signed-in local QA’s portfolio", { exact: true }),
  ).toHaveCount(0);

  await page
    .getByRole("button", { name: "Options for Cloud QA’s portfolio" })
    .click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete portfolio" })
    .click();
  await expect(
    page.getByText("Cloud QA’s portfolio", { exact: true }),
  ).toHaveCount(0);
  await publicPage.close();
});
