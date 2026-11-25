import { Campaign, campaignKey, winterDay } from "./campaign";
import { autumnRainDay } from "./firewood";
import type { Haul } from "./haul";
import { pantryReserves } from "./rations";
import { road } from "./market";
import { renderMerchant } from "./market-panel";
import { button, element, heading, paragraph } from "./ui";
import { coordinate, distance } from "./world";

function restart() {
  try {
    localStorage.removeItem(campaignKey);
  } catch (e) {
    if (!(e instanceof DOMException && e.name === "SecurityError")) {
      element("message").textContent = "The browser could not remove this save.";
      return;
    }
  }
  location.reload();
}

export function openCampaign() {
  const link = element("winter-link");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(campaignKey);
  } catch {
    // The campaign is playable without storage.
  }
  if (new URLSearchParams(location.search).get("scenario") !== "winter") {
    if (saved) link.textContent = "Resume First winter";
    return;
  }
  link.textContent = "One cold night";
  link.setAttribute("href", location.pathname);
  document.title = "The Cabin · First winter";
  element("scenario-title").textContent = "First winter";
  element("objective").textContent =
    "Reach the spring thaw. Buy seed in town, build shelter and stock food and fuel before winter.";
  element("seeds").hidden = element("seed-label").hidden = false;
  if (!saved) return { campaign: Campaign.start(), haul: undefined };
  try {
    return Campaign.resume(saved);
  } catch {
    paragraph(element("night"), "This campaign save could not be opened.");
    button(element("night"), "Discard save and start a fresh First winter", restart);
    throw Error("Unreadable First winter save");
  }
}

export function renderCampaign(
  campaign: Campaign,
  haul: Haul | undefined,
  render: () => void,
  rest: () => void,
) {
  const { market } = campaign;
  const { game, spring } = market;
  const box = element("night");
  const town = element("town");
  box.replaceChildren();
  town.replaceChildren();
  town.hidden = !market.inTown;
  element("map-panel").hidden = market.inTown;
  element("field-notes").hidden = market.inTown || campaign.ended;
  element("calendar").textContent =
    `${campaign.season} · Day ${spring.day} · Winter begins day ${winterDay}`;
  element("seeds").textContent = `${spring.seeds.turnip} turnip · ${spring.seeds.squash} squash`;
  element("purse").textContent = `${market.coins} coin${market.coins === 1 ? "" : "s"}`;
  if (!campaign.ended) {
    const { meals, drinks } = pantryReserves(game);
    paragraph(
      box,
      `Pantry reserves · ${meals} meal${meals === 1 ? "" : "s"} · ${drinks} drink${drinks === 1 ? "" : "s"} · Each winter night uses 1 portion and 1 water.`,
    );
    if (spring.day >= winterDay) {
      if (!meals)
        paragraph(
          box,
          `${campaign.rations.hungry ? "Hungry after a missed meal. Another missed meal forces retreat." : "No meal for tonight."} Store food in a finished pantry before resting.`,
        );
      if (!drinks)
        paragraph(
          box,
          `${campaign.rations.thirsty ? "Thirsty after a missed drink. Another missed drink forces retreat." : "No drinking water for tonight."} Fetch stream or well water and store it in a finished pantry before resting.`,
        );
    }
    if (spring.day <= autumnRainDay) {
      const forecast =
        spring.day === autumnRainDay ? "Rain tonight" : `Rain forecast for day ${autumnRainDay}`;
      paragraph(
        box,
        `${forecast} · One piece of firewood in each outdoor ground stack will spoil. Store split wood in a covered woodpile to keep it dry.`,
      );
    }
    if (market.inTown) renderMerchant(town, market, render);
    else
      paragraph(
        box,
        `Town road at ${coordinate(road)} · 30 min each way, double with a load. Trapline at I7.`,
      );
    const busy = !!haul && !haul.finished && !haul.paused;
    if (market.inTown || (!distance(game.position, road) && !distance(game.selected, road)))
      button(
        market.inTown ? town : element("actions"),
        `${market.inTown ? "Walk home" : "Walk to town"} · ${market.roadMinutes} min`,
        () => {
          market.travel();
          render();
        },
        busy || game.planning || game.daylight < market.roadMinutes,
      );
    button(box, `Rest until tomorrow · ${game.daylight} min`, rest, busy || game.planning);
  } else if (campaign.retreat) {
    heading(box, "Retreat to town");
    paragraph(
      box,
      `Two nights without ${campaign.retreat === "hunger" ? "food" : "drinking water"} forced a retreat from ${campaign.retreat}.`,
    );
  } else heading(box, "Spring thaw");
  button(box, "Save First winter", () => {
    try {
      campaign.save(haul);
      element("message").textContent = "First winter saved in this browser.";
    } catch {
      element("message").textContent = "The browser could not save this campaign.";
    }
  });
  button(box, "Start a fresh First winter", () => {
    if (campaign.ended || window.confirm("Discard this campaign and its save?")) restart();
  });
}
