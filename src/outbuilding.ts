import { fuelCoverage } from "./firewood";
import { drawWater } from "./garden";
import { CAPACITY, quantity, stockLabel, type Job, type Stock } from "./world";

export const plans = {
  Well: { material: "stone", amount: 4, minutes: 12, purpose: "Draw water near your crops." },
  "Covered woodpile": {
    material: "logs",
    amount: 2,
    minutes: 8,
    purpose: "Keep split firewood dry through autumn rain.",
  },
  Pantry: {
    material: "logs",
    amount: 2,
    minutes: 8,
    purpose: "Store edible harvest before frost.",
  },
} as const;
export type OutbuildingKind = keyof typeof plans;
export interface Pantry {
  kind: "Pantry";
  stored: number;
  water?: number;
}
export type Outbuilding = (
  | { kind: "Well" }
  | Pantry
  | { kind: "Covered woodpile"; stored: number }
) & {
  delivered: number;
  complete: boolean;
};

export function buildingNotes(site: Outbuilding, load: Stock, firstWinter: boolean) {
  const { material, amount } = plans[site.kind];
  const notes = [
    `${site.kind} · ${site.complete ? "Complete" : "Blueprint"}`,
    `Held · ${stockLabel(load)}`,
    `Delivered · ${site.delivered} ${material}`,
    `Outstanding · ${amount - site.delivered} ${material}`,
  ];
  if (site.kind === "Pantry" && site.complete) {
    const plural = site.stored === 1 ? "" : "s";
    const meals = firstWinter ? ` · ${site.stored} winter meal${plural}` : "";
    notes.push(`Stored · ${site.stored} portion${plural}${meals}`);
  }
  if (site.kind === "Covered woodpile" && site.complete)
    notes.push(`Dry firewood · ${fuelCoverage(site.stored)} of heat`);
  return notes;
}

export function buildingJobs(site: Outbuilding, load: Stock): Job[] {
  if (site.complete) {
    if (site.kind === "Well") return [drawWater(load, "Draw well water")];
    if (site.kind === "Covered woodpile")
      return [
        {
          label: "Store firewood",
          minutes: 1,
          enabled: load.firewood > 0,
          run: () => {
            site.stored += load.firewood;
            load.firewood = 0;
          },
        },
        {
          label: "Withdraw 1 firewood",
          minutes: 1,
          enabled: site.stored > 0 && quantity(load) < CAPACITY,
          run: () => {
            site.stored--;
            load.firewood++;
          },
        },
      ];
    return [
      {
        label: "Store harvest",
        minutes: 1,
        enabled: load.food > 0,
        run: () => {
          site.stored += load.food;
          load.food = 0;
        },
      },
    ];
  }
  const plan = plans[site.kind];
  const transfer = Math.min(load[plan.material], plan.amount - site.delivered);
  const name = site.kind.toLowerCase();
  return [
    {
      label: `Deliver to ${name}`,
      minutes: 1,
      enabled: transfer > 0,
      run: () => {
        load[plan.material] -= transfer;
        site.delivered += transfer;
      },
    },
    {
      label: `Finish ${name}`,
      minutes: plan.minutes,
      enabled: site.delivered === plan.amount,
      run: () => {
        site.complete = true;
      },
    },
  ];
}
