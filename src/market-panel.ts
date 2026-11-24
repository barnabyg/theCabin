import { Market, marketKey, marketRules, road } from "./market";
import { button, element, heading, paragraph } from "./ui";
import { coordinate, distance } from "./world";

function restart() {
  try {
    localStorage.removeItem(marketKey);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "SecurityError")) {
      element("message").textContent = "The browser could not remove the market save.";
      return;
    }
  }
  location.reload();
}

export function openMarket() {
  const link = element("market-link");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(marketKey);
  } catch {
    // Market day remains playable when storage is disabled.
  }
  if (new URLSearchParams(location.search).get("scenario") !== "market") {
    if (saved) link.textContent = "Resume Market day";
    return;
  }
  link.textContent = "One cold night";
  link.setAttribute("href", location.pathname);
  document.title = "The Cabin · Market day";
  element("scenario-title").textContent = "Market day";
  element("objective").textContent =
    `Sow turnip seed before sundown and keep at least ${marketRules.reserve} portions in the pantry.`;
  element("seed-label").hidden = element("seeds").hidden = false;
  if (!saved) return Market.start();
  try {
    return Market.resume(saved);
  } catch {
    const box = element("night");
    paragraph(box, "This market save could not be opened.");
    button(box, "Discard save and start a fresh market day", restart);
    throw Error("Unreadable Market day save");
  }
}

export function renderMarket(market: Market, render: () => void) {
  const { game, spring } = market;
  const ended = !game.daylight;
  element("calendar").textContent = "Market day · Sowing deadline at sundown";
  element("purse").textContent = `${market.coins} coin${market.coins === 1 ? "" : "s"}`;
  element("seeds").textContent = `${spring.seeds.turnip} turnip`;
  element("map-panel").hidden = market.inTown;
  element("field-notes").hidden = market.inTown || ended;
  const town = element("town");
  town.hidden = !market.inTown;
  town.replaceChildren();
  const box = element("night");
  box.replaceChildren();
  const walk = (parent: HTMLElement, label: string) =>
    button(
      parent,
      `${label} · ${market.roadMinutes} min`,
      () => {
        market.travel();
        render();
      },
      game.daylight < market.roadMinutes,
    );
  if (ended) {
    heading(box, "Sowing deadline reached");
  } else if (market.inTown) {
    heading(town, "River town merchant");
    paragraph(
      town,
      `${market.seedStock} turnip seeds in stock · ${marketRules.seedPrice} coins each`,
    );
    button(town, `Buy 1 turnip seed · ${marketRules.seedPrice} coins`, () => {
      game.message = market.buySeed();
      render();
    });
    walk(town, "Walk home");
  } else {
    paragraph(
      box,
      `Town road at ${coordinate(road)} · ${marketRules.roadMinutes} min each way, double with a load. Pantry at F6, garden at G6.`,
    );
    if (!distance(game.selected, road) && !distance(game.position, road))
      walk(element("actions"), "Walk to town");
  }
  button(box, "Save market day", () => {
    try {
      market.save();
      element("message").textContent = "Market day saved in this browser.";
    } catch {
      element("message").textContent = "The browser could not save this market day.";
    }
  });
  button(box, "Start a fresh market day", () => {
    if (ended || window.confirm("Discard this market day and its save?")) restart();
  });
}
