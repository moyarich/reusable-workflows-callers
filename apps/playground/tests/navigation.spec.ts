import { expect, test } from "@playwright/test";

test("playground serves its application", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).not.toBeEmpty();
});
