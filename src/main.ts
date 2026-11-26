import { storeDrinkingWater } from "./rations";
import { openCampaign, renderCampaign } from "./campaign-panel";
import { button, element, paragraph } from "./ui";
import { gardenNotes, springJobs } from "./garden";
import { buildingNotes, buildingJobs } from "./outbuilding";
import { springBuildMenu } from "./spring-build";
import { openScenario, renderSpring, nextSpringDay } from "./spring-panel";
import { harvestProgress, springDays } from "./spring";
import { renderNight } from "./night-panel";
import { ClearArea, Haul, type WorkOrder } from "./haul";
import { nextCabinStep } from "./cabin-guide";
import {
  type Cabin,
  footprint,
  footprintTiles,
  fixedObstruction,
  withinFootprint,
  planSize,
  buildingMaterials,
  recipe,
  obstructions,
  obstructionAt,
} from "./cabin";
import { seasonSounds } from "./season-sounds";
import { startLandscape } from "./landscape";
import { positionTile } from "./map-camera";
import {
  CAPACITY,
  COLS,
  coordinate,
  stockLabel,
  streamBank,
  distance,
  Homestead,
  land,
  openSite,
  quantity,
  wooded,
  type Point,
} from "./world";
import { openMarket, renderMarket } from "./market-panel";
const session = openScenario();
const market = openMarket();
const winter = openCampaign();
const campaign = winter?.campaign;
const trader = campaign?.market ?? market;
const spring = campaign?.market.spring ?? session?.spring;
const growingSeason = market?.spring ?? spring;
const game = trader?.game ?? session?.game ?? new Homestead();
const cabinControls = element("cabin-controls");
const cabinNext = element("cabin-next");
if (!(cabinControls instanceof HTMLFieldSetElement) || !(cabinNext instanceof HTMLButtonElement))
  throw new Error("Missing cabin construction controls");
let guidedCabin: Cabin | undefined;
const landscape = startLandscape(game, () => campaign?.season);
const sound = campaign && seasonSounds();
let haul: WorkOrder | undefined = winter?.haul ?? session?.haul;
let ticker: number | undefined;
function scenarioEnded() {
  return campaign?.ended ?? spring?.ended ?? false;
}
function stopTimer() {
  window.clearInterval(ticker);
  ticker = undefined;
}
function advanceHaul() {
  if (!haul) return;
  haul.advance(game);
  if (haul.finished || haul.paused) stopTimer();
  if (haul instanceof ClearArea && haul.finished) {
    game.preview = { ...haul.origin };
    game.planKind = "Cabin";
  }
  render();
}
function startHaul() {
  stopTimer();
  advanceHaul();
  if (haul && !haul.finished && !haul.paused) ticker = window.setInterval(advanceHaul, 320);
}
document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden ||
    (!spring && !(haul instanceof ClearArea)) ||
    !haul ||
    haul.finished ||
    haul.paused
  )
    return;
  haul.paused = true;
  stopTimer();
  render();
});
const haulToggle = button(element("haul-controls"), "Pause haul", () => {
  if (!haul || haul.finished) return;
  haul.paused = !haul.paused;
  if (haul.paused) {
    stopTimer();
    render();
  } else startHaul();
});
const cancelClearing = button(element("haul-controls"), "Cancel clearing", () => {
  haltHaul();
  game.message = "Clearing cancelled. Materials remain where the settler left them.";
  render();
});
function renderHaul() {
  element("haul").hidden = !haul;
  if (!haul) return;
  const clearing = haul instanceof ClearArea;
  cancelClearing.hidden = !clearing || !haul.paused;
  const status = haul.paused ? "Paused" : clearing ? "Clearing" : "Hauling";
  element("haul-summary").textContent =
    haul instanceof ClearArea
      ? `${haul.finished ? "Ready to reserve" : status} · Cabin site ${coordinate(haul.origin)} · Storage at ${coordinate(haul.storage)}`
      : `${haul.finished ? "Haul complete" : status} · ${haul.material} · ${coordinate(haul.source)} → ${coordinate(haul.cabin.origin)}`;
  const load = element("haul-load");
  element("haul-controls").hidden = haul.finished;
  load.textContent = `Settler at ${coordinate(game.position)} · ${stockLabel(game.load)}`;
  haulToggle.textContent = `${haul.paused ? "Resume" : "Pause"} ${clearing ? "clearing" : "haul"}`;
  haulToggle.disabled = game.planning || !!trader?.inTown;
}
const cells: HTMLButtonElement[] = [];
const tiles = element("tiles");
for (let y = 0; y < 7; y++)
  for (let x = 0; x < COLS; x++) {
    const p = { x, y },
      cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    positionTile(cell, p);
    cell.setAttribute("aria-label", coordinate(p));
    tiles.append(cell);
    cells.push(cell);
  }
function pointerTile(event: MouseEvent) {
  const object = game.planning ? undefined : landscape.pickObject(event);
  if (object) return cells[object.y * COLS + object.x];
  return event.target instanceof HTMLButtonElement ? event.target : undefined;
}
tiles.addEventListener("click", (event) => {
  if (game.night || scenarioEnded() || trader?.inTown || (market && !game.daylight)) return;
  const tile = event.detail ? pointerTile(event) : event.target;
  if (!(tile instanceof HTMLButtonElement)) return;
  const index = cells.indexOf(tile);
  const point = { x: index % COLS, y: Math.floor(index / COLS) };
  if (tile !== event.target) tile.focus({ preventScroll: true });
  if (game.planning) game.preview = point;
  else {
    game.selected = point;
    const cabin = game.cabins.find((c) => c.contains(point) && !c.complete);
    if (cabin) guidedCabin = cabin;
  }
  render();
});
let hovered: HTMLButtonElement | undefined;
function highlight(tile?: HTMLButtonElement) {
  if (hovered === tile) return;
  hovered?.classList.remove("hovered");
  hovered = tile;
  tile?.classList.add("hovered");
  tiles.title = tile?.getAttribute("aria-label") ?? "";
}
tiles.addEventListener("pointermove", (event) => highlight(pointerTile(event)));
tiles.addEventListener("pointerleave", () => highlight());
function siteName(p: Point) {
  for (const [site, name] of [
    [wooded, "Wooded site"],
    [openSite, "Open site"],
  ] as const)
    if (withinFootprint(site, p)) return name;
  return "Clearing";
}
element("build").onclick = () => {
  if (haul && !haul.finished) {
    haul.paused = true;
    stopTimer();
  }
  game.planning = !game.planning;
  render();
};
function renderMenu() {
  element("build").textContent =
    campaign && !game.cabins.length && game.planKind === "Cabin" && !game.planning
      ? "Build menu · Compare cabin sites"
      : "Build menu";
  const menu = element("plan-menu");
  menu.hidden = !game.planning;
  menu.replaceChildren();
  if (!game.planning) return;
  if (spring && springBuildMenu(menu, game, render, !!campaign)) return;
  const h = document.createElement("h2");
  h.textContent = "Cabin & stone hearth";
  menu.append(h);
  paragraph(menu, "Shelter for the night. The hearth burns split firewood.");
  paragraph(menu, `Recipe · ${recipe.logs} logs, ${recipe.stone} stone`);
  paragraph(menu, `Held · ${stockLabel(game.load)}`);
  paragraph(
    menu,
    `Shortfall · ${Math.max(0, recipe.logs - game.load.logs)} logs, ${Math.max(0, recipe.stone - game.load.stone)} stone`,
  );
  if (campaign && !game.cabins.length)
    paragraph(
      menu,
      "Clear the wooded site at D4 to gather timber and stone there, or make the longer haul to the open site at K4 and skip clearing.",
    );
  paragraph(menu, "Choose a site or click its top-left tile on the map. Daylight is paused.");
  for (const [name, site] of [
    ["Open site", openSite],
    ["Wooded site", wooded],
  ] as const)
    button(menu, name, () => {
      game.preview = { ...site };
      render();
    });
  paragraph(
    menu,
    `Footprint · ${coordinate(game.preview)} · ${footprint.width} × ${footprint.height} tiles`,
  );
  const blocked = obstructions(game, game.preview);
  const clearingSite =
    haul instanceof ClearArea && !haul.finished && !distance(game.preview, haul.origin);
  paragraph(
    menu,
    blocked.join(" / ") || (clearingSite ? "Clearing order in progress" : "Footprint clear"),
  );
  const tiles = footprintTiles(game.preview);
  if (
    !tiles.some((tile) => fixedObstruction(game, tile)) &&
    tiles.some((tile) => {
      const { timber, rawStone, stock } = game.plot(tile);
      return timber || rawStone || stock.logs || stock.stone;
    })
  ) {
    if (game.storage)
      paragraph(menu, `Haul logs and stone to storage at ${coordinate(game.storage)}.`);
    else if (
      campaign &&
      !withinFootprint(game.preview, game.position) &&
      !fixedObstruction(game, game.position) &&
      !game.plot(game.position).timber &&
      !game.plot(game.position).rawStone
    ) {
      paragraph(
        menu,
        "Stack the cleared timber and stone where you stand, or return to the clearing to mark another storage tile.",
      );
      button(menu, `Mark storage at ${coordinate(game.position)}`, () => {
        game.storage = { ...game.position };
        render();
      });
    } else {
      paragraph(
        menu,
        "To clear this site, return to the clearing, select an open tile and choose Mark storage area.",
      );
    }
    button(
      menu,
      "Clear area",
      () => {
        if (!game.storage) return;
        haul = new ClearArea({ ...game.preview }, game.storage);
        game.planning = false;
        startHaul();
      },
      !game.storage,
    );
  }
  button(
    menu,
    "Reserve footprint",
    () => {
      game.reserve();
      guidedCabin = game.cabins.at(-1);
      render();
      if (!element("cabin-guide").hidden) cabinNext.focus();
    },
    blocked.length > 0 || clearingSite,
  );
  button(menu, "Return to clearing", () => {
    game.planning = false;
    render();
  });
}
function haltHaul() {
  stopTimer();
  haul = undefined;
}
function restFromWork() {
  if (haul instanceof ClearArea) {
    stopTimer();
    if (!haul.finished) haul.paused = true;
  } else haltHaul();
}
function renderCabinGuide() {
  const guide = element("cabin-guide");
  if (!guidedCabin || guidedCabin.complete)
    guidedCabin = game.cabins.find((c) => !c.complete) ?? guidedCabin;
  const cabin = guidedCabin;
  guide.hidden =
    !cabin ||
    game.planning ||
    !!game.night ||
    scenarioEnded() ||
    !!trader?.inTown ||
    !!(haul && !haul.finished) ||
    (cabin.complete && !cabin.contains(game.selected));
  if (!cabin || guide.hidden) return;
  const { note, job } = nextCabinStep(game, cabin);
  const shortDay = job && job.minutes > game.daylight;
  element("cabin-stage").textContent =
    `Cabin at ${coordinate(cabin.origin)} · ${cabin.complete ? "Complete" : `Stage ${cabin.stage + 1} of 3`}`;
  element("cabin-heading").textContent = cabin.nextStage?.label ?? "Cabin complete";
  element("cabin-instruction").textContent = shortDay
    ? `${note} This step needs ${job.minutes} minutes of daylight. You have ${game.daylight} left.`
    : note;
  cabinControls.hidden = !job;
  if (!job) {
    cabinNext.onclick = null;
    return;
  }
  cabinNext.textContent = `${job.label} · ${job.minutes} min`;
  cabinNext.setAttribute("aria-label", `Next step · ${cabinNext.textContent}`);
  cabinNext.toggleAttribute("disabled", !!shortDay);
  cabinNext.onclick = () => {
    game.commit(job);
    game.selected = { ...game.position };
    render();
  };
}
function render() {
  if (
    haul instanceof ClearArea &&
    (haul.finished
      ? obstructions(game, haul.origin).length > 0
      : footprintTiles(haul.origin).some((tile) => fixedObstruction(game, tile)))
  )
    haltHaul();
  if (!campaign && spring && spring.day <= springDays) {
    const { cabin, well, stored } = harvestProgress(game);
    spring.won = cabin && well && stored > 0;
    if (spring.won) haltHaul();
  }
  if (!game.daylight && !market && !game.night && !scenarioEnded()) {
    restFromWork();
    if (campaign) campaign.rest();
    else if (spring) nextSpringDay(game, spring);
    else game.beginNight();
  }
  if (game.night || scenarioEnded()) haltHaul();
  element("build").hidden = !!market || !!game.night || scenarioEnded();
  element("field-notes").hidden = !!game.night || scenarioEnded();
  element("storage-key").hidden = !game.storage;
  renderMenu();
  renderHaul();
  renderCabinGuide();
  const p = game.selected,
    plot = game.plot(p);
  element("tile-title").textContent = `${siteName(p)} · ${coordinate(p)}`;
  const info = element("inspect");
  info.replaceChildren();
  const atStorage = game.storage && !distance(p, game.storage);
  if (atStorage) paragraph(info, "Storage area");
  if (spring && streamBank(p)) paragraph(info, "Stream bank · Draw water here.");
  if (growingSeason && plot.site?.kind === "Garden") {
    paragraph(info, "Garden");
    if (market && !market.sowingOpen && !plot.site.crop)
      paragraph(info, "Too late to finish sowing before sundown.");
    for (const note of gardenNotes(plot.site, growingSeason)) paragraph(info, note);
  }
  const plan = game.cabins.find((c) => c.contains(p));
  if (plot.site && plot.site.kind !== "Garden")
    for (const note of buildingNotes(plot.site, game.load, !!campaign)) paragraph(info, note);
  if (plan) {
    paragraph(info, `${plan.progress} · ${coordinate(plan.origin)}`);
    if (plan.complete)
      paragraph(
        info,
        `Hearth · ${plan.hearth.fuel} firewood · ${plan.hearth.lit ? "Lit" : "Unlit"}`,
      );
    paragraph(info, `Held · ${stockLabel(game.load)}`);
    paragraph(info, `Delivered · ${plan.delivered.logs} logs, ${plan.delivered.stone} stone`);
    paragraph(
      info,
      `Outstanding · ${plan.remaining("logs")} logs, ${plan.remaining("stone")} stone`,
    );
  }
  paragraph(
    info,
    plot.rawStone
      ? `Raw rock · Yields ${plot.rawStone} stone with a pickaxe`
      : (plot.timber ?? "Grassland"),
  );
  if (quantity(plot.stock)) paragraph(info, `On the ground · ${stockLabel(plot.stock)}`);
  const steps = distance(game.position, p);
  paragraph(
    info,
    steps
      ? `${steps} tiles away · ${game.pace} min per step`
      : `Settler is here · ${game.pace} min per step`,
  );
  const actions = element("actions");
  actions.replaceChildren();
  if (
    !market &&
    !game.planning &&
    !plot.timber &&
    !plot.rawStone &&
    !fixedObstruction(game, p) &&
    (!haul || haul.finished || (haul.paused && !(haul instanceof ClearArea)))
  ) {
    button(actions, game.storage ? "Move storage area here" : "Mark storage area", () => {
      game.storage = { ...p };
      if (haul instanceof ClearArea) haltHaul();
      game.message = `Storage area marked at ${coordinate(p)}.`;
      render();
    });
  }
  const jobs = game.jobs();
  if (!steps && growingSeason) jobs.push(...springJobs(game, growingSeason, market?.sowingOpen));
  if (!steps && campaign) jobs.push(...storeDrinkingWater(game));
  if (!steps && trader) jobs.push(...trader.jobs());
  if (!steps && plot.site && plot.site.kind !== "Garden")
    jobs.push(...buildingJobs(plot.site, game.load));
  for (const job of game.planning || (haul && !haul.paused && !haul.finished) ? [] : jobs)
    button(
      actions,
      `${job.label} · ${job.minutes} min`,
      () => {
        game.commit(job);
        render();
      },
      job.enabled === false || job.minutes > game.daylight,
    );
  if (!game.planning && (!haul || haul.finished || haul.paused) && !steps && !quantity(game.load)) {
    for (const cabin of game.cabins)
      for (const material of buildingMaterials) {
        if (!cabin.remaining(material) || !plot.stock[material]) continue;
        const route = new Haul({ ...p }, cabin, material);
        button(
          actions,
          `Repeat haul · ${material} to ${coordinate(cabin.origin)} · ${route.firstTripMinutes} min first load, ${route.repeatTripMinutes} min per repeat`,
          () => {
            haul = route;
            startHaul();
          },
          game.daylight < route.firstTripMinutes,
        );
      }
  }
  element("load").textContent = `${stockLabel(game.load)} (${quantity(game.load)}/${CAPACITY})`;
  element("clock").textContent =
    `${Math.floor(game.daylight / 60)}h ${String(game.daylight % 60).padStart(2, "0")}m`;
  if (campaign)
    renderCampaign(campaign, haul, render, () => {
      restFromWork();
      campaign.rest();
      render();
    });
  else if (market) renderMarket(market, render);
  else if (spring)
    renderSpring(game, spring, haul, () => {
      restFromWork();
      nextSpringDay(game, spring);
      render();
    });
  else renderNight(game, render, haltHaul, !!haul && !haul.paused && !haul.finished);
  element("message").textContent = game.message;
  for (const [i, cell] of cells.entries()) {
    cell.setAttribute("aria-pressed", String(i === p.y * COLS + p.x));
    const tile = { x: i % COLS, y: Math.floor(i / COLS) };
    const reason =
      game.planning && withinFootprint(game.preview, tile, planSize(game.planKind))
        ? obstructionAt(game, tile)
        : undefined;
    if (reason) cell.setAttribute("aria-description", `${reason} blocks this footprint`);
    else cell.removeAttribute("aria-description");
  }
  if (campaign && sound) sound(campaign);
  landscape.paint();
}
const directions: Record<string, Point> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
};
window.addEventListener("keydown", (event) => {
  if (trader?.inTown || (market && !game.daylight)) return;
  if (game.night || scenarioEnded() || game.planning || (haul && !haul.paused && !haul.finished))
    return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const delta = directions[event.key.toLowerCase()];
  if (!delta) return;
  event.preventDefault();
  const p = { x: game.position.x + delta.x, y: game.position.y + delta.y };
  if (land(p) && game.walk(p)) {
    game.selected = p;
    game.message = `Walked to ${coordinate(p)}`;
    render();
  }
});
render();
