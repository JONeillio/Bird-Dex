# Game art Set B: NPC map sprites

Arrived 8 Nov 2026 (ZIP from Joseph, made with an image tool from the palette sheet `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved.

- Originals + `asset_manifest.json`: this folder (already final size, so the runtime copies are identical).
- Runtime copies: `public/assets/npcs/map/<id>_map.png`.
- Code lookup: `src/art/npcs.ts` -> `npcMapSprite(id)` (strip src, frame size, anchor, action text).

## Format

Each file is ONE horizontal strip, **192x64 = 4 frames of 48x64**, binary alpha, 10-19 colours. Frames left to right:

1. rest  2. breathe  3. rest  4. a small action (the table below)

- **Ground anchor: (24, 64)** inside a frame, i.e. bottom centre = the feet. Put that point on the map coordinate.
- Suggested playback (not yet built): idle loop frames 1, 2, 3, 2 at about 2 frames a second; on tap play frame 4 for about 1.2 s then return to idle, then open the encounter (move the camera in, show the portrait). Reduced motion: hold frame 1.
- Show at whole-number scales (2x is about 96x128 on screen), `image-rendering: pixelated`. Slice frames with a CSS `background-position` of `-<frame*48*scale>px 0`.
- June is drawn seated in her wheelchair, so her sprite is shorter and wider than the others; the same 48x64 frame and feet anchor still apply.

| id | Character | File | Frame 4 action |
| --- | --- | --- | --- |
| nell | Nell, The dawn-chorus recordist | `nell_map.png` | lifts a headphone cup |
| kit | Kit, The self-appointed wren expert | `kit_map.png` | raises a finger to his lips |
| imani | Imani, The hide artist | `imani_map.png` | opens the nuthatch study |
| bea | Bea, The hide keeper | `bea_map.png` | raises the viewing frame |
| dev | Dev, The baker at the gate | `dev_map.png` | raises the kitchen timer |
| moss | Moss, The photographer who missed it | `moss_map.png` | raises the camera |
| june | June, The bridge champion | `june_map.png` | clicks the tally counter |
| otis | Otis, The keeper of his sister's map | `otis_map.png` | unfolds the map |
| ruth | Ruth, The last one in the wood | `ruth_map.png` | angles her red-filter torch |
| val | Val, The driver who knows the parakeets' timetable | `val_map.png` | points with the duty card |
| alfie | Alfie, The keeper who wants a witness | `alfie_map.png` | raises a goalkeeper glove |
| leanne | Leanne, The colourist on Erith Pier | `leanne_map.png` | fans her swatches |
