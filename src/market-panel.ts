import { Market, marketKey, marketRules, road, saleOffers, trapline } from "./market";
import { button, element, heading, paragraph } from "./ui";
import { coordinate, distance } from "./world";

function restart(penniless = false) {
  try {
    localStorage.removeItem(marketKey);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "SecurityError")) {
      element("message").textContent = "The browser could not remove the market save.";
      return;
    }
  }
  const url = new URL(location.href);
  if (penniless) url.searchParams.set("purse", "empty");
  else url.searchParams.delete("purse");
  location.assign(url);
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
  if (!saved) return Market.start(new URLSearchParams(location.search).get("purse") === "empty");
  try {
    return Market.resume(saved);
  } catch {
    const box = element("night");
    paragraph(box, "This market save could not be opened.");
    button(box, "Discard save and start a fresh market day", () => restart());
    throw Error("Unreadable Market day save");
  }
}

function showOrder(town: HTMLElement, market: Market, render: () => void) {
  const { firewood, payment } = marketRules.order;
  heading(town, "Firewood order");
  if (market.order === "paid") {
    paragraph(town, `Order paid · ${firewood} firewood delivered for ${payment} coins.`);
  } else if (market.order === "offered") {
    button(town, `Take order · ${firewood} firewood for ${payment} coins · no fee`, () => {
      market.order = "accepted";
      market.game.message = "Bring split firewood to the merchant.";
      render();
    });
  } else {
    button(
      town,
      `Deliver ${firewood} firewood · receive ${payment} coins`,
      () => {
        market.deliverFirewood();
        market.game.message = "The merchant paid for the firewood.";
        render();
      },
      market.game.load.firewood < firewood,
    );
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
    const reasons = market.outcome;
    heading(box, reasons.length ? "Retreat to town" : "Sowing secured");
    for (const reason of reasons) paragraph(box, reason);
    if (!reasons.length) paragraph(box, "Your turnips are sown and the pantry reserve is intact.");
    if (market.inTown) heading(town, "River town at sundown");
  } else if (market.inTown) {
    heading(town, "River town merchant");
    paragraph(
      town,
      `${market.seedStock} turnip seed${market.seedStock === 1 ? "" : "s"} in stock · ${marketRules.seedPrice} coins each`,
    );
    button(town, `Buy 1 turnip seed · ${marketRules.seedPrice} coins`, () => {
      game.message = market.buySeed();
      render();
    });
    paragraph(
      town,
      `Food portions purchased · ${market.purchased.food} · Furs purchased · ${market.purchased.fur}`,
    );
    for (const offer of saleOffers)
      button(
        town,
        `Sell 1 ${offer.material} · ${offer.price} coins`,
        () => {
          market.sell(offer);
          game.message = `Sold 1 ${offer.material}.`;
          render();
        },
        !game.load[offer.material],
      );
    showOrder(town, market, render);
    walk(town, "Walk home");
  } else {
    paragraph(
      box,
      `Town road at ${coordinate(road)} · ${marketRules.roadMinutes} min each way, double with a load. Pantry at F6, garden at G6, trapline at ${coordinate(trapline)}.`,
    );
    if (!distance(game.selected, road) && !distance(game.position, road))
      walk(element("actions"), "Walk to town");
  }
  if (!ended)
    button(box, `Wait until sundown · ${game.daylight} min`, () => {
      game.daylight = 0;
      game.message = "Sundown on the sowing day.";
      render();
    });
  button(box, "Save market day", () => {
    try {
      market.save();
      element("message").textContent = "Market day saved in this browser.";
    } catch {
      element("message").textContent = "The browser could not save this market day.";
    }
  });
  for (const [label, penniless] of [
    ["Start a fresh market day", false],
    ["Start with an empty purse", true],
  ] as const)
    button(box, label, () => {
      if (ended || window.confirm("Discard this market day and its save?")) restart(penniless);
    });
}
