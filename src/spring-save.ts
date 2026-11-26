import {
  Cabin,
  cabinStageCount,
  fixedObstruction,
  footprint,
  footprintTiles,
  recipe,
} from "./cabin";
import { crops } from "./garden";
import { plans } from "./outbuilding";
import { ClearArea, Haul, type WorkOrder } from "./haul";
import { dailyMinutes, Spring, springDays } from "./spring";
import {
  CAPACITY,
  COLS,
  ROWS,
  freshStock,
  Homestead,
  land,
  quantity,
  type Point,
  type Plot,
  type Stock,
} from "./world";

export const saveKey = "the-cabin.first-harvest";

export function snapshot(game: Homestead, spring: Spring, haul?: WorkOrder) {
  return {
    version: 2,
    spring: { day: spring.day, seeds: spring.seeds },
    position: game.position,
    selected: game.selected,
    daylight: game.daylight,
    storage: game.storage,
    clearing: haul instanceof ClearArea && !haul.finished ? haul.origin : undefined,
    plots: game.plots,
    load: game.load,
    cabins: game.cabins.map(({ origin, delivered, stage, hearth }) => ({
      origin,
      delivered,
      stage,
      hearth,
    })),
    haul:
      haul instanceof Haul && !haul.finished
        ? {
            source: haul.source,
            cabin: game.cabins.indexOf(haul.cabin),
            material: haul.material,
          }
        : null,
  };
}

export function saveSpring(game: Homestead, spring: Spring, haul?: WorkOrder) {
  localStorage.setItem(saveKey, JSON.stringify(snapshot(game, spring, haul)));
}

function count(value: number, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function validPosition(p: Point) {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && land(p);
}

function restoreStock(record: Stock) {
  const stock = { ...freshStock(), ...record };
  if (!record || !Object.values(stock).every((n) => count(n))) throw Error("Invalid stock");
  return stock;
}

function restorePlot(plot: Plot): Plot {
  const { site, timber } = plot;
  if (plot.rawStone !== undefined && !count(plot.rawStone)) throw Error("Invalid rock deposit");
  if (timber !== null && timber !== "Tree" && timber !== "Stump") throw Error("Invalid timber");
  if (site?.kind === "Garden") {
    const c = site.crop;
    if (
      c &&
      (!Object.hasOwn(crops, c.variety) ||
        !count(c.days, crops[c.variety].days) ||
        typeof c.watered !== "boolean")
    )
      throw Error("Invalid crop");
  } else if (site) {
    if (
      !Object.hasOwn(plans, site.kind) ||
      !count(site.delivered, plans[site.kind].amount) ||
      typeof site.complete !== "boolean" ||
      (site.kind !== "Well" && !count(site.stored)) ||
      (site.kind === "Pantry" && site.water !== undefined && !count(site.water))
    )
      throw Error("Invalid building");
  }
  return { ...plot, stock: restoreStock(plot.stock) };
}

export function resumeSpring(encoded: string) {
  return restoreSpring(JSON.parse(encoded));
}

export function restoreSpring(data: ReturnType<typeof snapshot>, lastDay = springDays) {
  if (data.version !== 1 && data.version !== 2) throw Error("Unsupported save version");
  if (
    !Array.isArray(data.plots) ||
    data.plots.length !== COLS * ROWS ||
    !validPosition(data.position) ||
    !validPosition(data.selected) ||
    !count(data.daylight, dailyMinutes) ||
    !count(data.spring.day, lastDay + 1) ||
    data.spring.day < 1 ||
    !count(data.spring.seeds.turnip) ||
    !count(data.spring.seeds.squash)
  )
    throw Error("Invalid spring day");
  const game = new Homestead();
  const spring = new Spring(lastDay);
  spring.day = data.spring.day;
  spring.seeds = data.spring.seeds;
  game.position = data.position;
  game.selected = data.selected;
  game.daylight = data.daylight;
  game.plots = data.plots.map(restorePlot);
  game.load = restoreStock(data.load);
  if (quantity(game.load) > CAPACITY) throw Error("Invalid carried load");
  game.cabins = data.cabins.map((record) => {
    if (
      !validPosition(record.origin) ||
      !land({
        x: record.origin.x + footprint.width - 1,
        y: record.origin.y + footprint.height - 1,
      }) ||
      !count(record.delivered.logs, recipe.logs) ||
      !count(record.delivered.stone, recipe.stone) ||
      !count(record.stage, data.version === 1 ? 3 : cabinStageCount) ||
      !count(record.hearth.fuel) ||
      typeof record.hearth.lit !== "boolean"
    )
      throw Error("Invalid cabin");
    const cabin = new Cabin(record.origin);
    cabin.delivered = record.delivered;
    // Released v1 saves numbered the finished roof and hearth as stage three.
    cabin.stage = data.version === 1 && record.stage === 3 ? cabinStageCount : record.stage;
    Object.assign(cabin.hearth, record.hearth);
    return cabin;
  });
  if (data.storage !== undefined) {
    if (
      !validPosition(data.storage) ||
      fixedObstruction(game, data.storage) ||
      game.plot(data.storage).timber
    )
      throw Error("Invalid storage area");
    game.storage = data.storage;
  }
  let haul: WorkOrder | undefined;
  if (data.clearing !== undefined) {
    if (
      !game.storage ||
      data.haul ||
      !validPosition(data.clearing) ||
      footprintTiles(data.clearing).some((tile) => fixedObstruction(game, tile))
    )
      throw Error("Invalid clearing order");
    haul = new ClearArea(data.clearing, game.storage);
    game.preview = { ...data.clearing };
    haul.paused = true;
  } else if (data.haul) {
    if (
      !validPosition(data.haul.source) ||
      !game.cabins[data.haul.cabin] ||
      !Object.hasOwn(recipe, data.haul.material)
    )
      throw Error("Invalid haul");
    haul = new Haul(data.haul.source, game.cabins[data.haul.cabin], data.haul.material);
    haul.paused = true;
  }
  game.message = "Spring day resumed.";
  return { game, spring, haul };
}
