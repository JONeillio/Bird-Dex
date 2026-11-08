# Game art brief (for Astra or any image tool)

Written 8 Nov 2026. Covers every image the app still needs apart from bird portraits (those are in `bird-batches.md`): map textures, Reserve Warden portraits, badge pins, rank frames and emblems, and Field Duel condition cards. The code works without any of it (it draws simple fallbacks), so none of this blocks the build. Drop each finished set in as a flat ZIP and the app picks it up.

How to use: attach `research/art-drafts/bold-pixel/robin_bold_pixel_draft_v1.png` and `selected_style_reference.jpg` as style references, paste the **whole prompt below**, then ask for one set at a time (Set 1, Set 2, ...). If the tool makes one image per message, keep saying "next".

---

```
You are making game art for Bird-Dex (BirdQuest), a retro pixel-art birdwatching app for UK birders. All art must match the attached Bold Pixel references: chunky square pixel clusters, strong dark outline, high contrast, simple 2–3 tone shading, no gradients, no anti-aliasing, no soft glow, no text inside images unless I ask for it. Everything is original: do not imitate Pokémon or any existing game, character, badge or logo.

Palette (use these; small extra shades of the same hues are fine):
paper #F7F2DE, panel #FFFBEF, ink/outline #213B32, forest #35614B, sage #A9C58A, grass #D2DDA9, water #7DB8C6, deep water #438CA8, path #EAD9AC, gold #D8A84B, coral #C96E53, muted green #526454, silhouette grey #8E938A. Metals: bronze #B07A45, silver #B9C2C4, gold #D8A84B with #F3D98B highlights.

Deliver each set as a flat ZIP (no folders) of PNGs with transparent backgrounds unless stated, using exactly the file names given, plus asset_manifest.json:
{"pack": "Bird-Dex game art set N", "assets": [{"file": "<name>.png", "role": "<one line>"}]}
Draw at a large size if you need to, but design for the final pixel size given: shapes must stay readable at that size.

SET 1: MAP TEXTURES (final 32×32 px, must tile seamlessly in all directions; opaque, no transparency)
- terrain_water_bold_pixel_v1.png: calm water in water #7DB8C6 with short two-tone ripple dashes in deep water #438CA8 and a few pale highlights. Sparse: the map's labels and pins sit on top.
- terrain_woodland_bold_pixel_v1.png: top-down tree canopy: rounded leafy blobs in two greens (forest and a lighter leaf green) with small dark gaps between them.
- terrain_reeds_bold_pixel_v1.png: wetland reeds seen from above at an angle: vertical reed strokes in sage and straw on a pale green-blue base.
Show me each one repeated 3×3 as a check, but deliver only the single 32×32 tile.

SET 2: RESERVE WARDEN PORTRAITS (final 96×96 px, transparent background, head and shoulders, facing slightly left, friendly expression, each holding or wearing the item described). These are original characters who look after real UK nature reserves. Varied ages, builds and ethnicities as written. No weapons.
- warden_maud.png: Maud, Marsh Warden. Woman in her 60s, white hair under a wax hat with a reed sprig, olive wax jacket, chest waders braces visible, binoculars round her neck, steaming tin mug of tea.
- warden_reg.png: Reg, Reedcutter. Wiry man in his 50s, flat cap, rolled sleeves, a bundle of cut reeds over his shoulder.
- warden_bev.png: Bev, Bait-digger. Black woman in her 40s, windswept curly hair, yellow oilskin, garden fork over her shoulder, small bucket.
- warden_tomasz.png: Tomasz, Tideline Counter. Man in his 30s, beard, woolly hat, clipboard, telescope on a tripod beside him.
- warden_rowan.png: Rowan, Woodland Ranger. Young person (20s), short hair, green fleece with a leaf ranger patch, pencil behind ear, field notebook.
- warden_agnes.png: Agnes, Old Acorn. Woman in her 80s, tweed jacket, acorn brooch, round glasses, magnifying glass, walking stick.
- warden_harold.png: Harold, Hedgelayer. Big man in his 50s, red face, leather gloves, a bundle of hazel stakes, braces.
- warden_sunita.png: Sunita, Stubble-field Surveyor. South Asian woman in her 30s, wide sun hat, hi-vis gilet over a jumper, tally counter clicker.
- warden_pat.png: Pat, Park Keeper. Man in his 60s, peaked keeper's cap, dark green uniform jacket, kindly smile, litter picker.
- warden_fran.png: Fran, Feeder Fran. Woman in her 50s, cosy cardigan, holding a bird feeder and a bag of seed, glasses on a chain.
- warden_fergus.png: Fergus, Raptor Watcher. Man in his 40s, red beard, khaki jacket, big binoculars raised to his chest, on a windy hilltop feel.
- warden_olu.png: Olu, Owl-light. Black man in his 30s, night-sky blue scarf and beanie, red-filter head torch, thermos flask.
Also one: warden_silhouette.png: the same framing, a plain dark ink silhouette of a person in a hat (shown before you meet a warden).

SET 3: BADGE PINS (final 64×64 px, transparent background). Enamel-pin style: thick metal rim, flat enamel fill, a small pin-shine highlight. Each pin has an EMPTY CENTRE (flat panel colour #FFFBEF circle or shield about 32 px across) because the app places a bird sprite there. Make every shape in three metals: bronze, silver, gold (rim colour changes; enamel stays the same).
Habitat pin shapes (file names badge_<habitat>_<metal>.png, metals bronze/silver/gold):
- badge_wetland_*: shield with reed leaves crossing behind it, enamel water blue.
- badge_coast_*: round roundel with a wave border, enamel deep water blue and sand.
- badge_woodland_*: oak leaf shape with an acorn at the stem, enamel forest green.
- badge_farmland_*: hexagon with a wheat-ear border, enamel straw and sage.
- badge_garden_*: flower-shaped scalloped circle with a tiny feeder at the top, enamel coral and paper.
- badge_raptors_*: shield with a single long flight feather behind it, enamel muted green and gold.
- badge_night_*: crescent-moon roundel with three stars, enamel deep ink blue.
That is 21 pins. Then three more year-list pins (no empty centre; put the number in big pixel digits): badge_year_50.png (bronze), badge_year_100.png (silver), badge_year_150.png (gold).

SET 4: RANK FRAMES AND EMBLEMS
Card frames for the BirdDex cards (final 96×128 px, transparent centre area of 72×104 px, the frame is a border 12 px thick, corners decorated, sides plain so they can stretch):
- frame_spotted.png: plain ink line border on panel colour.
- frame_known.png: double ink line with small square corner studs.
- frame_familiar.png: stitched brown leather border with visible stitches.
- frame_seasoned.png: leather border with brass corner plates.
- frame_oldfriend.png: gold foil border with a laurel of oak leaves in each corner and a few sparkle pixels.
Rank emblems (final 32×32 px, transparent): rank_spotted.png (a single feather), rank_known.png (binoculars), rank_familiar.png (open field notebook), rank_seasoned.png (brass compass), rank_oldfriend.png (oak-leaf laurel wreath in gold).

SET 5: FIELD DUEL CONDITION CARDS
Card art (final 96×64 px, landscape, opaque, a tiny pixel landscape scene, no birds and no text):
- cond_dawn-chorus.png: woodland edge at first light, pale gold sky, sun just rising.
- cond_low-tide.png: estuary mudflats with channels of water, distant shoreline.
- cond_cold-snap.png: frosted hedge and white-rimed field, pale blue sky.
- cond_feeder-rush.png: garden with a hanging feeder full of seed, fence behind.
- cond_reedbed-dusk.png: reedbed at dusk, orange-purple sky, still water.
- cond_thermals.png: rolling fields under a big summer sky with cumulus clouds.
- cond_fog.png: grey fog with faint tree shapes.
- cond_open-water.png: wide lake with wind ripples and a far bank.
- cond_hedgerow-harvest.png: hedgerow with red berries and seed heads, autumn colours.
- cond_night-watch.png: dark field and tree line under stars and a moon.
- cond_summer-skies.png: meadow and warm evening sky with insects as tiny dots.
- cond_sheltered-wood.png: inside a wood among trunks, dappled light.
Card back (final 96×128 px, opaque): card_back.png: forest green with a repeating tiny leaf pattern, ink border, a gold compass rose in the middle.
Duel result banners (final 192×48 px, transparent, include text in a chunky pixel font): banner_win.png "FIELD WON", banner_draw.png "EVEN MATCH", banner_lose.png "NEXT TIME".
```

---

## Notes for Claude when a set arrives

- Unzip into `research/art-drafts/game-art/set-N/` (keep originals). Convert with `scripts/art/prepare_sprite.py --tight --fit N --size N` to the final sizes above, then check them in `#/dev/art` with `npm run screens`.
- Runtime locations: `public/assets/map/patterns/` (Set 1), `public/assets/wardens/` (Set 2), `public/assets/badges/` (Set 3), `public/assets/ranks/` (Set 4), `public/assets/duel/` (Set 5).
- Warden ids in the file names match the persona ids in `src/data/wardens.v1.json` (AUTOPILOT.md D2).
- Until each set arrives, the code draws its own fallbacks (pixelSprite shapes and CSS borders). Swapping in the art is a lookup change, never a redesign.
