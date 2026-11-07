# BirdQuest art and rendering starter pack

Prepared 7 November 2026. This is a planning/specification pack with one working validation tool. It is not a map renderer or a finished image collection.

Start with `../BirdQuest_Build_Handoff.md`, then `docs/agent-briefs.md`. Copy the contents into the existing app workspace; review path conflicts rather than overwriting unrelated app files.

## Included and ready now

- The active handoff is one directory above, at `../BirdQuest_Build_Handoff.md`.
- `art/art-contract.json`: proposed shared visual and file-format contract.
- `art/asset-manifest.json`: explicit planned inventory of bird portraits and map assets. No image is claimed to exist.
- `art/production-queue.json`: bird batches and review requirements.
- `art/prompts/anchor-birds.md`: three reusable generation briefs.
- `docs/art-style-guide.md`: style, dimensions, pixel-grid and species review rules.
- `docs/agent-briefs.md`: copy-paste tasks with separate ownership and merge rules.
- `rendering/map-theme.rules.json`: app-owned semantic recipes, NOT a runnable MapLibre style JSON.
- `tools/validate_assets.py`: metadata and PNG validation; reads images and never edits them.

## Validate the inventory

The tool needs Python 3 and Pillow. Install Pillow in the development environment if needed; its version is not pinned by this planning pack.

```bash
python tools/validate_assets.py --root .
```

Initially this reports **0 production images checked** and the number of planned assets. That is an inventory check, not a successful art review. Use the following when approved exports have actually been supplied:

```bash
python tools/validate_assets.py --root . --require-approved
```

That command deliberately fails while no approved images exist. Use `--json` for a structured report. All paths in the manifest are relative to this pack/repo root. Proposed runtime files belong under `public/assets/`.

The checker validates IDs, file paths, declared dimensions, power-of-two pattern sizes, PNG format, transparency, padding and approval metadata. It warns about a high opaque-colour count. It cannot certify species accuracy, a coherent pixel grid, attractive composition, seamless repetition, legal rights, map performance or visual quality.

## Still to be done

Create the three anchor bird drafts, compare their appearance at the proposed 64-pixel grid and a 96-pixel candidate if necessary, then freeze one grid before bulk production. Implement and test the real geographic map style. The source inspector, style builder, atlas builder and procedural scenery generator described in the handoff remain planned work.

No API key, private user record, real sighting fixture, generated portrait, terrain image or sprite atlas is included. The generated concept board from the conversation can be supplied alongside this pack as aesthetic reference.
