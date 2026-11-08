# Game art Set E: dialogue and sheet kit

Arrived 8 Nov 2026 (ZIP from Joseph, made with an image tool from the palette sheet `../style/bird-dex-palette-v1.png`). AI-assisted drafts, individually unapproved.

Stretchable boxes, buttons and small animated pieces for NPC dialogue and the Field Report sheet.

- Originals + `asset_manifest.json`: this folder (final size; runtime copies identical).
- Runtime copies: `public/assets/ui/dialogue/`.
- Code: `src/art/dialogueKit.ts` -> `DIALOGUE_KIT` (sizes, nine-slice insets, text insets, frame layouts), `nineSliceCss(piece, scale)` (border-image CSS at an integer scale, with text padding) and `frameOffset(piece, frame, scale)`.
- 3-5 colours each, binary alpha, made only from palette colours (ink, forest, sage, grass, panel).

| File | Size | Use | Nine-slice L/T/R/B (art px) | Text inset L/T/R/B |
| --- | --- | --- | --- | --- |
| `dialogue_box.png` | 192x64 | Speech panel with a tail at bottom-left (the tail lives in the bottom edge) | 34 / 10 / 10 / 17 | 12 / 12 / 12 / 18 |
| `nameplate.png` | 96x24 | Speaker's name on a forest bar with a cream lettering area | 14 / 6 / 8 / 6 | n/a |
| `choice_button.png` | 96x24 | Resting choice button (cream) | 8 / 7 / 8 / 7 | n/a |
| `choice_button_pressed.png` | 96x24 | Pressed choice button (green) | 8 / 7 / 8 / 7 | n/a |
| `sheet_frame.png` | 96x96 | Field Report card frame with four leaf sprigs | 21 / 21 / 21 / 21 | n/a |
| `sheet_handle.png` | 32x8 | Bottom-sheet grab handle (not stretched) | n/a | n/a |
| `dialogue_next.png` | 32x16 | Blinking advance arrow: 2 frames of 16x16, left to right | n/a | n/a |
| `speech_dots.png` | 48x8 | "Thinking" bubble: 2 frames of 24x8, left to right | n/a | n/a |

Using a nine-slice piece: `Object.assign(el.style, nineSliceCss(DIALOGUE_KIT.dialogueBox, 2))` (or the same values in CSS). Use whole-number scales only. Animated pieces: set a background of the strip at the frame size and move `background-position` by `frameOffset(...)` every 400-500 ms; hold frame 1 with reduced motion.

Typical dialogue screen: portrait (`npcArt(id, 'talk')`) above or beside `dialogueBox`, `nameplate` overlapping its top-left, `next` arrow at the bottom right, `choiceButton`s below.
