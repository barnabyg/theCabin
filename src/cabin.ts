import { coordinate, land, type Homestead, type Point } from "./world";
export const recipe = { logs: 4, stone: 2 };
export class Cabin {
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
