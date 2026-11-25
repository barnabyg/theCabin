import { expect, test } from "@playwright/test";
import { action, selectTile } from "./controls";

test("clear the chosen cabin footprint, store each load and build from the stockpile", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T12:01:00Z"));
  await page.goto("/");
  await action(page, /^Build menu/);
  await action(page, /^Wooded site/);
  await expect(page.getByRole("button", { name: "Clear area" })).toBeDisabled();
  await action(page, /^Return to clearing/);
  await action(page, /^Mark storage area/); // G6, where the settler starts
  await action(page, /^Build menu/);
  await selectTile(page, "G6");
  await expect(page.locator("#plan-menu")).toContainText("G6 · Storage area");
  await expect(page.getByRole("button", { name: "Reserve footprint" })).toBeDisabled();
  await action(page, /^Wooded site/);
  await action(page, /^Clear area$/);
  await page.clock.runFor(7 * 320);
  await action(page, /^Pause clearing/);
  await expect(page.locator("#load")).toContainText("2 logs (2/2)");
  const clock = await page.locator("#clock").textContent();
  await page.clock.runFor(5000);
  expect(await page.locator("#clock").textContent()).toBe(clock);
  await action(page, /^Resume clearing/);
  await page.clock.runFor(15000);
  await expect(page.locator("#haul")).toContainText("Ready to reserve · Cabin site D4");
  await expect(page.locator("#inspect")).toContainText("On the ground · 4 logs, 2 stone");
  await expect(page.locator("#clock")).toHaveText("4h 55m");
  await selectTile(page, "C4");
  await expect(page.locator("#inspect")).toContainText("Tree");
  await action(page, /^Build menu/);
  await action(page, /^Reserve footprint/);
  for (const material of ["logs", "stone"]) {
    await selectTile(page, "G6");
    const walk = page.getByRole("button", { name: /^Walk here/ });
    if (await walk.count()) await walk.click();
    await action(page, new RegExp(`^Repeat haul · ${material} to D4`));
    await page.clock.runFor(15000);
  }
  await action(page, /^Lay floor/);
  await action(page, /^Raise walls/);
  await action(page, /^Fit roof and hearth/);
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
});

test("save a loaded clearing trip and resume after an overnight rest", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T12:01:00Z"));
  await page.goto("/?scenario=harvest");
  await action(page, /^Mark storage area/);
  await action(page, /^Build menu/);
  await action(page, /^Wooded site/);
  await action(page, /^Clear area$/);
  await page.clock.runFor(7 * 320);
  await action(page, /^Save spring day/);
  await page.reload();
  await expect(page.locator("#haul")).toContainText("Paused");
  await expect(page.locator("#load")).toContainText("2 logs");
  await action(page, /^Rest until tomorrow/);
  await action(page, /^Resume clearing/);
  await page.clock.runFor(15000);
  await expect(page.locator("#haul")).toContainText("Ready to reserve");
  await expect(page.locator("#inspect")).toContainText("4 logs, 2 stone");
});
