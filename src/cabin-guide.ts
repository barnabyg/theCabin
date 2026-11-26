import type { Cabin } from "./cabin";
import {
  CAPACITY,
  COLS,
  coordinate,
  distance,
  land,
  pickup,
  pickaxeJob,
  quantity,
  timberJob,
  type Homestead,
  type Job,
  type Point,
} from "./world";

type CabinStep = { note: string; job?: Job };

export function nextCabinStep(game: Homestead, cabin: Cabin): CabinStep {
  const stage = cabin.nextStage;
  const build = cabin.buildJob();
  if (!stage || !build) return { note: "Your cabin is built and the stone hearth is ready." };

  const site = cabin.contains(game.position) ? game.position : cabin.origin;
  const at = (target: Point, walkLabel: string, job: Job, note: string): CabinStep => ({
    note,
    job: distance(game.position, target) ? { ...game.walkJob(target), label: walkLabel } : job,
  });
  const returnLabel = `Walk to the cabin at ${coordinate(site)}`;
  if (build.enabled) return at(site, returnLabel, build, stage.instruction);

  const delivery = cabin.delivery(game.load);
  if (delivery)
    return at(site, returnLabel, delivery, "Deliver the building materials in your pack.");
  if (quantity(game.load) === CAPACITY)
    return {
      note: "Set your pack down here to make room for building materials.",
      job: game.setDownJob(),
    };

  const material = cabin.delivered.logs < stage.logs ? "logs" : "stone";
  const needed = stage[material] - cabin.delivered[material];
  const note = `Bring ${needed} more ${material === "logs" && needed === 1 ? "log" : material} to the cabin.`;
  const sources = game.plots
    .map((plot, i) => ({ plot, tile: { x: i % COLS, y: Math.floor(i / COLS) } }))
    .filter(({ tile }) => land(tile))
    .sort((a, b) => distance(game.position, a.tile) - distance(game.position, b.tile));
  const pile = sources.find(({ plot }) => plot.stock[material] > 0);
  if (pile)
    return at(
      pile.tile,
      `Walk to the ${material} at ${coordinate(pile.tile)}`,
      pickup(game.load, pile.plot.stock, material),
      note,
    );
  const tree = material === "logs" && sources.find(({ plot }) => plot.timber === "Tree");
  if (tree) {
    const fell = timberJob(tree.plot);
    if (fell) return at(tree.tile, `Walk to the tree at ${coordinate(tree.tile)}`, fell, note);
  }
  const rock = material === "stone" && sources.find(({ plot }) => plot.rawStone);
  if (rock) {
    const work = pickaxeJob(rock.plot);
    if (work) return at(rock.tile, `Walk to the rock at ${coordinate(rock.tile)}`, work, note);
  }
  return { note: `This stage needs ${material}. The clearing has no more to gather.` };
}
