import { CAPACITY, quantity, type Homestead, type Job, type Plot, type Stock } from "./world";
import type { Spring } from "./spring";

export const crops = {
  turnip: { name: "Turnip", days: 2, yield: 2 },
};
export type Variety = keyof typeof crops;
export interface Garden {
  kind: "Garden";
  crop?: { variety: Variety; days: number; watered: boolean };
}

export function growGardens(plots: Plot[]) {
  for (const { site } of plots) {
    if (site?.kind !== "Garden") continue;
    const crop = site.crop;
    if (crop?.watered) {
      crop.days++;
      crop.watered = false;
    }
  }
}

export function gardenNotes(garden: Garden, spring: Spring): string[] {
  const crop = garden.crop;
  if (!crop)
    return (Object.keys(crops) as Variety[]).map((v) => {
      const rule = crops[v];
      return `${rule.name} · ${spring.seeds[v]} seeds · ${rule.days} watered days · 1 water per day · ${rule.yield} food`;
    });
  const rule = crops[crop.variety];
  return [
    `${rule.name} · ${crop.days}/${rule.days} watered days · ${crop.days >= rule.days ? "Ready to harvest" : crop.watered ? "Watered today" : "Needs 1 water"}`,
  ];
}

export function drawWater(load: Stock, label: string): Job {
  return {
    label,
    minutes: 2,
    enabled: quantity(load) < CAPACITY,
    run: () => {
      load.water++;
    },
  };
}

export function springJobs(game: Homestead, spring: Spring): Job[] {
  const plot = game.plot(game.position);
  const jobs: Job[] = [];
  if (game.position.y === 6) jobs.push(drawWater(game.load, "Draw stream water"));
  const site = plot.site;
  if (site?.kind !== "Garden") return jobs;
  const crop = site.crop;
  if (!crop) {
    for (const v of Object.keys(crops) as Variety[])
      jobs.push({
        label: `Sow ${v}`,
        minutes: 4,
        enabled: spring.seeds[v] > 0,
        run: () => {
          spring.seeds[v]--;
          site.crop = { variety: v, days: 0, watered: false };
        },
      });
  } else if (crop.days >= crops[crop.variety].days) {
    jobs.push({
      label: `Harvest ${crop.variety}`,
      minutes: 4,
      run: () => {
        plot.stock.food += crops[crop.variety].yield;
        delete site.crop;
      },
    });
  } else
    jobs.push({
      label: "Water crop",
      minutes: 2,
      enabled: !crop.watered && game.load.water > 0,
      run: () => {
        game.load.water--;
        crop.watered = true;
      },
    });
  return jobs;
}
