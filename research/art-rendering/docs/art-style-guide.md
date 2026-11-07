# BirdQuest art style guide — provisional v0.2

## Purpose

Create one recognisable original retro handheld bird adventure. Real geography supplies the map; reusable textures/icons give it personality. Real birds receive species-specific portraits. The application renders labels, panels and records as UI.

This guide is a recommended starting contract. The integrator can settle remaining choices from the first three anchors without requiring a new approval for every image. The user may refine the aesthetic, but do not stop useful implementation waiting for a large art commission.

## Pixel grids and framing

| Asset | Proposed native canvas | Export/usage rule |
| --- | --- | --- |
| Bird portrait | 64×64, provisional | One consistent native grid for the collection; transparent PNG; 4 px safe margin |
| Alternative portrait trial | 96×96, anchor experiment only | Compare before freezing the contract; not mixed into the 64×64 runtime collection |
| Site/target/selected marker | 32×32 | Transparent PNG; semantic differences in shape as well as colour |
| Broadleaf/conifer decoration | 32×32 | Transparent PNG; ground anchor bottom centre |
| Bush/reeds decoration | 16×16 | Transparent PNG; ground anchor bottom centre |
| Grass/water/woodland pattern | 32×32 | Opaque seamless tile, tested as a repeated pattern |
| Card/profile display | Integer multiples of native sprite where possible | Keep UI text sharp and independently rendered |

The 64-pixel target continues the earlier foundation. Compare robin, kingfisher and grey heron before deciding that it is final. If 96 is selected, the integrator updates the shared contract and every planned portrait record before production. Do not pick a different grid for each species. Map assets remain independent of this choice.

Keep each bird's bill, tail and feet inside the safe region. Similar framing means a balanced card layout, not equal body proportions or a claim of equal real-world size. A heron stays tall and slender; a robin stays round.

Logical pixels and high-DPI atlas image pixels are different. A logical 32×32 icon at pixelRatio 2 occupies 64×64 image pixels. Packing metadata must preserve logical size, physical bounds and anchors, excluding padding. Pattern dimensions must satisfy the renderer's documented constraints. CSS pixel rendering of a UI image does not prove crisp texture sampling in MapLibre's WebGL canvas.

## Visual language

- Original pixel clusters with clear silhouettes, restrained outlines and two or three shade steps rather than photographic gradients.
- Consistent right-facing side/three-quarter bird pose, open eye and calm natural posture.
- Transparent portrait background: no text, card border, badge, scenery, halo, cast shadow or extra bird.
- Green/cream UI and terrain framing, blue water, amber discovery accents. Bird colours remain true to their species; do not make a kingfisher green to fit the interface.
- Provisional opaque-colour target: around 24 per bird. This is a review guideline, not a reason to destroy diagnostic markings through automatic colour reduction.
- Approved pixel sprites use binary transparency unless the integrator explicitly changes the contract. Soft alpha and blended boundary pixels require cleanup/review.
- Draft masters can be larger and richer. Keep originals/editable cleanup files under `art/` and approved runtime exports under `public/assets/`.

## The three anchor briefs

| Bird | What it tests | Identity checks |
| --- | --- | --- |
| European robin | Round compact songbird and warm colour | Orange-red face/breast, brown upperparts, pale underside; do not use an American robin |
| Common kingfisher | Saturated colours and fine bill/face details | Blue/orange colour blocks, compact body and long straight bill; use a declared adult variant |
| Grey heron | Tall silhouette and long anatomy | Long legs, long bill and long neck, grey/white/black pattern; adult reference |

Reference URLs in the anchor prompt file guide species identity. They are not permissions to redistribute reference photos. Every later species requires its own reference/variant check before approval. No guessed eBird species codes are part of the inventory.

## Variation and identity

Each asset records a chosen age, sex if relevant, plumage/season if material and reference region. An adult male mallard or blackbird is a selected depiction, not a claim that all members of the species look that way. Avoid mixed-sex or mixed-age invented markings. Species provider mapping is separate from the illustration filename and must be verified against the selected taxonomy.

## Production lifecycle

`planned → draft → reviewed → approved → retired`

- Planned means a specification exists; the file can be absent.
- Draft means an image exists but may still need anatomy, grid, alpha or composition work.
- Reviewed records completed checks and remaining issues.
- Approved means the integrator accepts the export for runtime use after species identity, pixel-grid, transparency and in-app review. Complete provenance/rights fields; the validator checks that declarations exist, not whether they are legally correct.
- Retired preserves provenance of replaced assets and keeps them out of new runtime indexes.

Do not infer approval from an image looking pixelated, meeting exact dimensions or passing an automated validator. Keep the prompts, original generation output and any cleanup sources so future batches can be matched.

## Reuse and scope

One portrait serves BirdDex cards, a profile and a reveal. Derive the unrecorded silhouette/desaturation in the UI; do not generate a second inconsistent bird. Keep species names visible. Use site symbols on the overview map and show detailed birds in the selected sheet.

The app supplies frames, text, status and controls. Optional woodland/wetland/coastal backgrounds are a small separate reusable set, not a bespoke full-screen picture per bird. Twelve portraits do not imply twelve page designs. Per-bird animations are deferred; UI motion can provide the initial reveal.

## Visual review evidence

Review each anchor at native scale and integer enlargements on paper, dark-neutral and actual card backgrounds. Check silhouettes as well as colour portraits. View multiple cards together so inconsistent outline/shading becomes obvious. Validate the map art at whole/fractional zoom and different device pixel ratios. A later builder should produce labelled contact sheets/screenshots from actual assets and record what was reviewed; no review image or performance measurement is supplied by this pack.

## Sound is a separate workstream

Original menu/reveal tones can be a tiny later code task, with tap-to-enable, volume and mute. Biological calls need verified creator/source/licence metadata and a distinct playback action. Do not use generated bird audio as an identification reference or let audio sourcing delay the basic map/collection loop.
