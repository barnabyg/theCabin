import { Cabin, obstructions } from "./cabin";
export const COLS = 16,
  ROWS = 9,
  TILE = 56,
  CAPACITY = 2;
export type Material = "logs" | "stone";
export type Stock = Record<Material, number>;
export interface Point {
  x: number;
  y: number;
}
export interface Plot {
  timber: "Tree" | "Stump" | null;
  stock: Stock;
}
export const wooded = { x: 3, y: 3 },
  openSite = { x: 10, y: 3 };
export const freshStock = (): Stock => ({ logs: 0, stone: 0 });
export const quantity = (s: Stock) => s.logs + s.stone;
export const stockLabel = (s: Stock) =>
  Object.entries(s)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k === "logs" && n === 1 ? "log" : k}`)
    .join(", ") || "Empty";
export const coordinate = (p: Point) => String.fromCharCode(65 + p.x) + (p.y + 1);
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const land = (p: Point) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < 7;
export interface Job {
  label: string;
  minutes: number;
  run: () => void;
  enabled?: boolean;
}
export class Homestead {
  position: Point = { x: 6, y: 5 };
  selected: Point = { ...this.position };
  plots: Plot[] = Array.from({ length: COLS * ROWS }, () => ({
    timber: null,
    stock: freshStock(),
  }));
  cabins: Cabin[] = [];
  preview: Point = { ...openSite };
  planning = false;
  reserve() {
    if (obstructions(this, this.preview).length) return;
    this.cabins.push(new Cabin({ ...this.preview }));
    this.selected = { ...this.preview };
    this.planning = false;
    this.message = "Cabin footprint reserved.";
  }
  load = freshStock();
  daylight = 360;
  message = "Daybreak. Select a tile to inspect the clearing.";
  constructor() {
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [3, 0],
      [4, 0],
      [7, 0],
      [12, 0],
      [14, 0],
      [15, 0],
      [0, 1],
      [2, 1],
      [5, 1],
      [9, 1],
      [13, 1],
      [15, 2],
      [0, 3],
      [2, 3],
      [3, 3],
      [1, 4],
      [2, 5],
      [0, 6],
      [15, 6],
    ])
      this.plot({ x, y }).timber = "Tree";
    this.plot({ x: 4, y: 4 }).stock.stone = 2;
    this.plot({ x: 5, y: 2 }).stock.stone = 4;
  }
  plot(p: Point) {
    return this.plots[p.y * COLS + p.x];
  }
  get pace() {
    return quantity(this.load) > 0 ? 2 : 1;
  }
  walk(p: Point) {
    if (!land(p)) return false;
    const cost = distance(this.position, p) * this.pace;
    if (cost > this.daylight) return false;
    this.daylight -= cost;
    this.position = { ...p };
    return true;
  }
  commit(job: Job) {
    if (job.enabled === false || job.minutes > this.daylight) return;
    this.daylight -= job.minutes;
    job.run();
    this.message = `${job.label} · ${coordinate(this.position)}`;
  }
  jobs(): Job[] {
    const p = this.selected,
      tile = this.plot(p),
      here = distance(this.position, p) === 0;
    if (!here)
      return [
        {
          label: "Walk here",
          minutes: distance(this.position, p) * this.pace,
          run: () => {
            this.position = { ...p };
          },
        },
      ];
    const jobs: Job[] = [];
    if (tile.timber === "Stump")
      jobs.push({
        label: "Clear stump with spade",
        minutes: 8,
        run: () => {
          tile.timber = null;
        },
      });
    if (tile.timber === "Tree")
      jobs.push({
        label: "Fell tree · 4 logs",
        minutes: 12,
        run: () => {
          tile.timber = "Stump";
          tile.stock.logs += 4;
        },
      });
    for (const material of ["logs", "stone"] as const) {
      if (!tile.stock[material]) continue;
      const amount = Math.min(CAPACITY - quantity(this.load), tile.stock[material]);
      jobs.push({
        label: `Pick up ${material}`,
        minutes: 1,
        enabled: amount > 0,
        run: () => {
          tile.stock[material] -= amount;
          this.load[material] += amount;
        },
      });
    }
    if (quantity(this.load))
      jobs.push({
        label: "Set down load",
        minutes: 1,
        run: () => {
          tile.stock.logs += this.load.logs;
          tile.stock.stone += this.load.stone;
          this.load = freshStock();
        },
      });
    return jobs;
  }
}
