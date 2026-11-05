import { expect, test } from "@playwright/test";

test("la página abre con el título Torre Diaria", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Torre Diaria");
});
