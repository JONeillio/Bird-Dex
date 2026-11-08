# Bird-Dex style palette

`bird-dex-palette-v1.png` (8 Nov 2026) is the sheet attached to every art prompt: core palette (from `src/styles` tokens and `research/archive/design-tokens.json`), three-tone ramps, outline and metals, rarity tier colours, skin tones and character accents, a size ladder, and the shading rules.

Rules in one place:
- Light from the top-left, shade lower-right. Shade leans cool green, light leans warm cream. No gradients, no anti-aliasing, binary alpha, 24 colours max per sprite.
- Outline: one near-black, never pure black: `#1A1411` for art (birds, characters, props, stamps) and `#213B32` (Ink) for UI text and panel borders.
- Sizes: 16 icon / tier mark, 32 stamp or tile, 48x64 NPC map frame, 64 bird, 96+ portrait. Integer scale only, 4 px safe margin.
- Portraits (NPCs, wardens) may use finer pixels than sprites; the palette, outline and shading rule keep them one family.

Known inconsistency (measured 8 Nov): existing bird art outlines are warm near-black (~`#1A1411`), wardens green-black (~`#1E322C`), NPC portraits cooler greys. New art follows the sheet; old art can be snapped with a script if wanted.
