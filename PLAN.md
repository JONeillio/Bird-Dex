# BirdQuest project plan

Written 7 Nov 2026 from `research/BirdQuest_Build_Handoff.md`, the concept board and the Evens skills. Status today: specifications only. No app, no live API check, 0 of 22 art assets made.

Target: the three-screen concept board (Map with Adventure/Field and 30/60/90 min chips, BirdDex with recorded cards and silhouettes, Bird profile with Target / Find nearby / Listen / Log a sighting).

## 0. Decisions to settle first (about an hour of Joseph's time)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Hosting shape | **Static site + small Cloudflare Worker (free tier)**, as the handoff proposes. Evens' "Actions write JSON, Pages serves it" works only for a fixed list of areas and would put eBird data into a public repo, which the eBird terms discourage. A Worker also lets the brother move to London and get that area live. Cost: a free Cloudflare account, and the two keys re-entered there as Worker secrets (the GitHub secrets do not carry over). Fallback if you want zero new accounts: Pages + Actions with 2–3 preset regions and derived summaries only. |
| D2 | Front-end stack | **Vite + React + TypeScript + MapLibre**, IndexedDB for personal records. Evens' vanilla JS suited one screen; this app has filters, selection that survives a style toggle, an importer and a catalogue. Phone-first PWA rules from `skills/phone-first-pwa` still apply. |
| D3 | Brother's details | Which logging app (Merlin / eBird / BirdTrack), his region, and one personal export when he can send it. Not blocking until step 4. |
| D4 | Push access | The Claude GitHub App is not installed on this repo, so Claude cannot push. Install it (or reconnect GitHub in Claude settings). Until then, commits stay local and the plan is also saved in the Claude project. |
| D5 | Art route | The concept board shows the style. Individual 64×64 sprites need an image-generation tool plus cleanup; Claude cannot make these in this environment. Decide where drafts come from. Art must not block the build. |

## 1. Feasibility probes (no UI; can run in parallel)

Evens lesson: probe cheaply and write down what the API really does before designing around it.

1. **eBird probe.** A tap-to-run GitHub Action (`workflow_dispatch`, key from the existing secret) that fetches hotspots and recent observations near Chorlton and prints a summary only: counts, field names, latest-per-species behaviour, rate behaviour. Raw responses are not committed. Output: an "eBird facts" section in CLAUDE.md.
2. **Routing probe.** Same pattern against `api.heigit.org`: one origin (a public landmark, not a home address) to about 20 destinations. Check matrix limits, units (seconds, metres) and error behaviour.
3. **Map source audit (handoff A0).** Read the real OpenFreeMap TileJSON and source layers; record the woodland/park/water/road mapping instead of guessing property names.
4. **Anchor birds (handoff B0).** Robin, kingfisher, grey heron at 64 px (and 96 if needed), then freeze one grid. `art/prompts/anchor-birds.md` was not in the uploaded files; it needs recreating or sending.

Exit: a short facts doc for each, and a go/no-go on the 30/60/90 drive filter.

## 2. Demo-mode vertical slice (the real build starts here)

Order within the slice:
1. Scaffold, design tokens (green/cream palette from the art contract), PWA shell, three tabs, labelled demo fixtures.
2. Finite Chorlton-area species catalogue with stable species IDs and a fixed denominator.
3. BirdDex grid and Bird profile using placeholders with species names always visible.
4. Journal and "Log a sighting", stored in IndexedDB, with the collection reveal. Reload must keep it.
5. Map in **Field** style on real OpenFreeMap tiles, with site markers and a site sheet (demo reports).
6. **Adventure** style pass on the same map; toggle keeps camera, filters and selection.

Exit: map → site → bird → log → reveal → reload works on a phone, entirely on demo data.

## 3. Go live

1. Worker with eBird and routing adapters; validate responses into app-owned types; timeouts, bounded retries, short caching, request budgets (`skills/free-api-budgeting`).
2. Explicit start-point picker; one-to-many drive times; 30/60/90 filter; unknown route = "unknown".
3. Site sheet with real reports, dates and source links; "unrecorded" and target filters; ranking (distinct unrecorded species, newest report, drive time).
4. Attribution at the point of display (eBird on sightings, HeiGIT/OpenStreetMap on routes).
5. Stale, sparse-coverage and provider-failure states visible.
6. Try a second city (London) to prove the map and data follow the user.

## 4. Personal history

eBird CSV export import: preview, species matching, duplicates flagged, idempotent, edit/delete, backup/restore. Test with the brother's real export and compare totals with his app. Exports stay in `private-data/`.

## 5. Art and polish (runs alongside 2–4 once the grid is frozen)

12 portraits in small batches, three terrain patterns, markers and decorations, then the optional scenery generator. Original UI tones via Web Audio, off until tapped. Real bird calls only after licences are checked, so "Listen" ships disabled at first. Accessibility and reduced motion.

## 6. Hand over to the brother

Hosted test on his phone, real data check, backup explained, credits visible. Nothing paid or public is launched without Joseph's say-so.

## Where I'd go beyond the wireframe

- **"Best trip today" card on the Map home**: top three sites for unrecorded birds within the limit. This is the product question answered in one glance, and the concept's "Find a new bird / View spot" card already points that way.
- **Sets and progress**: garden, woodland, wetland, raptors, coast, plus year list and "first of the year". Progress only moves on an explicit log.
- **Offline trip card**: save a site sheet for reserves with poor signal.
- **Later, not now**: eBird "notable" alerts, weather, real calls, cross-device sync.

## Risks to watch

- eBird terms: public repo + committed API data is the biggest trap (see D1).
- Adventure-map quality: may need the stricter pixel-render experiment (handoff A3); budget for a spike.
- Unverified eBird "recent" endpoint semantics: test before using for multi-site claims.
- Routing origin privacy: keep the public-start-point rule until the provider position is resolved.
- AI-generated sprites need grid cleanup and species checks, not just resizing.

## Known gaps in the files supplied

`art/prompts/anchor-birds.md` and `archive/` (earlier foundation pack and TypeScript contracts) are referenced but were not uploaded. Research is filed under `research/` (per its README) rather than `docs/`, which stays free as a possible Pages root.
