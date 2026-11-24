import { drawWater } from "./garden";
import { stockLabel, type Job, type Stock } from "./world";

export const plans = {
  Well: { material: "stone", amount: 4, minutes: 12, purpose: "Draw water near your crops." },
  Pantry: {
    material: "logs",
    amount: 2,
    minutes: 8,
    purpose: "Store edible harvest before frost.",
  },
} as const;
export type OutbuildingKind = keyof typeof plans;
export type Outbuilding = ({ kind: "Well" } | { kind: "Pantry"; stored: number }) & {
  delivered: number;
  complete: boolean;
};

export function buildingNotes(site: Outbuilding, load: Stock) {
  const { material, amount } = plans[site.kind];
  return [
    `${site.kind} · ${site.complete ? "Complete" : "Blueprint"}`,
    `Held · ${stockLabel(load)}`,
    `Delivered · ${site.delivered} ${material}`,
    `Outstanding · ${amount - site.delivered} ${material}`,
    ...(site.kind === "Pantry" && site.complete ? [`Stored · ${site.stored} portions`] : []),
  ];
}

export function buildingJobs(site: Outbuilding, load: Stock): Job[] {
  if (site.complete) {
    if (site.kind === "Well") return [drawWater(load, "Draw well water")];
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
