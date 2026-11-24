import { expect, test } from "@playwright/test";
test("fell timber and carry a conserved load to another tile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("One cold night", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "D4", exact: true }).click();
  await page.getByRole("button", { name: /Walk here/ }).click();
  await page.getByRole("button", { name: /Fell tree/ }).click();
  await expect(page.locator("#inspect")).toContainText("Stump");
  await expect(page.locator("#inspect")).toContainText("4 logs");
  await page.getByRole("button", { name: /Pick up logs/ }).click();
  await expect(page.locator("#load")).toContainText("2 logs");
  await expect(page.locator("#inspect")).toContainText("2 logs");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "E4", exact: true }).click();
  await page.getByRole("button", { name: /Set down load/ }).click();
  await expect(page.locator("#load")).toContainText("Empty");
  await expect(page.locator("#inspect")).toContainText("2 logs");
});
