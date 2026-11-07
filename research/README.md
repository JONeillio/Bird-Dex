# Bird-Dex research and design

Target repository: [JONeillio/Bird-Dex](https://github.com/JONeillio/Bird-Dex). Prepared 7 November 2026. BirdQuest is the working product name.

This folder contains the research, product requirements, visual concept, art specifications and agent handoffs produced during planning. It contains no API credentials or real personal bird records.

## Start here

1. Read [the current build handoff](BirdQuest_Build_Handoff.md). This is the active consolidated brief.
2. View [the visual concept board](design/BirdQuest_Concept_Board.png). Its map and reports are illustrative demo content, not a working renderer.
3. Read [the two agent briefs](art-rendering/docs/agent-briefs.md) and [the art style guide](art-rendering/docs/art-style-guide.md).
4. Use [the art pack instructions](art-rendering/README.md) for the manifest, production queue, prompt briefs, semantic map recipes and read-only validator.

## Current status

- Planning/specifications complete enough to start implementation.
- 22 raster assets are listed as planned; zero production image files have been created.
- The asset validator has been exercised with valid and deliberately broken synthetic fixtures.
- There is no working app, authenticated provider integration, sprite atlas or map renderer in this folder.
- The current repo URL is known, but no repository write/push was performed in the planning environment because GitHub access was not authenticated.

## Integration

Keep this material under `research/`. Move/adapt production code and assets into the actual app structure deliberately, rather than treating this folder as a runnable project. The manifest paths and script commands are relative to the art-rendering pack/project root; while kept here, run `python research/art-rendering/tools/validate_assets.py --root research/art-rendering` from the repo root. It should report zero production images checked until actual approved art exists.

The active handoff takes precedence over archived early planning. Do not create a second repo from an old name suggestion. Inspect existing app files and repository instructions before implementation; preserve unrelated changes. Workspace/Actions secrets do not automatically configure the deployed host, and must not be bundled into frontend code.

## Archive (now included)

[Original foundation material](archive/README.md) preserves the earlier product plan and proposed TypeScript contracts/design tokens. Its old next-model brief is historical; use the current build handoff above.
