import { expect, test } from "@playwright/test";
import { action, reserveOpen, selectTile, walkTo } from "./controls";
test("build from a reservation by following the cabin's next action", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await reserveOpen(page);
  const guide = page.locator("#cabin-guide");
  const next = guide.getByRole("button");
  await expect(next).toBeFocused();
  await expect(guide).toContainText("Cabin at K4");
  await selectTile(page, "B7");
  for (const [stage, material] of [
    ["Lay floor", "logs"],
    ["Raise walls", "logs"],
    ["Fit roof and hearth", "stone"],
  ]) {
    await expect(guide.getByRole("heading")).toHaveText(stage);
    await expect(next).toContainText(
      stage === "Lay floor"
        ? "Walk to the tree"
        : material === "stone"
          ? "Walk to the rock"
          : "Walk to the logs",
    );
    await next.click();
    if (stage === "Lay floor") {
      await expect(next).toContainText("Fell tree");
      await next.click();
    }
    if (material === "stone") {
      await expect(next).toContainText("Work rock with pickaxe");
      await next.click();
    }
    for (const label of [
      `Pick up ${material}`,
      "Walk to the cabin at K4",
      "Deliver materials",
      stage,
    ]) {
      await expect(next).toContainText(label);
      await next.click();
    }
  }
  await expect(guide.getByRole("heading")).toHaveText("Cabin complete");
  await expect(next).toBeHidden();
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
});

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
  await expect(page.locator("#cabin-guide")).toBeHidden();
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
  await expect(page.locator("#cabin-next")).toContainText("Lay floor");
  await expect(page.locator("#load")).toContainText("Empty");
  await action(page, /^Lay floor/);
  await expect(page.locator("#inspect")).toContainText("Floor laid");
  await walkTo(page, "E5");
  await action(page, /^Work rock with pickaxe/);
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
