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
export const singleTile = { width: 1, height: 1 };
export function planSize(kind: Homestead["planKind"]) {
  return kind === "Cabin" ? footprint : singleTile;
}
export function withinFootprint(origin: Point, p: Point, size = footprint) {
  return (
    p.x >= origin.x &&
    p.x < origin.x + size.width &&
    p.y >= origin.y &&
    p.y < origin.y + size.height
  );
}
const stages = [
  {
    label: "Set footings and sills",
    progress: "Sills set",
    minutes: 10,
    logs: 1,
    stone: 1,
    instruction:
      "Level the ground with the spade, bed the stones and fit the timber base and rough floor.",
  },
  {
    label: "Raise wall posts",
    progress: "Wall posts raised",
    minutes: 12,
    logs: 3,
    stone: 1,
    instruction:
      "Hew the timbers, seat the uprights in the sills and tie their tops together. Leave openings for the door and window.",
  },
  {
    label: "Frame and shingle roof",
    progress: "Roof shingled",
    minutes: 10,
    logs: 4,
    stone: 1,
    instruction: "Raise the rafters, then cover them with overlapping rows of split wood shingles.",
  },
  {
    label: "Daub joints and fit door",
    progress: "Walls sealed",
    minutes: 5,
    logs: 4,
    stone: 1,
    instruction:
      "Pack local clay and grass between the posts, finish the floor and hang the plank door.",
  },
  {
    label: "Build hearth and chimney",
    progress: "Stone hearth ready",
    minutes: 8,
    logs: 4,
    stone: 2,
    instruction:
      "Bed the hearthstones and finish the chimney through the roof before lighting a fire.",
  },
] as const;
export const cabinStageCount = stages.length;
export const recipe = {
  logs: stages[stages.length - 1].logs,
  stone: stages[stages.length - 1].stone,
};
export type BuildingMaterial = keyof typeof recipe;
export const buildingMaterials = ["logs", "stone"] as const;
export class Cabin {
  hearth = new Hearth();
  delivered = { logs: 0, stone: 0 };
  stage = 0;
  get complete() {
    return this.stage === stages.length;
  }
  get roofed() {
    return this.stage >= 3;
  }
  get sealed() {
    return this.stage >= 4;
  }
  get progress() {
    return stages[this.stage - 1]?.progress ?? "Blueprint";
  }
  remaining(material: BuildingMaterial) {
    return recipe[material] - this.delivered[material];
  }
  get nextStage() {
    return stages[this.stage];
  }
  buildJob(): Job | undefined {
    const next = this.nextStage;
    if (!next) return;
    return {
      label: next.label,
      minutes: next.minutes,
      enabled: this.delivered.logs >= next.logs && this.delivered.stone >= next.stone,
      run: () => {
        this.stage++;
      },
    };
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
    const build = this.buildJob();
    if (build) jobs.push(build);
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
    const reason = obstructionAt(game, tile);
    if (reason) blocked.push(`${coordinate(tile)} · ${reason}`);
  }
  return blocked;
}

export function obstructionAt(game: Homestead, tile: Point) {
  return (
    fixedObstruction(game, tile) ??
    game.plot(tile).timber ??
    (game.plot(tile).rawStone ? "Raw rock" : game.plot(tile).stock.stone ? "Loose stone" : null)
  );
}
