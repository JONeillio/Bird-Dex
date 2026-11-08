# Game art Set C: portrait expressions

Arrived 8 Nov 2026 (ZIP from Joseph, made with an image tool from the palette sheet `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved.

Two extra dialogue portraits for each of the 12 story NPCs. The third, **neutral**, is the original from the NPC pack (`research/art-drafts/npc-pack-v1/<id>.png`).

- Originals (1254x1254, transparent) + `asset_manifest.json`: this folder.
- Runtime copies: `public/assets/npcs/<id>_talk.png` and `<id>_delight.png`, 256x256, plus `@2x` at 512x512 (palette PNGs, about 40 KB each). The neutral runtime files are in the same folder (`<id>.png`).
- Code lookup: `src/art/npcs.ts` -> `npcArt(id, 'neutral' | 'talk' | 'delight')`.

## How to use

- `talk`: mouth open mid-speech. Swap it with `neutral` every ~150 ms while a line types out, and use `neutral` when the text is finished.
- `delight`: pleased or surprised. Use on a successful reveal (a bird spotted, a keepsake given) and on return-visit greetings.
- Same pose and framing in all three: only the face and a small hand movement change, and the outline silhouettes match to within 0.5%, so swapping does not make the character jump.

| id | talk | delight |
| --- | --- | --- |
| nell | `nell_talk.png` | `nell_delight.png` |
| kit | `kit_talk.png` | `kit_delight.png` |
| imani | `imani_talk.png` | `imani_delight.png` |
| bea | `bea_talk.png` | `bea_delight.png` |
| dev | `dev_talk.png` | `dev_delight.png` |
| moss | `moss_talk.png` | `moss_delight.png` |
| june | `june_talk.png` | `june_delight.png` |
| otis | `otis_talk.png` | `otis_delight.png` |
| ruth | `ruth_talk.png` | `ruth_delight.png` |
| val | `val_talk.png` | `val_delight.png` |
| alfie | `alfie_talk.png` | `alfie_delight.png` |
| leanne | `leanne_talk.png` | `leanne_delight.png` |

## Review notes

- Across all 12, the clothes in `talk` and `delight` are very slightly shifted in colour from the neutral original (about 2% on average), which is not visible when shown alone but can show as a faint flicker when swapping on the same spot.
- **Val:** neutral has a red tie and light-blue collar; `talk` and `delight` have a brown tie and grey collar. If this bothers you, ask for a redraw or swap in neutral for Val's expressions.
- Runtime files were re-saved as 64-colour palette PNGs after resizing; the masters here keep full detail.
