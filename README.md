# Valheim Checkup

A Valheim achievement collection tracker that reads character saves locally in the browser.

## Use the tracker

Open the GitHub Pages website and choose **Load character**, then select a recent `.fch` file. You can also download `index.html` and open it directly in a modern browser for offline use. No installation is required.

- Completed, missing, undiscovered, and unverified totals
- Crafting, building, cooking, eating, trophies, fish, and creature checklists
- Separate any-difficulty and Hard-or-higher hunting lists
- Search, biome and status filters, alphabetical or workbook order
- Pins, manual corrections, and local progress restoration
- JSON progress export/import and filtered-list CSV export
- Achievement-credit and lifetime-action views

## Privacy

Character saves are never uploaded. The app has no backend, analytics, or account requirement. Extracted progress, pins, and corrections are stored only in your browser. It never modifies saves or Steam achievements. Exported progress files contain character information; keep them private unless you intend to share them.

Loading a file replaces the automatic snapshot for that character while preserving saved corrections and pins. Load again after playing to refresh progress. Export/import is needed when moving between browsers or website origins.

## Supported saves and catalog

The importer supports profile **46**, player data **33**, and inventory **109**. It validates SHA-512 and consumes the complete profile and embedded player data. Unsupported or damaged files are rejected without replacing loaded progress.

The catalog preserves the community workbook's 108 creatures, 68 trophies, 82 cooked dishes, 415 crafting entries, 400 building entries, 97 edible items, and 12 fish. Collection targets overlap. Seven building entries need manual verification: four roof variants share display names, and three storage-display names have unresolved mappings. These appear as **Unverified**, separately from **Missing**.

**Undiscovered** means an item is absent from the character's known recipes/materials and has no matching action in the selected record. It does not mean the achievement is hidden, and the app does not evaluate all recipe prerequisites.

## Develop

Node.js 20 or newer is sufficient; there are no npm dependencies.

```sh
node scripts/build.cjs
node --check src/core.js
node --check src/app.js
```

Edit files in `src/`, rebuild, then commit the updated `index.html`. GitHub Pages can serve the committed file directly from the main branch root.

## Sources and attribution

- [Tudzer's community achievement tracker](https://docs.google.com/spreadsheets/d/1Hc167FeYYJlXQUui1SCOazS0LH-6N3wpdy4UAz7-wZw/edit) and [Steam achievement guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3799211007)
- [Jötunn English localization reference](https://valheim-modding.github.io/Jotunn/data/localization/translations/English.html)
- [Valheim wiki achievements](https://valheim.weirdgloop.org/w/Achievements)
- Supplemental identifiers and save semantics verified from installed Valheim game files

Unofficial fan tool. Valheim and its game data belong to Iron Gate AB. No character saves, exported player progress, game binaries, or personal test data are included in this repository.
