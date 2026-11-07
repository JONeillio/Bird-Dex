# Claude handover — Bird-Dex artwork expansion

## Immediate task

Import this flat ZIP as a **reviewable art batch** into the existing `JONeillio/Bird-Dex` repository. Follow the repo's existing conventions where present. Otherwise, keep this batch together under `research/artwork/bold-pixel-expansion-v1/`. Do not overwrite previously supplied anchors or unrelated app code.

Read this document and `asset_manifest.json` first. The user has selected **Bold Pixel**. There is no need to repeat broad visual-style research. The new artwork still needs user review before final runtime export. No GitHub login or MFA flow is required from ChatGPT; the user passes the ZIP to Claude for repository integration.

## Contents and lookup

- Birds use `bird_<id>_bold_pixel_v1.png` with IDs: `blue_tit`, `great_tit`, `blackbird`, `mallard`, `mute_swan`, `wren`, `great_spotted_woodpecker`, `kestrel`, `buzzard`.
- Terrain uses `terrain_<id>_bold_pixel_v1.png` with IDs: `grass`, `water`, `woodland`.
- Markers use `marker_<state>_bold_pixel_v1.png` with states: `normal`, `target`, `selected`.
- Scenery uses `scenery_<id>_bold_pixel_v1.png` with IDs: `broadleaf_tree`, `conifer`, `bush`, `reeds`.
- Combine with the existing robin, kingfisher and grey heron for the intended 12-bird starter set. Do not regenerate those anchors.

## Safe preview work now

Build a small local review gallery using the original PNGs, if useful. Give birds a common display box while preserving their aspect ratios; these portraits are not drawn to biological scale. Show transparency against both cream and dark green. Assess markers at realistic small map sizes, not just enlarged.

Use filename lookups through a central asset registry rather than generating filenames from API taxonomy names. Map the app's actual stable species IDs explicitly once its data model is known. This pack does not invent eBird codes.

## Artwork conversion after review

Preserve these originals. Export derivatives to the existing app asset location only after agreeing the grid. Starting options are 64-pixel bird sprites and 32-pixel ground tiles; test legibility before committing. Tall scenery may need larger or rectangular footprints. These are choices to validate, not delivered dimensions.

Do not simply relabel or rename a 1254-pixel master as a 32/64-pixel sprite. Snap silhouettes and interior clusters to the chosen grid, reduce the palette, clean soft alpha and stray pixels, then export at native size. Use nearest-neighbour enlargement for pixel-art display. Inspect generated derivatives after conversion.

The three textures are not verified seamless. Flatten their base colours, repair wraparound motifs, then inspect a repeated 3 × 3 grid and check joins at the final display scale. A border comparison is only a diagnostic; visual repeat quality still matters.

Normal and selected marker art have different padding and the selected marker includes a ring. Anchor the geographic coordinate to the **pin tip**, not blindly to the image bottom. Target flags anchor at the pole foot. Set per-asset offsets from visible geometry after final export. Keep touch targets at least 44 CSS pixels even if the visible artwork is smaller. Pair marker states with accessible text; preserve both the target star/flag and selected ring cues.

## Map integration boundaries

These are reusable styles and decorations, not geographic data. Clip textures to real land/water/woodland geometry in the renderer; retain real roads, waterways and hotspot coordinates. Decorative trees or reeds must not imply an actual tree, path, access point or sighting. Keep navigation legible beneath decoration.

Define selected state as highest visual priority, target state next, normal otherwise. If a selected site is also a target, keep that target status in the site panel or a separate badge; do not generate a new marker variant automatically.

A target flag means a recent report may match a missing bird; it is not a guaranteed sighting, confirmed real-time presence or automatic collection unlock. Keep sightings, collection state and site selection separate.

## Verification already done

All 19 original PNGs decode, are 1254 × 1254, and match their source bytes. All 16 cutout assets have alpha from 0 to 255 and unclipped main silhouettes (tested at alpha ≥ 128). Three textures are fully opaque. Soft alpha and faint stray edge pixels remain in the masters. Opposite texture borders differ, so seamless status is false. The ZIP is flat and its CRCs are checked.

No API, routing, authentication, account linking, species taxonomy mapping, map renderer or runtime build has been implemented by this asset delivery. Continue the existing build plan only after importing and reviewing these files.
