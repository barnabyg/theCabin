# The Cabin

A single-player, top-down homesteading game set near a fictional river town in the Illinois Country around 1750.

## Play

Install Node.js 24.13 or later with npm. From the repository root (for example `C:/docs/git/theCabin`), run this in PowerShell:

```powershell
npm.cmd run play
```

Open http://127.0.0.1:5173 in a desktop browser. The command installs locked dependencies and starts the local game. Use Ctrl+C to stop.

Click the tree at D4 in the wooded site and choose **Walk here**, then **Fell tree**. The stump and four logs remain. Pick up two logs, walk one tile east with the right arrow, and set down the load. You should see two logs on E4 and two still on D4. A loaded step costs two minutes, an empty step one. Select a distant tile to preview the whole trip. Time advances only on committed actions.

Open **Build menu** to compare sites. The open footprint at K4 is clear. The wooded footprint at D4 needs the tree felled, its stump dug out, and the stone at E5 gathered. Return to the clearing to work, then reopen the menu to reserve the same footprint.

To prepare firewood, stand on gathered logs or carry them. Choose **Split 1 log** to spend four minutes making two pieces of firewood. A double batch takes eight minutes. The settler uses carried logs first and stacks the firewood on the ground. Select **Pick up firewood** to carry up to two pieces.

Reserve a cabin and fell the tree at D4. Choose **Repeat haul** to ferry logs to the blueprint. **Pause haul** holds the settler and load in place, and **Resume haul** continues the route. Deliver four logs and two stone in all. At the footprint, lay the floor, raise the walls and fit the roof and hearth. Each stage remains visible while you fetch the next load.

## Verify

After `npm ci` and `npx playwright install chromium`, run `npm run verify`. Biome checks formatting, lint and static diagnostics, TypeScript checks types, and Playwright drives the same controls available to the player. Verification also audits the locked dependencies, scans the project for secrets, checks package contents, and builds the static game in `dist/`. CI installs the Chromium system dependencies on Linux.
