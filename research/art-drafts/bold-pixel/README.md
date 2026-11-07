# Bird-Dex — Bold Pixel anchor review v1

## Decision

The user selected **Bold Pixel**, the top row of `selected_style_reference.png`, on 7 November 2026: “Bold pixel is the lock in feels most like pokemon”. Use chunky square clusters, strong dark outlines, high contrast, bright species colours and clear silhouettes. The lower woodcut row is not selected.

## Status

The three individual transparent PNGs are **design drafts for review**. They are larger generative masters, not approved native 64×64 runtime sprites. The image manifest records their actual dimensions/alpha checks. Species detail, pixel-grid cleanup, framing consistency and in-app appearance still need review. Do not bulk-generate the rest of the catalogue or treat these as production-approved solely because the style is selected.

## Files and merge instructions

All files in this ZIP are in one flat folder. In `JONeillio/Bird-Dex`, keep the PNGs/reference as research/art drafts initially; the coding agent may organise them under an appropriate research folder. Keep `asset_manifest.json` with the draft files and preserve filenames or update its mappings. This README is the short integration note; there is no need to re-read the complete research archive for this art decision.

- `robin_bold_pixel_draft_v1.png`: European robin anchor.
- `kingfisher_bold_pixel_draft_v1.png`: common kingfisher anchor, adult male depiction requested.
- `grey_heron_bold_pixel_draft_v1.png`: grey heron anchor.
- `selected_style_reference.png`: user-selected study; use only the top Bold Pixel row.
- `asset_manifest.json`: current draft status, filenames, provenance and measured file properties.

Use one reusable card/profile layout. Derive unrecorded silhouettes in the UI from the same approved portrait later. The existing 64-pixel export target remains provisional until a real native-grid export and small-size review.

## Collaboration preferences

The user wants to iterate on visible design drafts before production. Future file deliveries should also be flat ZIPs, with brief merge instructions. ChatGPT prepares work/files; the user uploads them to Claude for repository integration. Do not restart GitHub connection/MFA setup. No API credentials are needed for this art batch.
