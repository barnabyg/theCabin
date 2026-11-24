import { expect, test } from "@playwright/test";
import { action, reserveOpen, selectTile, walkTo } from "./controls";
test("interrupt a repeat haul, preserve its load, then finish the cabin in stages", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T12:01:00Z"));
  await page.goto("/");
  await reserveOpen(page);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  await action(page, /^Repeat haul · logs to K4/);
  const pause = page.getByRole("button", { name: "Pause haul" });
  await pause.focus();
  const advanceToLoad = (label: string) =>
    expect
      .poll(
        async () => {
          await page.clock.runFor(400);
          return page.locator("#load").textContent();
        },
        { intervals: [0] },
      )
      .toContain(label);
  await advanceToLoad("Empty");
  await expect(pause).toBeFocused();
  await advanceToLoad("2 logs");
  await action(page, /^Pause haul/);
  await expect(page.locator("#haul")).toContainText("Paused");
  await expect(page.locator("#load")).toContainText("2 logs");
  await selectTile(page, "K4");
  await expect(page.locator("#inspect")).toContainText("Delivered · 2 logs, 0 stone");
  await action(page, /^Resume haul/);
  await page.clock.resume();
  await expect(page.locator("#haul")).toContainText("Haul complete", { timeout: 25000 });
  await expect(pause).toBeHidden();
  await expect(page.locator("#inspect")).toContainText("Delivered · 4 logs, 0 stone");
  await expect(page.locator("#load")).toContainText("Empty");
  await action(page, /^Lay floor/);
  await expect(page.locator("#inspect")).toContainText("Floor laid");
  await walkTo(page, "E5");
  await action(page, /^Pick up stone/);
  await walkTo(page, "K4");
  await expect(page.locator("#inspect")).toContainText("Floor laid");
  await action(page, /^Deliver materials/);
  await expect(page.locator("#inspect")).toContainText("Outstanding · 0 logs, 0 stone");
  await expect(page.getByRole("button", { name: /Deliver materials/ })).toHaveCount(0);
  await action(page, /^Raise walls/);
  await expect(page.locator("#inspect")).toContainText("Walls raised");
  await action(page, /^Fit roof and hearth/);
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
  await expect(page.getByRole("button", { name: /Split 1 log/ })).toHaveCount(0);
});
