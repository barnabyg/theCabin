import { obstructions } from "./cabin";
import { plans } from "./outbuilding";
import { button, paragraph } from "./ui";
import { coordinate, distance, stockLabel, type Homestead } from "./world";

export function springBuildMenu(menu: HTMLElement, game: Homestead, render: () => void) {
  for (const kind of ["Cabin", "Garden", "Well"] as const)
    button(menu, kind, () => {
      game.planKind = kind;
      game.preview = { ...game.position };
      render();
    });
  if (game.planKind === "Cabin") return false;
  const p = game.preview;
  const blocked = obstructions(game, p, { width: 1, height: 1 });
  if (game.planKind !== "Garden") {
    const kind = game.planKind;
    const plan = plans[kind];
    paragraph(menu, `${kind} · ${coordinate(p)} · 1 tile · ${plan.purpose}`);
    paragraph(menu, `Recipe · ${plan.amount} ${plan.material} · Held · ${stockLabel(game.load)}`);
    paragraph(menu, blocked.join(" / ") || "Footprint clear");
    button(
      menu,
      `Reserve ${kind.toLowerCase()}`,
      () => {
        game.plot(p).site = { kind, delivered: 0, complete: false };
        game.selected = { ...p };
        game.planning = false;
        render();
      },
      !!blocked.length,
    );
    return true;
  }
  paragraph(menu, `Garden · ${coordinate(p)} · 1 tile · Prepare soil with the spade`);
  paragraph(menu, blocked.join(" / ") || "Footprint clear");
  const cost = 6 + distance(game.position, p) * game.pace;
  paragraph(menu, `Walk and prepare · ${cost} min`);
  button(
    menu,
    "Prepare garden",
    () => {
      game.commit({
        label: "Prepare garden",
        minutes: cost,
        run: () => {
          game.position = { ...p };
          game.selected = { ...p };
          game.plot(p).site = { kind: "Garden" };
          game.planning = false;
        },
      });
      render();
    },
    !!blocked.length || cost > game.daylight,
  );
  return true;
}
