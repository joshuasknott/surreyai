import { test, expect } from "@playwright/test";

const names = [
  "Signal",
  "Field Notes",
  "Cobalt",
  "Portrait",
  "Offset",
  "Ledger",
  "Nightfall",
  "Open Studio",
  "First Light",
  "Colourblock",
];

for (const name of names) {
  test(`${name} has a complete desktop and mobile preview without overflow`, async ({
    page,
  }, testInfo) => {
    await page.goto("/designs");
    await page
      .getByRole("button", { name: `Preview ${name}`, exact: true })
      .click();
    const preview = page.frameLocator('iframe[title="Portfolio preview"]');
    await expect(preview.locator(".pf-site-footer")).toBeAttached();
    await expect(preview.locator("h1")).toBeVisible();
    await expect
      .poll(() =>
        preview
          .locator("body")
          .evaluate(
            (el) =>
              el.scrollWidth <=
              el.ownerDocument.documentElement.clientWidth + 1,
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `${name.toLowerCase().replaceAll(" ", "-")}-desktop.png`,
      ),
    });
    await page
      .getByRole("button", { name: "Mobile preview", exact: true })
      .click();
    await expect(preview.locator(".pf-site")).toBeVisible();
    await expect
      .poll(() =>
        preview
          .locator("body")
          .evaluate(
            (el) =>
              el.scrollWidth <=
              el.ownerDocument.documentElement.clientWidth + 1,
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `${name.toLowerCase().replaceAll(" ", "-")}-mobile.png`,
      ),
    });

    // Inspect the actual preview markup at its native size as well as inside
    // the scaled editor frame. This catches text hidden by the site's clip.
    const html = await preview.locator("html").evaluate((el) => el.outerHTML);
    const render = await page.context().newPage();
    await render.route("**/__layout-review", (route) =>
      route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html>${html}`,
      }),
    );
    await render.goto("/__layout-review");
    await render.evaluate(() => document.fonts.ready);
    for (const width of [1140, 390]) {
      await render.setViewportSize({ width, height: 900 });
      const overflowingHeadings = await render
        .locator("h1,h2,h3")
        .evaluateAll((headings) =>
          headings
            .filter((heading) => {
              const range = heading.ownerDocument.createRange();
              range.selectNodeContents(heading);
              return [...range.getClientRects()].some(
                (rect) => rect.right > innerWidth + 1 || rect.left < -1,
              );
            })
            .map((heading) => heading.textContent),
        );
      expect(overflowingHeadings).toEqual([]);
      await render.screenshot({
        path: testInfo.outputPath(
          `${name.toLowerCase().replaceAll(" ", "-")}-full-${width}.png`,
        ),
        fullPage: true,
      });
    }
    await render.close();
  });
}
