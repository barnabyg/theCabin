import { Haul } from "./haul";
import { buildingMaterials, recipe, obstructions } from "./cabin";
import { startLandscape } from "./landscape";
import {
  CAPACITY,
  COLS,
  coordinate,
  stockLabel,
  distance,
  Homestead,
  land,
  openSite,
  quantity,
  wooded,
  type Point,
} from "./world";
const game = new Homestead();
const paint = startLandscape(game);
function element(id: string) {
  const el = document.getElementById(id);
  if (!el) throw Error(`Missing element ${id}`);
  return el;
}
function paragraph(parent: HTMLElement, content: string) {
  const p = document.createElement("p");
  p.textContent = content;
  parent.append(p);
}
function button(parent: HTMLElement, label: string, click: () => void, disabled = false) {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = click;
  parent.append(b);
  return b;
}
let haul: Haul | undefined;
let ticker: number | undefined;
function stopTimer() {
  window.clearInterval(ticker);
  ticker = undefined;
}
function advanceHaul() {
  if (!haul) return;
  haul.advance(game);
  if (haul.finished || haul.paused) stopTimer();
  render();
}
function startHaul() {
  stopTimer();
  advanceHaul();
  if (haul && !haul.finished && !haul.paused) ticker = window.setInterval(advanceHaul, 320);
}
function renderHaul() {
  const box = element("haul");
  box.replaceChildren();
  box.hidden = !haul;
  if (!haul) return;
  const trip = haul;
  paragraph(
    box,
    `${trip.finished ? "Haul complete" : trip.paused ? "Paused" : "Hauling"} · ${trip.material} · ${coordinate(trip.source)} → ${coordinate(trip.cabin.origin)}`,
  );
  if (trip.finished) return;
  paragraph(box, `Settler at ${coordinate(game.position)} · ${stockLabel(game.load)}`);
  button(
    box,
    trip.paused ? "Resume haul" : "Pause haul",
    () => {
      trip.paused = !trip.paused;
      if (trip.paused) {
        stopTimer();
        render();
      } else startHaul();
    },
    game.planning,
  );
}
const cells: HTMLButtonElement[] = [];
for (let y = 0; y < 7; y++)
  for (let x = 0; x < COLS; x++) {
    const p = { x, y },
      cell = button(element("tiles"), "", () => {
        if (game.planning) game.preview = p;
        else game.selected = p;
        render();
      });
    cell.className = "cell";
    cell.setAttribute("aria-label", coordinate(p));
    cell.title = coordinate(p);
    cells.push(cell);
  }
function siteName(p: Point) {
  for (const [site, name] of [
    [wooded, "Wooded site"],
    [openSite, "Open site"],
  ] as const)
    if (p.x >= site.x && p.x < site.x + 3 && p.y >= site.y && p.y < site.y + 2) return name;
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
  const menu = element("plan-menu");
  menu.hidden = !game.planning;
  menu.replaceChildren();
  if (!game.planning) return;
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
  paragraph(menu, "Choose a site or click its top-left tile on the map. Daylight is paused.");
  for (const [name, site] of [
    ["Open site", openSite],
    ["Wooded site", wooded],
  ] as const)
    button(menu, name, () => {
      game.preview = { ...site };
      render();
    });
  paragraph(menu, `Footprint · ${coordinate(game.preview)} · 3 × 2 tiles`);
  const blocked = obstructions(game, game.preview);
  paragraph(menu, blocked.join(" / ") || "Footprint clear");
  button(
    menu,
    "Reserve footprint",
    () => {
      game.reserve();
      render();
    },
    blocked.length > 0,
  );
  button(menu, "Return to clearing", () => {
    game.planning = false;
    render();
  });
}
function render() {
  renderMenu();
  renderHaul();
  const p = game.selected,
    plot = game.plot(p);
  element("tile-title").textContent = `${siteName(p)} · ${coordinate(p)}`;
  const info = element("inspect");
  info.replaceChildren();
  const plan = game.cabins.find((c) => c.contains(p));
  if (plan) {
    paragraph(info, `${plan.progress} · ${coordinate(plan.origin)}`);
    paragraph(info, `Held · ${stockLabel(game.load)}`);
    paragraph(info, `Delivered · ${plan.delivered.logs} logs, ${plan.delivered.stone} stone`);
    paragraph(
      info,
      `Outstanding · ${plan.remaining("logs")} logs, ${plan.remaining("stone")} stone`,
    );
  }
  paragraph(info, plot.timber ?? "Grassland");
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
  for (const job of game.planning || (haul && !haul.paused && !haul.finished) ? [] : game.jobs())
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
        const travel = distance(p, cabin.origin);
        button(
          actions,
          `Repeat haul · ${material} to ${coordinate(cabin.origin)} · ${travel * 2 + 2} min first load, ${travel * 3 + 2} min per repeat`,
          () => {
            haul = new Haul({ ...p }, cabin, material);
            startHaul();
          },
          game.daylight < travel * 2 + 2,
        );
      }
  }
  element("load").textContent = `${stockLabel(game.load)} (${quantity(game.load)}/${CAPACITY})`;
  element("clock").textContent =
    `${Math.floor(game.daylight / 60)}h ${String(game.daylight % 60).padStart(2, "0")}m`;
  element("message").textContent = game.message;
  for (const [i, cell] of cells.entries())
    cell.setAttribute("aria-pressed", String(i === p.y * COLS + p.x));
  paint();
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
  if (game.planning || (haul && !haul.paused && !haul.finished)) return;
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
