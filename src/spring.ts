import type { Homestead } from "./world";

export const springDays = 6;
export const dailyMinutes = 360;

export class Spring {
  day = 1;
  seeds = { turnip: 2, squash: 2 };
  won = false;
  get ended() {
    return this.won || this.day > springDays;
  }
  rest() {
    if (!this.ended) this.day++;
  }
}

export function harvestProgress(game: Homestead) {
  const cabin = game.cabins.some((c) => c.complete);
  const well = game.plots.some(({ site }) => site?.kind === "Well" && site.complete);
  const stored = game.plots.reduce(
    (total, { site }) => total + (site?.kind === "Pantry" && site.complete ? site.stored : 0),
    0,
  );
  return { cabin, well, stored };
}
