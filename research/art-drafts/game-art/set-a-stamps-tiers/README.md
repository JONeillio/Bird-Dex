# Game art Set A: stamps and rarity tiers

Arrived 8 Nov 2026 (ZIP from Joseph, made with an image tool from `game-art-brief` style rules and `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved. These files are already at their final pixel size (no 1254 px master exists), so the runtime copies are identical.

- Originals + `asset_manifest.json`: this folder.
- Runtime copies: `public/assets/stamps/` (32x32) and `public/assets/tiers/` (16x16).
- Code lookup: `src/art/marks.ts` (`STAMPS`, `TIER_MARKS`, `tierMarkFor`). Test: `tests/marks.test.ts`.

Each file is 4 colours (outline `#1A1411`-style near-black, base, light, shade) with binary alpha. Show at whole-number scales only, `image-rendering: pixelated`.

## Stamps (32x32)

| File | Meaning | Colour | Intended use (AUTOPILOT) |
| --- | --- | --- | --- |
| `stamp_lifer.png` | Star: first ever sighting of a species | coral | N2/N5 Field Report: bird rows and headline |
| `stamp_first_of_year.png` | Calendar with leaf: first of the calendar year | deep water | N2/N5 Field Report, B4 year list |
| `stamp_explored.png` | Flag on a hill: you have birded this site | coral | N7 map pins, site sheet, region % |
| `stamp_new_best.png` | Laurel with +1: most species at this site yet | deep water | N5 Field Report "site best" |
| `stamp_rank_up.png` | Arrow with sparkle: a bird's Bond rank rose | coral | C2 rank-up reveal, Field Report |
| `stamp_unexplored.png` | "?" in a dashed circle: not visited yet | deep water | N7 unexplored pins, warden silhouettes |

## Rarity tier marks (16x16, shape AND colour, so colour is never the only signal)

| File | Tier | Shape | Colour | Engine tier (`src/domain/rarity.ts`) |
| --- | --- | --- | --- | --- |
| `tier_1_common.png` | 1 Common | circle | sage | `common` |
| `tier_2_fairly_common.png` | 2 Fairly common | diamond | water | `fairly-common` |
| `tier_3_uncommon.png` | 3 Uncommon | triangle | deep water | `uncommon` |
| `tier_4_scarce.png` | 4 Scarce | square | gold | `scarce` |
| `tier_5_rare.png` | 5 Rare | star | coral | `rare` |
| `tier_6_special.png` | 6 Special | heart-like gem | plum | none yet (kept for a future "special" use, e.g. warden boss or confirmed national rarity) |

`unreported` and `unknown` engine tiers have no mark: draw nothing, or a hollow dashed outline in code.

## Review notes

- Tiers read clearly at 16 px. Stamps are good at 32 px; `stamp_new_best` (laurel + "+1") is the busiest, so check it on a phone at 2x and 3x before relying on it.
- The two stamp border colours (coral and deep water) are a deliberate pairing: coral = discovery, deep water = record-keeping. Keep that if you add stamps.
