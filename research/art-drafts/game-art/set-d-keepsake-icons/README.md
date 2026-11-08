# Game art Set D: keepsake icons

Arrived 8 Nov 2026 (ZIP from Joseph, made with an image tool from the palette sheet `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved.

One 32x32 icon per story NPC: the object they hand over (named in `research/art-drafts/npc-pack-v1/encounters.json`).

- Originals + `asset_manifest.json`: this folder (final size; runtime copies are identical).
- Runtime copies: `public/assets/keepsakes/keepsake_<id>.png`.
- Code lookup: `src/art/keepsakes.ts` -> `KEEPSAKES`, `keepsakeFor(npcId)`.
- 7-16 colours each, binary alpha. Show at whole-number scales, `image-rendering: pixelated`. Nothing awards keepsakes yet: the encounters are design ideas.

| File | Given by | What it is and what it is for (story design only) |
| --- | --- | --- |
| `keepsake_recording.png` | nell | Labelled field cassette: a recording for the journal (replays the encounter audio) |
| `keepsake_wren_sticker.png` | kit | Wren sticker: cosmetic sticker for a journal page |
| `keepsake_nuthatch_study.png` | imani | Illustrated nuthatch study: a behaviour note for the journal |
| `keepsake_viewing_window.png` | bea | Wooden viewing frame: the window you chose, a persistent scene change in the hide |
| `keepsake_order_slip.png` | dev | Bakery order slip with the bird rhythm on the back: a two-sided item linking Dev and Bea |
| `keepsake_photo_crop.png` | moss | Print with pink crop marks: a journal print (later in Bea's hide) |
| `keepsake_bridge_pin.png` | june | Enamel bridge pin: seasonal champion pin |
| `keepsake_hand_map.png` | otis | Folded hand-drawn map with a red star: optional map overlay with Waggy Bridge |
| `keepsake_enamel_cups.png` | ruth | Two enamel cups: your cup beside hers (later in the hide) |
| `keepsake_duty_card.png` | val | Parakeet duty card with the flight line: prompts Nell's related recording |
| `keepsake_match_report.png` | alfie | Signed match report: journal page updated by his brother's reply |
| `keepsake_palette_swatch.png` | leanne | Fan of colour swatches: your Erith Pier palette, a journal colour option |

Review note: the icons are drawn with more internal detail than the 16 px tier marks and 32 px stamps (small illustrations inside the object), so check them on a phone at 2x before using them smaller than that.
