# BirdQuest project plan

Written 7 Nov 2026 from `research/BirdQuest_Build_Handoff.md`, the concept board and the Evens skills. Status today: specifications only. No app, no live API check, 0 of 22 art assets made.

**The executable version of this plan is `BUILD_PLAN.md`** (tickets, contracts, order of work). Where the order differs, follow BUILD_PLAN.

Target: the three-screen concept board (Map with Adventure/Field and 30/60/90 min chips, BirdDex with recorded cards and silhouettes, Bird profile with Target / Find nearby / Listen / Log a sighting).

## 0. Decisions to settle first (about an hour of Joseph's time)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Hosting shape | **SETTLED 7 Nov (Joseph): GitHub Pages + scheduled GitHub Action, as in Evens**, so friends just open a link. The Action holds the eBird and routing keys (already added as repo secrets), fetches data for a fixed list of regions and public start points, and publishes derived JSON; the phone only reads it. Consequences: (a) only preset regions/start points work, so "move to London" means London is on the list; (b) no live per-user routing, which fits the public-start-point rule anyway; (c) publishing data on a public site means keeping it to compact derived summaries with eBird attribution and source links, never raw API dumps (check the eBird terms before anything bulk); (d) no access gate needed, because visitors never touch the APIs. A Cloudflare Worker stays an option later if live arbitrary-city queries become important. |
| D2 | Front-end stack | **Vite + React + TypeScript + MapLibre**, IndexedDB for personal records, built and deployed by a GitHub Action (Pages source set to "GitHub Actions", one settings toggle). Evens' vanilla JS suited one screen; this app has filters, selection that survives a style toggle, an importer and a catalogue. Phone-first PWA rules from `skills/phone-first-pwa` still apply. Stay no-build vanilla JS only if Joseph prefers the Evens way. |
| D3 | Brother's details | Which logging app (Merlin / eBird / BirdTrack), his region, and one personal export when he can send it. His region decides which preset areas the Action covers. Not blocking until step 4. |
| D4 | Push access | **Done 7 Nov.** Claude GitHub App is installed for Bird-Dex and pushes work. Evens-model is not covered yet; add it to the app's repo list if Claude should push there. |
| D5 | Art route | The concept board shows the style. Individual 64×64 sprites need an image-generation tool plus cleanup; Claude cannot make these in this environment. Decide where drafts come from. Art must not block the build. |

## 1. Feasibility probes (no UI; can run in parallel)

Evens lesson: probe cheaply and write down what the API really does before designing around it.

1. **eBird probe.** A tap-to-run GitHub Action (`workflow_dispatch`, key from the existing secret) that fetches hotspots and recent observations near Chorlton and prints a summary only: counts, field names, latest-per-species behaviour, rate behaviour. Raw responses are not committed. Output: an "eBird facts" section in CLAUDE.md.
2. **Routing probe.** Same pattern against `api.heigit.org`: one origin (a public landmark, not a home address) to about 20 destinations. Check matrix limits, units (seconds, metres) and error behaviour.
3. **Map source audit (handoff A0).** Read the real OpenFreeMap TileJSON and source layers; record the woodland/park/water/road mapping instead of guessing property names.
4. **Anchor birds (handoff B0).** Robin, kingfisher, grey heron at 64 px (and 96 if needed), then freeze one grid. Briefs are in `research/art-rendering/art/prompts/anchor-birds.md`; once one anchor is accepted it should be used as a style reference for the rest.

Exit: a short facts doc for each, and a go/no-go on the 30/60/90 drive filter.

## 2. Demo-mode vertical slice (the real build starts here)

Order within the slice:
1. Scaffold, design tokens (start from `research/archive/design-tokens.json` and the art contract palette), domain types (start from `research/archive/contracts/domain.ts`), PWA shell, three tabs, labelled demo fixtures.
2. Finite Chorlton-area species catalogue with stable species IDs and a fixed denominator.
3. BirdDex grid and Bird profile using placeholders with species names always visible.
4. Journal and "Log a sighting", stored in IndexedDB, with the collection reveal. Reload must keep it.
5. Map in **Field** style on real OpenFreeMap tiles, with site markers and a site sheet (demo reports).
6. **Adventure** style pass on the same map; toggle keeps camera, filters and selection.

Exit: map → site → bird → log → reveal → reload works on a phone, entirely on demo data.

## 3. Go live

1. Scheduled Action (`workflow_dispatch` with `probe` / `rebuild` tasks, as in `skills/github-pages-data-pipeline`) with eBird and routing adapters; validate responses into app-owned types; timeouts, bounded retries, request budgets and a saved snapshot so rebuilds cost 0 requests (`skills/free-api-budgeting`). Refresh a few times a day, not on every page view. Publish compact derived JSON only (per-site species, dates, drive minutes, source links), never raw responses or account payloads.
2. Preset start points per region (public landmarks, e.g. a town centre); one-to-many drive times from each; 30/60/90 filter; unknown route = "unknown".
3. Site sheet with real reports, dates and source links; "unrecorded" and target filters; ranking (distinct unrecorded species, newest report, drive time).
4. Attribution at the point of display (eBird on sightings, HeiGIT/OpenStreetMap on routes).
5. Stale, sparse-coverage and provider-failure states visible.
6. Add a second preset region (London) to prove the map and data follow the selected area.

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

- eBird terms: a public repo and public site mean anything published is visible to everyone. Keep to derived summaries with attribution and source links, and re-read the data terms before publishing anything bulk (see D1).
- Pages-only limits: preset regions and start points only; data is as fresh as the last Action run; scheduled jobs can start a few minutes late.
- Adventure-map quality: may need the stricter pixel-render experiment (handoff A3); budget for a spike.
- Unverified eBird "recent" endpoint semantics: test before using for multi-site claims.
- Routing origin privacy: keep the public-start-point rule until the provider position is resolved.
- AI-generated sprites need grid cleanup and species checks, not just resizing.

## Hosting check (8 Nov 2026): GitHub Pages is still right

Checked against GitHub's published limits on 8 Nov: a Pages site may be up to 1 GB, has a soft 100 GB a month bandwidth limit, and the 10-builds-an-hour limit does not apply to sites built by an Actions workflow (ours is). The repo is about 33 MB of history (mostly `research/` art masters) and the site about 5 MB, so there is lots of room. eBird and Pages both require non-commercial use.

Revisit hosting when any of these becomes true (none needs action now):
1. **Records need to follow people between phones, or rivals need live scores.** Records live only in each phone's browser storage; share codes and backup files cover this for now. Next step would be a small free-tier backend with sign-in (for example Supabase, or Cloudflare Workers with D1), which brings privacy duties because people's sightings would leave the phone.
2. **Anyone wants a place that isn't a preset location.** Only the Action holds the eBird key, so new places mean editing `regions.json`. Live lookups for any place would need a small proxy that keeps the key secret (for example a Cloudflare Worker).
3. **Money of any kind** (charging, ads, selling access). Pages is not for commercial sites and eBird data needs written permission for commercial use, so both would have to change first.
4. **eBird call volume.** About 164 calls per refresh, twice a day, for two locations; each new location adds about 80 per refresh. eBird publishes no quota, so add locations slowly and watch for 429s in the refresh summary.
5. **Repo size.** Keep art masters out of `public/` and consider moving `research/art-drafts/` masters to a release or separate repo if the repo nears 1 GB.

Known weak spot today: browsers can clear site storage, especially on iPhone when the app isn't added to the home screen. AUTOPILOT P13 asks the browser for persistent storage, and the backup reminder stays.

## Files and where they live

All supplied material is now in the repo. Research sits under `research/` (per its README) rather than `docs/`, which stays free as a possible Pages root.

- `research/art-rendering/art/prompts/anchor-birds.md`: the three anchor bird briefs.
- `research/archive/`: the earlier foundation plan, next-model handoff, `design-tokens.json` and `contracts/domain.ts`. The handoff takes precedence where they differ, but the domain types and tokens are the intended starting point for step 2 (they are proposals, not tested provider schemas).
