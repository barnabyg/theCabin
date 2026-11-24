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

## Survive the first night

1. Reserve the open site at K4. Fell the tree at D4 and repeat-haul its four logs to K4. Pick up two stone at E5, walk to K4 and deliver them.
2. At K4 choose **Lay floor**, **Raise walls**, then **Fit roof and hearth**. Fell the tree at C4 and carry two of its logs back to K4. **Split 2 logs** produces four firewood on the cabin floor.
3. **Add firewood** once, **Light hearth**, then **Wait for nightfall** while inside the cabin. With one piece burning, the low-fuel warning appears. Add the other three pieces over the four watches. Each lit watch burns one piece. Keeping warm through the fourth watch reaches **Dawn at the cabin**.
4. Choose **Start again at daybreak**. For the wooded route, fell D4, clear its stump, gather the stone at E5, then reserve D4. Deliver the stone and pick up and deliver the logs at the footprint. Build and tend the hearth as above. The same timber travels seven loaded steps to the open site and zero to the wooded site.
5. For the retreat ending, finish either cabin and wait for nightfall inside with an empty hearth. Two cold watches exhaust your warmth. **Start again** restores the original clearing, tools, purse and daylight.

## First harvest

From the repository root run `npm.cmd run play` with Node.js 24.13 or later, then open http://127.0.0.1:5173 and choose **First harvest**. The spring scenario lasts six working days. Resting spends the remaining daylight. Each morning restores six hours for travel and labour.

Reserve the open cabin site at K4, deliver two logs, and choose **Rest until tomorrow**. Pick up the stone at E5 and choose **Save spring day**. Close the browser, reopen the same address in the same browser profile, and choose **Resume First harvest**. You should be at E5 on day two with two stone, and K4 should still show two delivered logs. Finish the cabin or rest through day six to see the frost ending. **Start a fresh spring** discards the saved run.

For a first harvest of turnips, open **Build menu**, select **Garden**, then **Prepare garden** at G6. Sow turnip seed, draw water on the stream bank at G7, walk back to G6, water the crop and rest. Repeat the watering and rest on the second day. Harvest on day three to leave two edible portions on the garden tile.

To replace the stream trip, reserve a **Well** on H6. The stone pile at F3 holds four stone. Deliver two, save, and close and reopen the browser. The blueprint should show two delivered and two outstanding. Fetch the remaining pair, deliver them, finish the well, then draw water and carry it one tile to the garden.

## Verify

From the repository root, run these commands in PowerShell:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run verify
```

Biome checks formatting, lint and static diagnostics, TypeScript checks types, and Playwright drives the same controls available to the player. Verification also audits the locked dependencies, scans the project for secrets, checks package contents, and builds the static game in `dist/`. CI installs the Chromium system dependencies on Linux.
