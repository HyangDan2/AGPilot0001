import { expect, test } from "@playwright/test";

test("page loads under the nested base path without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page).toHaveTitle(/VALKYRIE EIRA/);
  await expect(page.locator("#game")).toBeVisible();
  expect(errors).toEqual([]);
});
