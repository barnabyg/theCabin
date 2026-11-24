import { obstructions } from "./cabin";
import { button, paragraph } from "./ui";
import { coordinate, distance, type Homestead } from "./world";

export function springBuildMenu(menu: HTMLElement, game: Homestead, render: () => void) {
  for (const kind of ["Cabin", "Garden"] as const)
    button(menu, kind, () => {
      game.planKind = kind;
      game.preview = { ...game.position };
      render();
    });
  if (game.planKind === "Cabin") return false;
  const p = game.preview;
  const blocked = obstructions(game, p, { width: 1, height: 1 });
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
