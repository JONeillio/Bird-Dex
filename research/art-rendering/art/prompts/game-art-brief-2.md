# Game art brief 2: what is still missing (8 Nov 2026)

Replaces the "still to come" part of `game-art-brief.md` after the redesign canvas was approved. Differences from the first brief:
- Field Duel condition cards, card back and duel banners (old Set 5) are **dropped**: Call it replaced duels. Do not make them.
- New sets for the screens in the approved canvas: parcels, Bond bars, trust emblems, Call it, Bird News, Wanted poster, Outing card, satchel, NPC backdrops.
- Warden expressions (talk, delight) so wardens can speak like the NPCs.
- A redraw of Val's talk and delight portraits.

How to use: attach `research/art-drafts/game-art/style/bird-dex-palette-v1.png`, `research/art-drafts/bold-pixel/robin_bold_pixel_draft_v1.png`, `selected_style_reference.jpg`, and one finished warden (`public/assets/wardens/warden_maud@2x.png`) and one NPC dialogue portrait. Paste the whole prompt, then ask for one set at a time in the order given. Art never blocks the build: the code draws fallbacks until each set lands.

```
You are making game art for Bird-Dex (BirdQuest), a retro pixel-art birdwatching app for UK birders. Match the attached references exactly: Bold Pixel style, chunky square pixel clusters, strong dark outline, high contrast, 2–3 tone shading, light from the top-left and shade to the lower-right (shade leans cool green, light leans warm cream). No gradients, no anti-aliasing, no soft glow, binary transparency, 24 colours maximum per sprite. No text inside images unless I say so. Everything is original: do not imitate Pokémon or any existing game, character, badge or logo.

Palette (use these; small extra shades of the same hues are fine):
paper #F7F2DE, panel #FFFBEF, UI ink #213B32, art outline (near-black, never pure black) #1A1411, forest #35614B, sage #A9C58A, grass #D2DDA9, water #7DB8C6, deep water #438CA8, path #EAD9AC, gold #D8A84B (highlight #F3D98B), coral #C96E53, muted green #526454, silhouette grey #8E938A. Metals: bronze #B07A45, silver #B9C2C4, gold #D8A84B.

Deliver each set as a flat ZIP (no folders) of PNGs with transparent backgrounds unless stated, using exactly the file names given, plus asset_manifest.json:
{"pack": "Bird-Dex game art set N", "assets": [{"file": "<name>.png", "role": "<one line>"}]}
If a ZIP will not export, send the images one at a time on a plain black background and say the file name with each. Design for the final pixel size given: shapes must stay readable at that size. Do one set per message; when I say "next", do the next set.

SET 6: THE OTHER EIGHT WARDENS (final 96×96, transparent, head and shoulders, facing slightly left, friendly, same size, line weight and shading as the attached Maud). Original characters who look after real UK nature reserves. No weapons.
- warden_bev.png: Bev, Bait-digger. Black woman in her 40s, windswept curly hair, yellow oilskin, garden fork over her shoulder, small bucket.
- warden_tomasz.png: Tomasz, Tideline Counter. Man in his 30s, beard, woolly hat, clipboard, telescope on a tripod beside him.
- warden_rowan.png: Rowan, Woodland Ranger. Young person (20s), short hair, green fleece with a leaf ranger patch, pencil behind ear, field notebook.
- warden_sunita.png: Sunita, Stubble-field Surveyor. South Asian woman in her 30s, wide sun hat, hi-vis gilet over a jumper, tally counter clicker.
- warden_pat.png: Pat, Park Keeper. Man in his 60s, peaked keeper's cap, dark green uniform jacket, kindly smile, litter picker.
- warden_fran.png: Fran, Feeder Fran. Woman in her 50s, cosy cardigan, holding a bird feeder and a bag of seed, glasses on a chain.
- warden_fergus.png: Fergus, Raptor Watcher. Man in his 40s, red beard, khaki jacket, big binoculars raised to his chest, windy hilltop feel.
- warden_olu.png: Olu, Owl-light. Black man in his 30s, night-sky blue scarf and beanie, red-filter head torch, thermos flask.
- warden_silhouette.png: same framing, a plain dark ink silhouette of a person in a hat (shown before you meet a warden).

SET 7: WARDEN EXPRESSIONS (final 96×96, transparent). For ALL 12 wardens (Maud, Reg, Agnes, Harold, plus the eight above): take the finished portrait and change only the face. Same pose, clothes, props and colours, pixel for pixel outside the mouth and eyes.
- warden_<name>_talk.png: mouth open mid-sentence, eyebrows slightly raised.
- warden_<name>_delight.png: wide smile, eyes crinkled, eyebrows up.
24 files.

SET 8: BADGE PINS (final 64×64, transparent). Enamel-pin style: thick metal rim, flat enamel fill, a small pin-shine highlight. Each pin has an EMPTY CENTRE (a flat #FFFBEF circle or shield about 32 px across) because the app places a bird sprite there. Three metals per shape: bronze, silver, gold (only the rim colour changes; the enamel stays the same). File names badge_<habitat>_<metal>.png.
- badge_wetland_*: shield with reed leaves crossing behind it, enamel water blue.
- badge_coast_*: round roundel with a wave border, enamel deep water blue and sand.
- badge_woodland_*: oak leaf shape with an acorn at the stem, enamel forest green.
- badge_farmland_*: hexagon with a wheat-ear border, enamel straw and sage.
- badge_garden_*: flower-shaped scalloped circle with a tiny feeder at the top, enamel coral and paper.
- badge_raptors_*: shield with a single long flight feather behind it, enamel muted green and gold.
- badge_night_*: crescent-moon roundel with three stars, enamel deep ink blue.
That is 21 pins. Then three year-list pins with no empty centre and the number in big pixel digits: badge_year_50.png (bronze), badge_year_100.png (silver), badge_year_150.png (gold).

SET 9: RANK FRAMES AND EMBLEMS
Card frames for the BirdDex cards (final 96×128, transparent centre area 72×104, border 12 px thick, corners decorated, sides plain so they can stretch):
- frame_spotted.png: plain ink line border on panel colour.
- frame_known.png: double ink line with small square corner studs.
- frame_familiar.png: stitched brown leather border with visible stitches.
- frame_seasoned.png: leather border with brass corner plates.
- frame_oldfriend.png: gold foil border with a laurel of oak leaves in each corner and a few sparkle pixels.
Rank emblems (final 32×32, transparent): rank_spotted.png (a single feather), rank_known.png (binoculars), rank_familiar.png (open field notebook), rank_seasoned.png (brass compass), rank_oldfriend.png (oak-leaf laurel wreath in gold).

SET 10: MAP ART
Tiles (final 32×32, opaque, must tile seamlessly in all directions; show each repeated 3×3 as a check, but deliver only the single tile):
- terrain_water_bold_pixel_v1.png: calm water #7DB8C6 with short two-tone ripple dashes in #438CA8 and a few pale highlights. Sparse: labels and pins sit on top.
- terrain_woodland_bold_pixel_v1.png: top-down tree canopy, rounded leafy blobs in two greens with small dark gaps.
- terrain_reeds_bold_pixel_v1.png: reeds seen from above at an angle, vertical strokes in sage and straw on a pale green-blue base.
Markers (transparent, bottom-centre of the image is the point that sits on the map):
- marker_warden_pennant.png (16×24): a small pole with a gold-trimmed green pennant flag, for a Reserve Warden's site.
- marker_warden_pennant_done.png (16×24): same, with a gold star on the pennant (warden badge earned).
- marker_folk_here.png (16×16): a small speech bubble with three dots, for a person waiting at a spot.
- marker_folk_met.png (16×16): same bubble, filled in sage with a tick shape (already met).
- marker_start_dot.png (12×12): the "driving from" start point, a coral dot with a paper ring.

SET 11: SCREEN PARTS (final sizes in brackets; transparent unless stated)
Tab bar icons, single colour in UI ink #213B32 only (the app recolours them), 24×24:
- tab_explore.png (folded map with a pin), tab_dex.png (a bird card with a small bird silhouette), tab_journal.png (notebook with a ribbon), tab_folk.png (two heads side by side with a speech bubble).
Dex tab icons, single colour ink, 16×16: dextab_year.png (a leaf on a calendar), dextab_life.png (a feather in a circle), dextab_patch.png (a stitched cloth patch).
Parcels (the "open your new checklists" moment):
- parcel_closed.png (48×48): brown paper parcel tied with string and a blank luggage tag.
- parcel_rare_closed.png (48×48): same parcel with gold string and a gold-edged tag.
- parcel_opening.png (a strip of 4 frames, each 48×48, so 192×48): string loosens, flaps lift, a small burst of sparkle, fully open.
- parcel_open.png (48×48): flaps open, empty inside, sparkle pixels.
Bond bars (nine-slice, 4 px caps, final 48×12, opaque): bond_bar_track.png (empty trough, ink outline, panel fill), bond_bar_fill.png (forest green fill with a lighter top row), bond_bar_gain.png (gold fill with a lighter top row, for points earned today).
Rank-up burst: rankup_burst.png (a strip of 6 frames, each 64×64, so 384×64): a ring of gold and cream sparkle pixels that grows and fades out. No bird in it.
Trust emblems (32×32): trust_newcomer.png (muddy boot), trust_visitor.png (open gate), trust_regular.png (enamel mug), trust_local.png (brass key), trust_friend.png (a green reserve signpost with a tiny heart cut-out).
Survey job icons (24×24): job_count.png (tally marks on a clipboard), job_listen.png (ear with sound arcs), job_dusk.png (moon over reeds), job_watch.png (binoculars), job_walk.png (boot prints).
Call it:
- callit_slot_empty.png (48×48): a square slot with a dashed ink border and a faint question-mark shape, for a bird you have not picked.
- callit_slot_filled.png (48×48): same slot, solid panel border, empty centre for the app's bird sprite.
- callit_hit.png, callit_miss.png, callit_bold.png, callit_pending.png (32×32 stamps): a tick in a green seal, a cross in a grey seal, a gold star seal (a bold call), an hourglass seal.
- banner_calledit.png, banner_close.png, banner_nexttime.png (192×48, text allowed in a chunky pixel font): "CALLED IT", "CLOSE ONE", "NEXT TIME".
Bird News icons (16×16): news_sunrise.png, news_sunset.png, news_alert.png (a small bell or megaphone for rare bird alerts), news_target.png (a flag over a bird silhouette).
Posters and cards:
- wanted_frame.png (96×128, opaque paper, nine-slice friendly): a Wanted poster for a bird: cream paper with torn edges, a pin at the top, a plain border, empty centre. No text.
- outing_card_frame.png (96×128): a collectible card for one day out, ticket-stub notch at the bottom, a strip for a date, an empty picture window, panel-colour body.
- outing_card_back.png (96×128, opaque): forest green with a tiny repeating leaf pattern, ink border, a small gold binocular badge in the middle.
- satchel.png (96×64): an open leather satchel seen from the front, with room above it for keepsake icons to sit in.
- keepsake_slot_empty.png (40×40): a rounded slot with a dark silhouette of a small item inside, for keepsakes not found yet.
- year_race_ribbon.png (32×32): a gold rosette ribbon for the year race.

SET 12: NPC BACKDROPS (final 128×80, opaque, a pixel scene with no people and no birds, no text, no real place names or signs, quiet in the middle so a portrait can stand in front). Same palette and style as the references.
- bg_woodland_path.png: a path through broadleaf woodland, dappled light.
- bg_woodland_edge.png: scrubby woodland edge with brambles and a hedge, open sky.
- bg_hide_inside.png: inside a timber bird hide looking out through a long viewing window to wet grass and a brook.
- bg_open_grass.png: open grass, a bench and a distant tree line.
- bg_bus_stop.png: a suburban road with a bus stop shelter and a tree-lined verge.
- bg_pier_thames.png: a pier over a wide grey-blue tidal river, far bank with cranes.
- bg_evening_bench.png: a bench at the edge of a wood at dusk, orange sky.
- bg_brook_bridge.png: a small footbridge over a brook with reeds.

SET 13: VAL REDRAW (1254 px masters, same format as the attached NPC portraits)
Val, the bus driver who knows the parakeets' timetable. Attach her neutral portrait (val.png). Make val_talk.png and val_delight.png as the SAME picture with only the face changed. Her tie and collar must keep exactly the same colours as the neutral portrait (the first attempt changed them).
```

## Notes for Claude when a set arrives
- Follow R1 in `AUTOPILOT.md`. Unzip into `research/art-drafts/game-art/set-<n>/`, convert with `scripts/art/prepare_sprite.py --tight --fit N --size N`, check with `npm run screens`.
- Runtime folders: `public/assets/wardens/` (Sets 6, 7), `badges/` (8), `ranks/` (9), `map/patterns/` and `map/markers/` (10), `ui/` (11), `scenes/` (12), `npcs/` (13).
- Warden ids in the file names match `src/data/personas.ts`. Warden expressions need the same colour-match script as R2 in AUTOPILOT.
