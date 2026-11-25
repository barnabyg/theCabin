import { dailyMinutes, harvestProgress, Spring, springDays } from "./spring";
import { growGardens } from "./garden";
import { saveKey, resumeSpring, saveSpring } from "./spring-save";
import { button, element, heading, paragraph } from "./ui";
import type { Homestead } from "./world";
import type { WorkOrder } from "./haul";

export function openScenario() {
  const link = element("scenario-link");
  const harvest = new URLSearchParams(location.search).get("scenario") === "harvest";
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(saveKey);
  } catch {
    // The player can still play with browser storage disabled.
  }
  if (!harvest) {
    if (saved) link.textContent = "Resume First harvest";
    return;
  }
  link.textContent = "One cold night";
  link.setAttribute("href", location.pathname);
  document.title = "The Cabin · First harvest";
  element("scenario-title").textContent = "First harvest";
  element("objective").textContent =
    "Build a cabin and well, then store a harvest in the pantry before frost.";
  for (const id of ["seed-label", "seeds"]) element(id).hidden = false;
  if (saved) {
    try {
      return resumeSpring(saved);
    } catch {
      element("message").textContent = "This spring save could not be opened.";
      const box = element("night");
      paragraph(box, "Your spring save could not be opened in this build.");
      button(box, "Discard save and start a fresh spring", restart);
      element("build").hidden = true;
      throw Error("Unreadable First harvest save");
    }
  }
  return { spring: new Spring(), game: undefined, haul: undefined };
}

function restart() {
  try {
    localStorage.removeItem(saveKey);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "SecurityError")) {
      element("message").textContent = "The browser could not remove the save.";
      return;
    }
  }
  location.reload();
}

export function renderSpring(
  game: Homestead,
  spring: Spring,
  haul: WorkOrder | undefined,
  rest: () => void,
) {
  element("calendar").textContent =
    spring.day > springDays
      ? "First frost"
      : `Spring · Day ${spring.day} of ${springDays} · Frost after day ${springDays}`;
  element("seeds").textContent = `${spring.seeds.turnip} turnip · ${spring.seeds.squash} squash`;
  const box = element("night");
  box.replaceChildren();
  box.hidden = game.planning;
  const { stored, cabin, well } = harvestProgress(game);
  if (spring.won) {
    heading(box, "Harvest secured");
    paragraph(box, `Your cabin and well are ready. You stored ${stored} portions before frost.`);
  } else if (spring.ended) {
    heading(box, "Retreat to town");
    if (!stored) paragraph(box, "Frost arrived with no harvest in the pantry.");
    if (!cabin) paragraph(box, "The cabin was unfinished at frost.");
    if (!well) paragraph(box, "The well was unfinished at frost.");
  } else {
    paragraph(
      box,
      `Cabin · ${cabin ? "Ready" : "Unfinished"} · Well · ${well ? "Ready" : "Unfinished"} · Pantry · ${stored} portions`,
    );
    button(
      box,
      `Rest until tomorrow · ${game.daylight} min`,
      rest,
      !!haul && !haul.finished && !haul.paused,
    );
  }
  button(box, "Save spring day", () => {
    try {
      saveSpring(game, spring, haul);
      element("message").textContent = "Spring day saved in this browser.";
    } catch {
      element("message").textContent = "The browser could not save this spring day.";
    }
  });
  button(box, "Start a fresh spring", () => {
    if (spring.ended || window.confirm("Discard this spring run and its save?")) restart();
  });
}

export function nextSpringDay(game: Homestead, spring: Spring) {
  growGardens(game.plots);
  spring.rest();
  game.daylight = spring.ended ? 0 : dailyMinutes;
  game.planning = false;
  game.message = spring.ended ? "First frost." : "A new spring day.";
}
