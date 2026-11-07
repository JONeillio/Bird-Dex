# BirdQuest agent briefs and integration rules

Use two specialists and one integrator. The integrator may be the main coding agent; a third autonomous worker is not required. Agents share the contract, not unrestricted write ownership of all files.

## Shared inputs and ownership

The integrator owns `art/art-contract.json`, the combined `art/asset-manifest.json`, `rendering/map-theme.rules.json`, application integration and the final handoff. An agent proposes contract changes instead of silently changing another agent's assumptions.

Each specialist may write a contribution manifest with the same asset entry format under `art/manifests/map.json` or `art/manifests/birds.json`. The integrator merges by stable asset ID, checks duplicates and resolves changes. Neither specialist repacks/renames the other's assets.

## Agent A — geographic renderer and map art

Copy-paste task:

> Read the build handoff, style guide, art contract, planned inventory and semantic theme rules. Own `src/features/map/**`, `public/map/styles/**`, `public/assets/map/**`, `scripts/map/**`, `tests/map/**`, `docs/rendering/**` and `art/manifests/map.json`. Begin by inspecting the current OpenFreeMap style/TileJSON and actual source-layer/class schema; record the supported mapping rather than guessing property names. Build a 2D north-up Field style and an Adventure style from the same real geographic sources. Deliver palette, simplified geometry styling, seamless patterns, site markers and readable labels first. Keep map state when switching modes. Add world-cell-based decorative scenery only after the basic style works; handle source fragments, polygon masks, stable candidate IDs and deduplication explicitly. Keep sightings as demo fixtures until real adapters exist and label them. Preserve credits. You may produce discrete map-art drafts, but no invented geographic screenshots may become navigation maps. Do not change bird portraits, shared contracts, private data, API secrets or unrelated UI. Return exact files changed, source schema, Manchester/London visual evidence, automated checks, actual device/performance observations and unresolved issues. Missing art must fall back to a usable plain map.

Agent A first outputs:

1. A source-schema/dependency inventory and one real map.
2. Field/Adventure style pair at local and wider zooms.
3. Sprite/texture contribution manifest and, when approved inputs exist, atlas build rules.
4. Optional deterministic scenery utility with mask/tile-seam evidence.

Planned scripts: `inspect-map-source`, `build-map-style`, `build-map-atlas`, `build-decoration-cells`, `map-smoke-locations`. They are not implemented in this pack.

## Agent B — bird art and species review

Copy-paste task:

> Read the build handoff, style guide, art contract, production queue and anchor prompts. Own `art/birds/**`, `art/prompts/birds/**`, `art/references/birds/**`, `public/assets/birds/**` and `art/manifests/birds.json`. Produce only European robin, common kingfisher and grey heron anchors first, using declared variants and primary bird references. Keep generation originals and cleanup sources; identify drafts accurately. Compare the anchors at the provisional 64 grid and a 96 candidate if necessary in the same card/profile context, then ask the integrator to freeze one collection-wide grid. Produce the remaining nine portraits in the queue's small batches. Preserve real diagnostic colours rather than forcing all birds into the UI palette. Record prompt, references, creator/tool, actual timestamps, edits and rights decisions. Do not guess provider species IDs, mark unreviewed images approved, alter map styling/atlas integration or change shared contracts. Use labelled fallbacks for species with no art. Return exact files, reviewed assets, failed checks and requested contract changes.

Agent B first outputs:

1. Three anchor drafts and provenance entries.
2. A comparison/review report for grid, outline, framing, alpha and species identity.
3. Approved exports and contribution metadata only after the review is complete.

Use an image-generation tool for original raster drafts and appropriate image tooling for deliberate export/grid cleanup. Merely resizing a detailed generation is not proof of coherent pixel art.

## Integrator — sequence and merge

1. Start both agents with the same contract and version. Source inspection and anchor work can proceed in parallel without API credentials.
2. Settle the portrait grid and style from the three anchors before large batches. This does not block the pattern-based map; map marker dimensions are separate.
3. Merge approved contribution entries into the combined manifest. Run the supplied validator; never interpret a planned-only pass as art completion.
4. Integrate map state, bird profile, logging and collection. Use approved imagery where available and a labelled fallback everywhere else.
5. Test in real geographic scenes, including dense London and park/water areas. Use actual timings rather than invented benchmark claims.
6. Deliver a small complete journey before optional scenery, call libraries or animations.

Do not demand user approval for each routine export. The integrator can review conformance to the agreed direction; ask the user only for a material aesthetic choice or changed scope. Keep credentials out of screenshots/logs/manifests and do not give art agents unnecessary secret access.

## Completion report required from each specialist

Report files changed, asset IDs/version, status, checks actually run, visual evidence, open dependencies and a short next-step recommendation. Explicitly state whether outputs are drafts, approved assets, a working renderer or specification only. No “done” claim based solely on generated screenshots.
