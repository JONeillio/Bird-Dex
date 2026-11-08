# Runtime art (what the app loads)

Everything here is a converted copy of a draft in `research/art-drafts/`. Show sprites at whole-number scales with `image-rendering: pixelated`. Each folder has a lookup in `src/art/` so code never hard-codes paths.

| Folder | Contents | Size | Lookup | Source drafts |
| --- | --- | --- | --- | --- |
| `birds/<id>/` | bird portraits (12 real, rest generated in code) | 64x64 | `src/art/portraits.ts`, `draft-portraits.json` | `research/art-drafts/bold-pixel/` |
| `map/{markers,scenery,patterns}/` | pins, flag, trees, bushes, reeds, grass tile | native | `src/art/mapAssets.ts` | `.../bold-pixel/expansion-v1/` |
| `wardens/`, `scenes/` | Reserve Warden portraits and marsh scenes | 96 and @2x 192 | `src/art/wardens.ts` | `.../game-art/screenshot-crops/` |
| `npcs/` | 12 story NPC portraits | 256 and @2x 512 | `src/art/npcs.ts` | `research/art-drafts/npc-pack-v1/` |
| `stamps/` | Lifer, first of year, explored, new best, rank up, unexplored | 32x32 | `src/art/marks.ts` | `.../game-art/set-a-stamps-tiers/` |
| `tiers/` | Rarity tier marks 1-6 | 16x16 | `src/art/marks.ts` | `.../game-art/set-a-stamps-tiers/` |

Index of all draft sets: `research/art-drafts/game-art/README.md`. Style palette: `research/art-drafts/game-art/style/`.
