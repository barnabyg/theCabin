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
const cells: HTMLButtonElement[] = [];
for (let y = 0; y < 7; y++)
  for (let x = 0; x < COLS; x++) {
    const p = { x, y },
      cell = button(element("tiles"), "", () => {
        game.selected = p;
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
function render() {
  const p = game.selected,
    plot = game.plot(p);
  element("tile-title").textContent = `${siteName(p)} · ${coordinate(p)}`;
  const info = element("inspect");
  info.replaceChildren();
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
  for (const job of game.jobs())
    button(
      actions,
      `${job.label} · ${job.minutes} min`,
      () => {
        game.commit(job);
        render();
      },
      job.enabled === false || job.minutes > game.daylight,
    );
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
