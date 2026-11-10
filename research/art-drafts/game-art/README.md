# Game art drafts (not bird portraits)

Index of non-bird art sets. Briefs: `research/art-rendering/art/prompts/game-art-brief.md` (map textures, wardens, badges, ranks, duel cards) and the later sets below. Style: `style/README.md` and `style/bird-dex-palette-v1.png`. All AI-assisted drafts, individually unapproved. Intake process: AUTOPILOT R1.

| Folder | What | Arrived | Runtime location | Lookup |
| --- | --- | --- | --- | --- |
| `set-a-stamps-tiers/` | 6 stamps (32 px) + 6 rarity tier marks (16 px) | 8 Nov 2026 | `public/assets/stamps/`, `public/assets/tiers/` | `src/art/marks.ts` |
| `set-b-npc-map-sprites/` | 12 NPC map sprite strips (4 frames of 48x64, feet anchor) | 8 Nov 2026 | `public/assets/npcs/map/` | `src/art/npcs.ts` (`npcMapSprite`) |
| `set-c-portrait-expressions/` | `talk` and `delight` dialogue portraits for the 12 NPCs (1254 px masters) | 8 Nov 2026 | `public/assets/npcs/` (`<id>_talk`, `<id>_delight`, `@2x`) | `src/art/npcs.ts` (`npcArt(id, expression)`) |
| `set-d-keepsake-icons/` | 12 keepsake icons (32 px), one per NPC | 8 Nov 2026 | `public/assets/keepsakes/` | `src/art/keepsakes.ts` |
| `set-e-dialogue-kit/` | Dialogue box, nameplate, choice buttons, sheet frame, handle, next arrow, thinking dots (nine-slice) | 8 Nov 2026 | `public/assets/ui/dialogue/` | `src/art/dialogueKit.ts` |
| `set-6-wardens/` | The other 8 Reserve Warden portraits (96 px) + the unmet silhouette; with the 4 screenshot crops all 12 personas have art | 8 Nov 2026 | `public/assets/wardens/` | `src/art/wardens.ts` (`wardenArt`, `WARDEN_SILHOUETTE`) |
| `set-f-dot-lau/` | Dot Lau, now called Pearl (tutorial guide, not a warden): 8 poses at 96 px, sketching cels and GIF, 32 px head, 1254 px sources, casting archive | 9 Nov 2026 | `public/assets/guide/dot/` | `src/art/guide.ts` |
| `set-h-dot-tour-poses/` | Six everyday poses without the sketchbook (chat, introduce, clarify, compare, aside, over-to-you), 96 px, with mouth anchors and example lines in `dot-tour-scenes.json`. The guide is now called Pearl | 10 Nov 2026 | `public/assets/guide/dot/` | `src/art/guide.ts` |
| `set-g-fieldhand-dialogue/` | Fieldhand pixel font (atlases, 212 glyph tiles in `glyphs/`, TTF), paper and gold bubbles, the kit's reference player, example scenes and offline preview (`START-HERE.html`) | 9 Nov 2026 | `public/assets/ui/fieldhand/` | `src/ui/fieldhand/` |
| `../npc-pack-v1/` | 12 story NPC portraits + stories (`encounters.json`) | 8 Nov 2026 | `public/assets/npcs/` | `src/art/npcs.ts` |
| `screenshot-crops/` | Warden portraits (Maud, Reg, Agnes, Harold; see also `set-6-wardens/`) and two marsh scenes cut from screenshots | 8 Nov 2026 | `public/assets/{wardens,scenes}/` | `src/art/wardens.ts` |

Still to come: badges (21 pins + 3 year pins), rank frames and emblems, duel condition cards and card back, water/woodland/reeds map tiles (from the older `game-art-brief.md`); any further NPC encounter art (props, scenes) is not yet briefed.

**Brief 2 (8 Nov 2026):** everything still missing, plus new UI parts and NPC backdrops, is in `research/art-rendering/art/prompts/game-art-brief-2.md` (Sets 6-13). It supersedes the old Sets 2-5 list; duel condition cards are dropped.
