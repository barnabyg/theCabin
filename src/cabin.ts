import {
  minutes,
  coordinate,
  distance,
  land,
  type Homestead,
  type Job,
  type Stock,
  type Point,
} from "./world";
import { Hearth } from "./night";
export const footprint = { width: 3, height: 2 };
export function withinFootprint(origin: Point, p: Point) {
  return (
    p.x >= origin.x &&
    p.x < origin.x + footprint.width &&
    p.y >= origin.y &&
    p.y < origin.y + footprint.height
  );
}
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
      minutes: minutes.transfer,
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
    return withinFootprint(this.origin, p);
  }
}
export function footprintTiles(origin: Point, size = footprint) {
  const tiles: Point[] = [];
  for (let y = origin.y; y < origin.y + size.height; y++)
    for (let x = origin.x; x < origin.x + size.width; x++) tiles.push({ x, y });
  return tiles;
}
export function fixedObstruction(game: Homestead, tile: Point) {
  if (!land(tile)) return "Outside buildable land";
  if (game.cabins.some((cabin) => cabin.contains(tile))) return "Reserved blueprint";
  if (game.storage && distance(game.storage, tile) === 0) return "Storage area";
  return game.plot(tile).site?.kind;
}
export function obstructions(game: Homestead, origin: Point, size = footprint) {
  const blocked: string[] = [];
  for (const tile of footprintTiles(origin, size)) {
    const reason =
      fixedObstruction(game, tile) ??
      game.plot(tile).timber ??
      (game.plot(tile).stock.stone ? "Loose stone" : null);
    if (reason) blocked.push(`${coordinate(tile)} · ${reason}`);
  }
  return blocked;
}
