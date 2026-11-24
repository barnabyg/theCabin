import { coordinate, land, type Homestead, type Job, type Stock, type Point } from "./world";
import { Hearth } from "./night";
export const recipe = { logs: 4, stone: 2 };
export type BuildingMaterial = keyof typeof recipe;
export const buildingMaterials = ["logs", "stone"] as const;
const stages = [
  { label: "Lay floor", minutes: 10, logs: 2, stone: 0 },
  { label: "Raise walls", minutes: 14, logs: 4, stone: 0 },
  { label: "Fit roof and hearth", minutes: 16, logs: 4, stone: 2 },
] as const;
export class Cabin {
  hearth = new Hearth();
  delivered = { logs: 0, stone: 0 };
  stage = 0;
  get complete() {
    return this.stage === stages.length;
  }
  get progress() {
    return ["Blueprint", "Floor laid", "Walls raised", "Stone hearth ready"][this.stage];
  }
  remaining(material: BuildingMaterial) {
    return recipe[material] - this.delivered[material];
  }
  delivery(load: Stock): Job | undefined {
    if (!buildingMaterials.some((material) => load[material] > 0 && this.remaining(material) > 0))
      return;
    return {
      label: "Deliver materials",
      minutes: 1,
      run: () => {
        for (const material of buildingMaterials) {
          const amount = Math.min(load[material], this.remaining(material));
          load[material] -= amount;
          this.delivered[material] += amount;
        }
      },
    };
  }
  jobs(load: Stock): Job[] {
    const delivery = this.delivery(load),
      jobs = delivery ? [delivery] : [];
    const next = stages[this.stage];
    if (next)
      jobs.push({
        label: next.label,
        minutes: next.minutes,
        enabled: this.delivered.logs >= next.logs && this.delivered.stone >= next.stone,
        run: () => {
          this.stage++;
        },
      });
    return jobs;
  }
  constructor(readonly origin: Point) {}
  contains(p: Point) {
    return (
      p.x >= this.origin.x &&
      p.x < this.origin.x + 3 &&
      p.y >= this.origin.y &&
      p.y < this.origin.y + 2
    );
  }
}
export function obstructions(game: Homestead, origin: Point) {
  const blocked: string[] = [];
  for (let y = origin.y; y < origin.y + 2; y++)
    for (let x = origin.x; x < origin.x + 3; x++) {
      const p = { x, y };
      let reason: string | null = null;
      if (!land(p)) reason = "Outside buildable land";
      else if (game.cabins.some((cabin) => cabin.contains(p))) reason = "Reserved blueprint";
      else {
        const plot = game.plot(p);
        reason = plot.timber ?? (plot.stock.stone ? "Loose stone" : null);
      }
      if (reason) blocked.push(`${coordinate(p)} · ${reason}`);
    }
  return blocked;
}
