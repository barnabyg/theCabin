import type { Campaign } from "./campaign";
import { ordinaryNightFuel } from "./firewood";
import { element } from "./ui";
import spring from "./art/spring.mp3";
import summer from "./art/summer.mp3";
import rain from "./art/rain.mp3";
import winter from "./art/winter.mp3";
import cold from "./art/cold.mp3";
import thaw from "./art/thaw.mp3";

const seasonalClips = { Spring: spring, Summer: summer, Autumn: rain, Winter: winter, Thaw: thaw };

export function seasonSounds() {
  const toggle = element("season-sounds");
  const player = new Audio();
  player.preload = "none";
  player.volume = 0.5;
  toggle.after(player);
  toggle.hidden = false;
  const preference = "the-cabin.muted";
  try {
    player.muted = localStorage.getItem(preference) === "true";
  } catch {
    // A browser without storage can still mute the current session.
  }
  let clip = "";
  let played = "";
  function play() {
    if (
      !clip ||
      clip === played ||
      player.muted ||
      navigator.userActivation?.hasBeenActive === false
    )
      return;
    played = clip;
    player.src = clip;
    const requested = clip;
    void player.play().catch(() => {
      if (played === requested) played = "";
    });
  }
  function showToggle() {
    toggle.textContent = player.muted ? "Sound off" : "Sound on";
    toggle.setAttribute("aria-pressed", String(!player.muted));
  }
  showToggle();
  toggle.onclick = () => {
    player.muted = !player.muted;
    player.pause();
    played = "";
    showToggle();
    try {
      localStorage.setItem(preference, String(player.muted));
    } catch {
      // The in-memory preference still applies.
    }
    play();
  };
  // Browsers may only start audio after a user gesture, including on a restored day.
  document.addEventListener("click", play);
  document.addEventListener("keydown", (event) => {
    if (event.target !== toggle) play();
  });
  return (campaign: Campaign) => {
    clip = campaign.fuelTonight > ordinaryNightFuel ? cold : seasonalClips[campaign.season];
    play();
  };
}
