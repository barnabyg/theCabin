import { button, element, heading, paragraph } from "./ui";
import type { Homestead } from "./world";
function reserveCount(load: number, stacks: { firewood: number }[]) {
  return stacks.reduce((sum, stock) => sum + stock.firewood, load);
}
export function renderNight(
  game: Homestead,
  render: () => void,
  haltHaul: () => void,
  busy: boolean,
) {
  const box = element("night");
  box.replaceChildren();
  box.hidden = game.planning;
  const night = game.night;
  document.body.classList.toggle("after-dark", !!night && !night.outcome);
  if (!night) {
    heading(box, "Before nightfall");
    const shelter = game.shelter;
    if (shelter) {
      const ready =
        shelter.hearth.fuel + reserveCount(game.load.firewood, game.cabinStacks(shelter));
      paragraph(
        box,
        ready < 4
          ? `Short by ${4 - ready} firewood for four lit watches. Split more logs or bring firewood inside before nightfall.`
          : "Enough fuel for all four watches. Add firewood and light the hearth.",
      );
    } else paragraph(box, "Stand inside a finished cabin with 4 split firewood before nightfall.");
    button(
      box,
      `Wait for nightfall · ${game.daylight} min`,
      () => {
        haltHaul();
        game.beginNight();
        render();
      },
      busy,
    );
    return;
  }
  element("clock-label").textContent = night.outcome ? "FIRST NIGHT" : "NIGHT WATCH";
  element("clock").textContent = night.outcome
    ? night.outcome === "dawn"
      ? "Daybreak"
      : "Retreat"
    : `${night.watch + 1} of 4`;
  if (night.outcome) {
    heading(box, night.outcome === "dawn" ? "Dawn at the cabin" : "Retreat to town");
    paragraph(
      box,
      night.outcome === "dawn"
        ? "First light reaches the river. Your shelter kept you warm enough to stay."
        : night.shelter
          ? "The hearth gave too little heat. The cold forced you to leave for town."
          : "Without a finished shelter here, the cold forced you to leave for town.",
    );
    button(box, "Start again at daybreak", () => window.location.reload());
    return;
  }
  heading(box, "Night watch");
  const hearth = night.shelter?.hearth;
  paragraph(
    box,
    `Air · ${String(night.temperature).replace("-", "−")} °C · Warmth · ${night.warmth}/3`,
  );
  if (hearth && night.shelter) {
    const stocks = game.cabinStacks(night.shelter);
    const reserve = reserveCount(game.load.firewood, stocks);
    paragraph(box, `Hearth · ${hearth.fuel} firewood · ${hearth.lit ? "Lit" : "Unlit"}`);
    paragraph(box, `Reserve · ${reserve} firewood within reach`);
    if (!hearth.lit)
      paragraph(
        box,
        hearth.fuel
          ? "Cold hearth. Light the fuel before the next watch."
          : reserve
            ? "Cold hearth. Add split firewood and light it before the next watch."
            : "Cold hearth. Your split firewood is exhausted.",
      );
    else if (hearth.fuel <= 1 && night.watchesLeft > hearth.fuel)
      paragraph(
        box,
        reserve
          ? "Low fuel. Add a piece from your reserve before the hearth goes out."
          : "Low fuel. The last piece is burning.",
      );
    for (const job of hearth.tending(game.load, stocks, 0))
      button(
        box,
        job.label,
        () => {
          job.run();
          render();
        },
        job.enabled === false,
      );
  } else paragraph(box, "Exposed to the cold. There is no finished cabin at this tile.");
  paragraph(box, "Each watch burns 1 firewood. A cold watch costs 2 warmth.");
  button(box, "Keep watch · 3 hours", () => {
    night.keepWatch();
    render();
  });
}
