# Game art Set 6: the other eight Reserve Wardens + unmet silhouette

Arrived 8 Nov 2026 (ZIP from Joseph, made in a separate chat with the image tool; briefs in `research/art-rendering/art/prompts/game-art-brief.md` SET 2 and the palette sheet `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved. Together with Maud, Reg, Agnes and Harold (cut from screenshots, `../screenshot-crops/`), **all 12 wardens in `src/data/personas.ts` now have portraits.**

- Originals + `asset_manifest.json`: this folder (96x96, already final size).
- Runtime copies: `public/assets/wardens/warden_<id>.png` (96) and `@2x` (192, exact 2x nearest-neighbour).
- Code: `src/art/warden-art.json` lists ids with art (now all 12); `wardenArt(id)` returns the portrait, `WARDEN_SILHOUETTE` the unmet silhouette (`src/art/wardens.ts`).

| id | Warden | Habitat | What is drawn |
| --- | --- | --- | --- |
| bev | Bev the Bait-digger | coast | Black woman, 40s, windswept dark curly hair, yellow oilskin, garden fork over her shoulder, bucket |
| tomasz | Tomasz the Tideline Counter | coast | Bearded man, 30s, blue woolly hat, clipboard, telescope on a tripod behind him |
| rowan | Rowan the Woodland Ranger | woodland | Young person, brown tousled hair, green fleece with leaf ranger patch, field notebook, yellow pencil behind the ear |
| sunita | Sunita the Stubble-field Surveyor | farmland-upland | South Asian woman, 30s, wide straw sun hat, hi-vis gilet over a jumper, tally counter |
| pat | Pat the Park Keeper | garden | Older man, peaked keeper's cap, dark green uniform jacket, litter picker |
| fran | Feeder Fran | garden | Woman, 50s, auburn hair with a pale streak, glasses, red cardigan, bird feeder and a bag of seed |
| fergus | Fergus the Raptor Watcher | raptors | Red-bearded man, 40s, khaki jacket, big binoculars raised to his chest |
| olu | Olu "Owl-light" | night | Black man, 30s, navy beanie with a red-filter head torch, night-blue scarf, thermos |
| silhouette | Unmet warden | n/a | One-colour ink silhouette of a person in a hat, same framing |

## Consistency review (8 Nov, against the four existing wardens)

Same family: all 96x96 head-and-shoulders, flat cut at the bottom, same pixel density, same 2-3 tone shading and warm-friendly tone, original characters, varied ages and builds as briefed, every item in the brief present. Two small differences:

1. **Margins.** The new eight keep a 4 px safe margin at the sides and top, as the palette sheet asks; the old four (cut from screenshots) run edge to edge. At the same display size the new faces look about 8% smaller than Maud's or Harold's. Harmless in separate panels, noticeable if two sit side by side. Fix if wanted: rescale the new ones to fill the frame, or add the margin to the old ones.
2. **Outline colour.** New outlines are `#1A1411` (the palette sheet's art outline); old ones are green-black (`#16231D`, `#101812`) or pure black (Agnes, Harold). Barely visible at 96 px.

The wardens are chunkier (96 px for head and shoulders) than the 1254 px dialogue portraits of the story NPCs (`research/art-drafts/npc-pack-v1/`). That is intended: wardens appear as small panel portraits, NPCs as large dialogue portraits. They share palette, outline and shading rules.
