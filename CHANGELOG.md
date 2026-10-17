# 1.2.1 — Valheim 1.0.20 save compatibility

- Support profile 47, player data 34, and inventory 110 alongside existing formats.
- Consume the two new Int32 key/value tables after build UI data; inventory byte layout remains compatible.
- Profile 47 progress exports restore correctly.
- Keep SHA-512 integrity, record-count and full-layout checks; unknown future versions still fail safely.
- Regression fixtures cover both format generations without publishing personal saves.

# 1.2 — Character insights and interface refresh

- Header profile, import time, global lifetime counters, icon import/export controls, and click/drop character upload.
- Collection pages with status row colors, unverified tooltips, starred filters, search last, and hover/focus completion percentages.
- Bottom-right notifications dismiss after ten seconds; collection-specific explanations sit below the description.
- Details opens with its button, row double-click, or row context click. It compares credited/lifetime records and cooking/eating, and provides explicit correction buttons and private notes.
- Up to six favorite counts in the header: drag a row onto the header or use the Details button. Stars, notes, and favorites persist locally and in JSON exports.
- Highlights ranks the 20 largest lifetime action counts, deduplicating repeated identifiers across collections. Activities have different meanings; this is not a player score.
- Skills & travel shows fractional skill levels, XP toward the next level, movement counters, and work/survival records.
- The death-loss sandbox is a hypothetical reversal, not recovered history. Death timing, intervening skill gains, skill-drain protection, and world settings cannot be reconstructed. No separate sneak/swim distance counters exist in this format. Building counts cannot determine Crafting skill.
- Sidebar counts ease from the previous snapshot after reimport, with reduced-motion support.
- Version-1 progress exports still work. Reimport .fch for skill data, which old snapshots discarded.
- 63 missing biome tags inherited from identical item identifiers in the community catalog. Automated wiki requests returned HTTP 403; remaining missing biomes stay Unknown.
- Local notes only; public commenting was deferred by user preference.

Run `node scripts/test.cjs` for regression tests. The fixture is synthetic and contains no player data.
