# Bird-Dex (BirdQuest): notes for Claude sessions

Owner: Joseph (manages everything from his phone via the Claude app). Plain English, UK spelling. The app is for his brother; the demo area is Chorlton, Manchester, and the brother's real location and logging app are NOT confirmed.

## Product in one line
"Where could I go today, within my driving limit, to look for birds missing from my collection?" Pixel-art map, real species, illustrated BirdDex, nearby reports, drive-time filter. Visual target: `research/design/BirdQuest_Concept_Board.png` (Map / BirdDex / Bird profile, bottom tabs Map · BirdDex · Journal).

## Where things are
- `BUILD_PLAN.md`: **start here when building.** Design principles from the wireframe, architecture, JSON contracts, milestones M0–M8 with tickets tagged [C] (cheap model fine) or [S] (use a stronger model), gotchas and the status table. Update its status table at the end of each milestone.
- `PLAN.md`: the strategy and settled decisions behind it.
- `research/BirdQuest_Build_Handoff.md`: the active consolidated brief (terms-of-use findings, architecture, acceptance criteria). Takes precedence over anything older.
- `research/art-rendering/`: art contract, asset manifest (22 planned, 0 made), map theme rules, agent briefs, read-only validator. Specification only: not a renderer.
- `skills/`: copied from JONeillio/Evens-model on 7 Nov 2026. Read the relevant one before starting that kind of work (`free-api-budgeting`, `phone-first-pwa`, `github-pages-data-pipeline`, `validate-model-before-trusting`). Hosting is decided: GitHub Pages + scheduled GitHub Action (PLAN.md D1), so `github-pages-data-pipeline` applies in full. Only publish compact derived data, never raw eBird responses.
- **Art direction (locked 7 Nov 2026): Bold Pixel** (chunky square clusters, strong dark outline, bright species colours; the woodcut row was NOT chosen). Joseph's flow: ChatGPT makes draft art and sends flat ZIPs; he uploads them here. Drafts live in `research/art-drafts/bold-pixel/` (3 anchors: robin, kingfisher, grey heron) and `.../expansion-v1/` (second batch, 14:06 on 7 Nov: 9 birds, 3 markers, 4 scenery, grass; its own README, manifest and CLAUDE_HANDOVER.md). All 1254 px masters, not on a clean grid, individually unapproved. Water and woodland textures were listed but NOT in the upload: ask Joseph to resend. `python scripts/art/prepare_sprite.py DRAFT.png OUT.png` makes the 64x64 runtime sprite (output in `public/assets/birds/<id>/adult-portrait-draft.png`); add `--tight --fit N` for markers and scenery (no padding, so the bottom centre is the anchor). Converted map art is in `public/assets/map/{markers,scenery,patterns}/` and registered in `src/art/mapAssets.ts` (native sizes, integer scales only). Used now: pixel pin (small sites), selected pin, target flag. Ready for M4 but unused: tree, conifer, bush, reeds, grass tile (not yet checked seamless on the map). `src/art/portraits.ts` lists which 12 species use a real portrait (robin, kingfisher, heron, blue tit, great tit, blackbird, mallard, mute swan, wren, great spotted woodpecker, kestrel, buzzard; tests check the ids and sizes); everyone else gets a generated placeholder (`src/art/birds/`, 12 templates, 32x32 at 2x).
- `research/archive/`: earlier foundation plan and next-model handoff (historical; the active handoff wins), plus `design-tokens.json` and `contracts/domain.ts`, the proposed starting point for tokens and app types. Anchor bird briefs: `research/art-rendering/art/prompts/anchor-birds.md`.
- App code (M0 done): Vite + React 19 + TypeScript, base path `/Bird-Dex/`, hash routing. `src/styles` tokens + components CSS, `src/art` pixel sprite renderer + icons, `src/state` zustand prefs, `src/ui` shared components, `src/features/*` screens, `#/dev/ui` and `#/dev/art` are the component and bird-art galleries; `src/data/catalogue/starter-dex.v1.json` is the 104-species Starter Dex (zod schema in `src/data/schema.ts`); `src/features/birddex` and `src/features/bird` are the BirdDex and profile screens. `pipeline/` holds `probe.ts`, `map-audit.ts`, `run.ts` (placeholder until M5), `lib/http.ts` (redacting fetch helper).
- Commands: `npm run dev | build | typecheck | lint | test`; `npm run probe`, `npm run map-audit` (need network, so run them as Actions tasks).
- Actions: `.github/workflows/deploy.yml`. Tasks: deploy, refresh, probe, map-audit, taxonomy-check. Dispatch with `gh api -X POST repos/JONeillio/Bird-Dex/actions/workflows/deploy.yml/dispatches -f ref=main -f 'inputs[task]=probe'`. Read results from the job log (`gh api repos/JONeillio/Bird-Dex/actions/jobs/JOB_ID/logs`): artifact downloads and the Pages settings API are blocked from this sandbox.

## Hard rules (from the handoff)
- Provider keys (`EBIRD_API_KEY`, `ORS_API_KEY`) stay server-side. Never in client bundles (no `VITE_` variables), never in git, chat, logs, screenshots or manifests. This repo is public. Never write raw account/status payloads to disk.
- GitHub Actions secrets are set for this repo, but they only reach workflows that explicitly read them. They do not configure a deployed app.
- eBird: personal, non-commercial use; show attribution with source links at the point of display; do not commit or publish raw eBird responses or bulk datasets.
- Routing: use `https://api.heigit.org/openrouteservice/v2` (not the old openrouteservice.org host). Attribution: "© openrouteservice by HeiGIT | Data from OpenStreetMap". Do not send precise home/GPS coordinates to the hosted router: routing starts from a selected public point, labelled "driving from [start point]".
- Public reports never award collection progress. Only explicit import or logging does. Demo data is labelled and never counts toward real achievements.
- Unknown or failed routes are "unknown", never 0 minutes. GeoJSON/routing is `[longitude, latitude]`.
- Real personal exports go in `private-data/` (gitignored), never in the repo.
- Don't create paid subscriptions, domains or a public launch as a side effect. Ask Joseph before switching providers or spending beyond a free plan.

## Facts learned
Verified by the T0.6 probe and map audit on 7 Nov 2026 (Actions runs 42374672764 and 42374679116).

eBird (key works, header `X-eBirdApiToken`, no rate-limit headers, 5 parallel calls all 200, calls take 80-250 ms):
- Greater Manchester is region code `GB-ENG-MAN` (named "Manchester" in `/ref/region/list/subnational2/GB-ENG`). 344 hotspots via `/ref/hotspot/GB-ENG-MAN?fmt=json` (84 KB). `/ref/hotspot/geo?lat&lng&dist=40` returned 900 hotspots (219 KB), so geo reaches well beyond the county.
- Hotspot fields: locId, locName, lat, lng, countryCode, subnational1Code, subnational2Code, latestObsDt, numChecklistsAllTime, numSpeciesAllTime.
- `/data/obs/geo/recent?lat&lng&dist=25&back=14` is one call for a whole area: 118 records = 118 distinct species (latest record per species, confirmed). Fields: comName, sciName, speciesCode, howMany, lat, lng, locId, locName, locationPrivate, obsDt, obsReviewed, obsValid, subId. No observer names. Prefer this for the nearby layer.
- `/data/obs/{locId}/recent?detail=full` also returns `firstName`, `lastName`, `userDisplayName`. Do not use `detail=full` and never keep or publish observer names.
- Taxonomy `/ref/taxonomy/ebird?fmt=json&locale=en_GB&cat=species`: 11,201 species, 3.4 MB. Fetch rarely, filter to what the Starter Dex needs, never publish whole.

openrouteservice (key works, host `https://api.heigit.org/openrouteservice/v2`):
- One-to-many matrix with 20 hotspots took 0.7 s, counted as one request. Headers `x-ratelimit-limit: 500` (per day) with `x-ratelimit-remaining` and `x-ratelimit-reset` (epoch seconds). Response keys: sources, destinations, durations, distances, metadata. Drive times to those 20 hotspots from Chorlton Green: 7 to 47 minutes, no nulls. Still treat null as "unknown".
- Budget: 500 requests a day is plenty for one matrix per start point per refresh.

OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`):
- Style v8, 111 layers (16 fill, 67 line, 25 symbol, 1 fill-extrusion, 1 raster, 1 background), 42 KB. Vector source `openmaptiles` (TileJSON `https://tiles.openfreemap.org/planet`, zoom 0-14). Tile URLs carry a dated build, so always go via the TileJSON, never hard-code.
- Tile at z14 over Chorlton: 77 KB, `access-control-allow-origin: *`, long cache. Glyphs also CORS-open. Glyph fonts are Noto Sans stacks, so map labels will not be pixel font unless we host our own glyphs (decision for M3/M4).
- Source layers used: park, landuse, landcover, waterway, water, aeroway, transportation, building, boundary, water_name, poi, transportation_name, aerodrome_label, place.
- Classes seen in style filters: landcover grass/wood/wetland/sand/ice; landuse cemetery/hospital/pitch/residential/school/track; waterway river; transportation motorway/trunk/primary/secondary/tertiary/minor/street/service/path/pedestrian/track/rail/link/transit. Pitch and park are available for green-space styling.
- Attribution string from TileJSON: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap".

Starter Dex names: `taxonomy-check` task (run 42376421641) confirmed all 104 scientific names against eBird's taxonomy. eBird renamed Wren to `Nannus troglodytes`, Reed Bunting to `Schoeniclus schoeniclus`, and lumps Lesser Redpoll into `Acanthis flammea` (Redpoll). Match by scientific name, not common name (eBird uses US spellings such as Gray Heron, Common Merganser for Goosander).

Map + live data (built 7 Nov 2026, first live run 42379334862): two preset locations in `pipeline/config/regions.json`, labelled "Location 1" (Chorlton Green) and "Location 2" (DA8 postcode-district centre). Joseph gave postcodes for these; never put postcodes or home addresses in the repo. Per location: `/ref/hotspot/geo?dist=50&back=14` returned 292 and 436 active hotspots; we keep the top 80 by `numSpeciesAllTime` and call `/data/obs/{locId}/recent?back=14&sppLocale=en_GB` for each (300 ms apart, no errors). 91–92 of 104 Starter Dex species were reported. ORS matrix for 80 destinations: one request, no nulls. Data is cached in Actions (`.cache/bq-data`), so a code-only push makes 0 API calls. MapLibre gotcha: after bundling it can't find its worker, so `MapCanvas.tsx` imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and calls `setWorkerUrl`. The sandbox can't reach tiles or the live site, so local screenshots show the plain-grass fallback with demo data.

Still unverified: eBird hotspot cap on `geo` (900 may or may not be a limit), whether eBird returns more than 14 days for `back`, and eBird quota in practice.

## Working rules
- Merge to `main` and push yourself once a milestone's checks pass (Joseph's request); pushing `main` redeploys the site.
- Test art inventory: `python research/art-rendering/tools/validate_assets.py --root research/art-rendering` (must report 0 production images until real art is approved; that is not an art QA pass).
- Build against demo fixtures first, probe real APIs cheaply before designing around them, and record what each endpoint really returns and costs here.
- Joseph often can't run commands: prefer GitHub Actions `workflow_dispatch` tasks (probe, rebuild) he can tap from his phone.
