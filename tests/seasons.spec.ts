import { expect, test } from "@playwright/test";
import { action } from "./controls";

for (const muted of [false, true]) {
  test(`seasonal clearing and weather warnings with sound ${muted ? "off" : "on"}`, async ({
    page,
  }) => {
    await page.goto("/?scenario=winter");
    const sounds = page.getByRole("button", { name: "Season and weather sounds" });
    await expect(sounds).toHaveAttribute("aria-pressed", "true");
    const played = await page.evaluateHandle(() => {
      const clips: string[] = [];
      document.addEventListener(
        "playing",
        (event) => {
          const media = event.target;
          if (media instanceof HTMLAudioElement && !media.muted && media.volume > 0) {
            clips.push(media.currentSrc);
          }
        },
        true,
      );
      return clips;
    });
    if (muted) await sounds.click();
    const expectClips = (count: number) =>
      expect.poll(async () => new Set(await played.jsonValue()).size).toBe(muted ? 0 : count);
    const rest = () => action(page, /^Rest until tomorrow/);
    await rest();
    await rest();
    const clearing = page.locator("#terrain");
    const spring = await clearing.screenshot();
    await expectClips(1);
    await rest();
    await expect(page.locator("#calendar")).toContainText("Summer");
    const summer = await clearing.screenshot();
    expect(summer.equals(spring)).toBe(false);
    await expectClips(2);
    await rest();
    await rest();
    await expect(page.locator("#calendar")).toContainText("Rain tonight");
    await expect(page.locator("#night")).toContainText(/will spoil.*covered woodpile/);
    const autumn = await clearing.screenshot();
    expect(autumn.equals(summer)).toBe(false);
    await expectClips(3);
    await rest();
    await expect(page.locator("#calendar")).toContainText("Winter");
    const winter = await clearing.screenshot();
    expect(winter.equals(autumn)).toBe(false);
    await expectClips(4);
    await rest();
    await expect(page.locator("#calendar")).toContainText("Cold spell");
    await expect(page.locator("#night")).toContainText(/2 firewood tonight/);
    await expect(page.locator("#night")).toContainText(/add split firewood and light the hearth/);
    await expectClips(5);
    if (muted) {
      await page.reload();
      await expect(sounds).toHaveAttribute("aria-pressed", "false");
    }
  });
}
