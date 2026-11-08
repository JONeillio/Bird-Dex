# Runtime art (what the app loads)

Everything here is a converted copy of a draft in `research/art-drafts/`. Show sprites at whole-number scales with `image-rendering: pixelated`. Each folder has a lookup in `src/art/` so code never hard-codes paths.

| Folder | Contents | Size | Lookup | Source drafts |
| --- | --- | --- | --- | --- |
| `birds/<id>/` | bird portraits (59 real after batch 05, rest generated in code) | 64x64 | `src/art/portraits.ts`, `draft-portraits.json` | `research/art-drafts/bold-pixel/` (anchors, `expansion-v1/`, `batch-01/`, `batch-02/`, `batch-03/` to `batch-05/` ...) |
| `map/{markers,scenery,patterns}/` | pins, flag, trees, bushes, reeds, grass tile | native | `src/art/mapAssets.ts` | `.../bold-pixel/expansion-v1/` |
| `wardens/`, `scenes/` | All 12 Reserve Warden portraits + unmet silhouette; two marsh scenes | 96 and @2x 192 | `src/art/wardens.ts` | `.../game-art/screenshot-crops/` (4 wardens, scenes) and `.../game-art/set-6-wardens/` (8 wardens, silhouette) |
| `npcs/` | 12 story NPCs x 3 dialogue portraits (`<id>`, `<id>_talk`, `<id>_delight`) | 256 and @2x 512 | `src/art/npcs.ts` (`npcArt`) | `research/art-drafts/npc-pack-v1/` and `.../game-art/set-c-portrait-expressions/` |
| `npcs/map/` | 12 NPC map sprite strips, 4 frames each | 192x64 (48x64 frames) | `src/art/npcs.ts` (`npcMapSprite`) | `.../game-art/set-b-npc-map-sprites/` |
| `keepsakes/` | 12 keepsake icons | 32x32 | `src/art/keepsakes.ts` | `.../game-art/set-d-keepsake-icons/` |
| `ui/dialogue/` | Dialogue box, nameplate, buttons, sheet frame, handle, arrow, dots | various, nine-slice | `src/art/dialogueKit.ts` | `.../game-art/set-e-dialogue-kit/` |
| `stamps/` | Lifer, first of year, explored, new best, rank up, unexplored | 32x32 | `src/art/marks.ts` | `.../game-art/set-a-stamps-tiers/` |
| `tiers/` | Rarity tier marks 1-6 | 16x16 | `src/art/marks.ts` | `.../game-art/set-a-stamps-tiers/` |

Index of all draft sets: `research/art-drafts/game-art/README.md`. Style palette: `research/art-drafts/game-art/style/`.
