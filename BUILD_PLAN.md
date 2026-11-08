# BirdQuest build plan (execution)

Written 7 Nov 2026 by the planning session for the model that will build the app. `PLAN.md` is the strategy; this file is the order of work, the design decisions and the tickets. If they disagree, this file wins for *how*, `research/BirdQuest_Build_Handoff.md` wins for *rules* (terms, privacy, attribution).

---

## Part A. How to use this plan (read first, every session)

1. Read `CLAUDE.md`, then this file's Part B (principles) and the milestone you are on. Look at `research/design/BirdQuest_Concept_Board.png` before any UI work.
2. Work one ticket at a time, in order. Each ticket lists files, steps and an **acceptance check**. A ticket is done only when its check passes and `npm test` is green.
3. Branch per milestone (`m1-birddex`), commit per ticket, then fast-forward `main` and push yourself when the milestone's checks pass. Joseph has asked Claude to merge to `main` directly; no pull requests needed. Pushing `main` redeploys the site.
4. At the end of each milestone: update the **Status** table at the bottom of this file and the "Where things are" list in `CLAUDE.md` (layout, commands, facts learned).
5. Never guess provider facts. If a ticket says "verify in probe", read the probe output (Part E, T0.6) or ask. Record every verified fact in `CLAUDE.md` under "Facts learned".
6. Stop and ask Joseph (one short question) only when: a ticket needs a provider/account/spend decision; a terms-of-use rule would be bent; a visual choice changes the wireframe's look; or the same failure happens 3 times.

### Which model for which ticket

Tickets are tagged **[C]** cheap model is fine (well-specified UI, CRUD, tests, wiring) or **[S]** use a stronger model (judgement, taste, or correctness that is hard to test). If you are a cheap model and hit an [S] ticket, do the mechanical parts, leave a `TODO(S):` note, and tell Joseph to switch model for that ticket.

### What this workspace can and can't do

- `npm install` works (the package registry is reachable). Most other websites, including eBird, HeiGIT and OpenFreeMap, are **blocked from the shell**. Anything that needs the internet runs inside a GitHub Action, and you read its output (Part E, "Running Actions from the workspace").
- You probably can't see the live map rendered here. Visual checks happen on Joseph's phone (Samsung S22 Ultra, Chrome, ~412 px wide). Each visual milestone ends with a **phone review**: give Joseph the link and 3–5 specific things to look at, and ask for screenshots.
- `gh workflow run` may fail (no GraphQL). Use the REST form shown in Part E.

---

## Part B. Thought leadership: what the wireframe is really asking for

The concept board has three screens: Map, BirdDex and Bird profile. Read past the pixels and it makes a handful of product decisions. Build to these; they matter more than any single colour.

**B1. The Map is a quest board, not a map app.** The most important element on the Map screen is not the map: it is the bottom card, "Kingfisher · Find a new bird · View spot". That card *is* the product question ("where could I go today, within my driving limit, to look for birds missing from my collection?") answered in one tap. Build it as **Today's Quest**: the best site within the chosen drive limit, ranked by unrecorded birds reported there, with one "lure" bird shown large. Everything else on the Map screen supports or explains that card.

**B2. Pins are places; birds are the lure.** The wireframe draws birds inside map pins. The handoff forbids implying live bird positions. Resolve it like this: a pin is always a **birding site** (an eBird hotspot); the picture inside it is that site's lure bird (your target if one was reported there, otherwise the scarcest unrecorded one), plus an amber "3 NEW" badge. The site sheet then lists every reported bird with the date it was last reported. Honest, and still feels like spotting wild creatures.

**B3. Seen vs caught.** The original Pokédex separates "seen" from "caught". BirdQuest has the same three honest states, and the BirdDex card should show them:
- **Unrecorded**: grey silhouette, name always visible (the wireframe shows "Kingfisher" under its silhouette, so never hide names behind "???").
- **Reported nearby**: still a silhouette, plus a small radar/binoculars badge meaning "reported within your drive limit in the current window". Tapping goes to Find nearby. This turns public data into motivation without ever awarding progress.
- **Recorded**: full colour plus the green tick, as on the wireframe. Only an explicit log or import does this.

**B4. One map, two skins.** Adventure and Field are not two maps. Build **one MapLibre style that contains both skins' layers** and toggle their visibility. Camera, selection, filters and markers survive the toggle for free, because nothing is reloaded. (Calling `setStyle` would lose custom images and complicate state; don't.)

**B5. A Dex you can finish.** "24 recorded" on the wireframe implies a denominator. Use a curated **Starter Dex of about 100 UK species**, numbered in field-guide (taxonomic) order like Pokédex numbers (#001 Mute swan …). It is fixed and versioned, so progress means something and never changes as you pan the map. Birds outside it still get logged, under "Outside the Starter Dex".

**B6. The reveal is the reward.** The single most important 1.5 seconds in the app is the moment a silhouette fills with colour after "Log a sighting". Spend polish there before anywhere else: silhouette, a flash, a pixel sparkle, "Robin recorded! #023" and an optional chime. Reduced motion gets a calm crossfade instead.

**B7. Honesty is part of the game, not a disclaimer.** The wireframe already stamps "DEMO DATA" as a little tag. Use the same visual language for every truth label: "Last reported 2 days ago", "34 min from Chorlton Green", "Drive time unknown", "Updated 3 h ago". Diegetic labels, not grey footnotes.

**B8. Art must never block the build.** Real 64×64 portraits will arrive slowly. So the app ships with **parametric placeholder birds** from day one: a few hand-made pixel body templates (songbird, tit, thrush, duck, swan, heron, raptor, woodpecker, kingfisher, gull, pigeon, crow) coloured per species from a small colour map. A robin-template-plus-robin-colours already reads as a robin at 64 px. When an approved portrait exists, the loader swaps it in. Silhouettes are derived from whichever image is used.

**B9. Small, fast, phone-first.** Under 400 KB of app code before map tiles, readable in sunlight, thumb-reachable controls, works one-handed in a hide. The map is the heaviest thing; lazy-load MapLibre so BirdDex opens instantly.

---

## Part C. Architecture

```
            GitHub Action (deploy.yml)                         Phone (static site on GitHub Pages)
 ┌───────────────────────────────────────────────┐        ┌──────────────────────────────────────┐
 │ secrets: EBIRD_API_KEY, ORS_API_KEY            │        │ React app (Vite build)                │
 │ pipeline/ (TypeScript, run with tsx)           │        │  ├─ reads /data/*.json (public)        │
 │  ├─ eBird: hotspots + recent reports           │  JSON  │  ├─ MapLibre + OpenFreeMap tiles       │
 │  ├─ ORS: drive times from preset start points  │ ─────▶ │  ├─ Starter Dex (bundled JSON)         │
 │  ├─ join to Starter Dex, validate (zod)        │        │  └─ IndexedDB: YOUR logs, targets,     │
 │  └─ write dist/data/*.json (derived only)      │        │      imports (never leaves the phone)  │
 │ cache: normalised snapshot (actions/cache)     │        └──────────────────────────────────────┘
 └───────────────────────────────────────────────┘
```

Key decisions (settled; don't revisit without asking):

1. **Data is not committed to git.** The pipeline writes derived JSON straight into the build output (`dist/data/`) and deploys it. The last normalised fetch is kept in the Actions cache (private to the repo's workflows) so code-only deploys rebuild with **zero API calls**. This keeps eBird data out of public git history, which is the main terms-of-use risk of a public repo.
2. **One workflow does everything** (`deploy.yml`: test → data → build → deploy). Reason: pushes made with the Actions token don't trigger other workflows, so a separate "refresh data" workflow that commits would never redeploy the site.
3. **Personal data never goes to a server.** IndexedDB on the phone; backup is a JSON file download.
4. **Preset regions and start points** (in `pipeline/config/regions.json`). Routing only ever starts from these public points. "Driving from Chorlton Green", never from GPS.
5. **Stack:** Vite + React + TypeScript, MapLibre GL JS, zustand (UI and filter state), idb (IndexedDB), zod (validating published JSON and imports), papaparse (CSV import), vite-plugin-pwa (offline shell), vitest (tests), fontsource for self-hosted fonts. Versions on npm on 7 Nov 2026: react 19.3, vite 8.3, maplibre-gl 6.16, zustand 5.1, idb 8.0, zod 4.6, vite-plugin-pwa 2.0, vitest 5.1, tsx 4.23, typescript 7.0. Use whatever `npm create vite@latest` installs for React-TS; if a plugin's peer dependencies clash, pin the older compatible major and note it in `CLAUDE.md`.

### Repo layout (target)

```
index.html, vite.config.ts, package.json, tsconfig*.json
src/
  main.tsx, App.tsx              shell: top banner, tab bar, hash router, sheets host
  styles/tokens.css, global.css, components.css
  domain/types.ts                from research/archive/contracts/domain.ts, trimmed to what's used
  domain/collection.ts           derive recorded/unrecorded/reported-nearby (pure, tested)
  domain/ranking.ts              site ranking, lure choice, drive filter (pure, tested)
  data/catalogue/starter-dex.v1.json   the ~100-species Starter Dex
  data/published.ts              fetch + zod-validate /data/*.json; demo/live flag
  data/personal/db.ts            idb wrapper: encounters, prefs, importBatches
  data/importers/ebird-csv.ts, generic-csv.ts
  art/pixel.ts                   pixelSprite(): grid + palette -> canvas/dataURL (tested)
  art/birds/templates.ts         placeholder body templates
  art/birds/placeholder.ts       species -> placeholder portrait
  art/portraits.ts               approved asset lookup -> fallback to placeholder
  art/scenes.ts                  habitat backdrops for the profile
  features/map/                  MapView, style/{base,field,adventure}.ts, patterns.ts, SiteMarker, SiteSheet, QuestCard, Filters
  features/birddex/              DexScreen, DexCard, SetChips
  features/bird/                 BirdProfile, LogSheet, Reveal
  features/journal/              JournalScreen, EntryEditor, ImportFlow
  features/settings/             SettingsScreen, Credits, Backup
  state/store.ts                 zustand: ui + filters (persisted to localStorage "bq.prefs")
public/
  demo/data/…                    demo copies of the published JSON (clearly isDemo:true)
  assets/birds/…                 approved portraits only (from research art pipeline)
pipeline/
  run.ts, ebird.ts, ors.ts, build.ts, probe.ts, map-audit.ts, budget.ts
  config/regions.json
tests/                           vitest (unit + pipeline with synthetic fixtures)
scripts/art/prepare_sprite.py    draft PNG -> 64×64 runtime sprite
.github/workflows/deploy.yml
```

`research/` stays as reference; don't import from it at runtime except copying the art manifest when M7 starts.

---

## Part D. Contracts

### D1. Published JSON (written by the pipeline, read by the app)

`/data/index.json`
```json
{
  "schema": 1,
  "generatedAt": "2026-11-07T06:40:00Z",
  "isDemo": false,
  "regions": [{
    "id": "greater-manchester",
    "label": "Greater Manchester",
    "centre": [-2.28, 53.44],
    "zoom": 10,
    "startPoints": [{ "id": "chorlton-green", "label": "Chorlton Green", "point": [-2.2836, 53.4413] }],
    "file": "region/greater-manchester.json"
  }]
}
```

`/data/region/<id>.json`
```json
{
  "schema": 1,
  "regionId": "greater-manchester",
  "generatedAt": "2026-11-07T06:40:00Z",
  "isDemo": false,
  "windowDays": 14,
  "coverage": { "hotspotsListed": 412, "hotspotsActive": 160, "reportsFetchedFor": 120, "truncated": true,
                "note": "Showing the 120 most recently active hotspots within about 110 km." },
  "sites": [{
    "id": "L123456",
    "name": "Pennington Flash CP",
    "point": [-2.546, 53.497],
    "url": "https://ebird.org/hotspot/L123456",
    "latestObsDate": "2026-11-06",
    "speciesAllTime": 214,
    "access": "unknown",
    "reports": [{
      "speciesId": "common-kingfisher",
      "ebirdCode": "comkin1",
      "name": "Kingfisher",
      "sciName": "Alcedo atthis",
      "obsDate": "2026-11-05",
      "obsTime": "08:10",
      "count": 1,
      "checklistUrl": "https://ebird.org/checklist/S000000000",
      "reviewed": false
    }]
  }],
  "drive": {
    "computedAt": "2026-11-07T06:40:00Z",
    "byStart": { "chorlton-green": { "L123456": { "status": "ok", "s": 2040, "m": 31200 },
                                     "L999999": { "status": "unknown" } } }
  },
  "unmatchedSpecies": [{ "sciName": "…", "name": "…", "sites": 2 }]
}
```

Rules: all points are `[lng, lat]`. `speciesId` is `null` for birds outside the Starter Dex (keep them; the site sheet shows "Other birds"). `obsTime` is `null` when eBird gives a date only; never invent midnight. `count` is `null` when eBird says "X". A missing drive entry and `"unknown"` are both "Drive time unknown", never 0. **Nothing else** from eBird is published: no observer names, no raw payloads, no checklist comments.

Validate with zod in **both** places: the pipeline refuses to deploy invalid JSON; the app shows a friendly error state if a file fails validation. Keep the schemas in `src/data/schema.ts` and import them from the pipeline (shared code, one source of truth).

### D2. Starter Dex entry (`src/data/catalogue/starter-dex.v1.json`)

```json
{
  "id": "european-robin",
  "dexNo": 57,
  "name": "Robin",
  "sciName": "Erithacus rubecula",
  "family": "Old World flycatchers",
  "sets": ["garden", "woodland"],
  "habitat": "garden",
  "art": { "template": "songbird", "palette": { "back": "#8A6A4A", "breast": "#D9663A", "belly": "#EDE3CF", "bill": "#3A2E28", "legs": "#6B4E3A" } },
  "portraitAssetId": "bird.european-robin.portrait.adult.v1"
}
```

Sets (curated, may overlap; not taxonomy): `garden`, `woodland`, `wetland`, `coast`, `raptors`, `farmland-upland`. `habitat` picks the profile backdrop. `dexNo` follows taxonomic order (ducks/swans first, songbirds last, as in a field guide).

### D3. Personal records (IndexedDB `birdquest`, demo collection in a separate DB `birdquest-demo`)

Stores: `encounters` (from `PersonalEncounter` in the archived `domain.ts`, keep `isDemo` out: the DB name is the separation), `prefs` (targets/favourites by speciesId), `importBatches` (id, source, filename, rowCount, importedAt, idempotencyKeys). Collection status is **always derived** from encounters plus the Dex, never stored.

---

## Part E. Shared mechanics

### Design tokens (from the concept board + `research/archive/design-tokens.json`)

```css
:root {
  --paper:#F7F2DE; --panel:#FFFBEF; --ink:#213B32; --forest:#35614B; --sage:#A9C58A;
  --grass:#D2DDA9; --water:#7DB8C6; --water-deep:#438CA8; --road:#EAD9AC;
  --discovery:#D8A84B; --coral:#C96E53; --muted:#526454; --silhouette:#8E938A;
  --radius:12px; --border:3px; --tap:44px;
  --font-display:"Pixelify Sans", system-ui, sans-serif;  /* headings, banners, dex numbers only */
  --font-body:"Nunito", system-ui, sans-serif;             /* everything else, min 16px */
}
```

Component recipes seen on the board (build these once in `components.css`):
- **Panel**: paper/panel fill, 3px ink border, 12px radius, inner hairline (double-border look): `box-shadow: inset 0 0 0 3px var(--panel), inset 0 0 0 4px var(--ink)`.
- **Banner header** ("MAP", "BIRDDEX", "BIRD PROFILE"): full-width forest bar, cream uppercase display font with letter-spacing, small leaf sprig glyph either side (inline SVG or pixel sprite).
- **Segmented control** (Adventure | Field): ink outline pill; active half filled forest with cream text.
- **Chip** (30 min, Woodland, All): ink outline, rounded; active = forest fill. Horizontal scroll row on narrow screens.
- **Card** (Dex card): panel, 2px ink border, portrait centred at integer scale (`image-rendering: pixelated`), name below in body bold, green tick badge top-right when recorded.
- **Status pill** ("Not yet recorded", "24 recorded", "DEMO DATA"): small outline pill; DEMO DATA uses tiny display font and stays visible wherever demo data shows.
- **Primary button** (Find nearby): forest fill, cream text, icon left. **Secondary** (Listen, Log a sighting): panel fill, ink outline.
- **Tab bar**: three equal tabs with pixel icon + label; active tab is a filled forest block; respects `env(safe-area-inset-bottom)`.
- **Bottom sheet**: panel with grab handle, snaps to 40% / 90% height, swipe down or tap the backdrop to close; never covers the tab bar or attribution entirely.

Use the self-hosted fonts via `@fontsource/pixelify-sans` and `@fontsource/nunito` (OFL). Pixel font only at 18 px or above and never for long text.

### `pixelSprite` (the art workhorse)

`pixelSprite(grid: string[], palette: Record<string,string>, scale = 1): HTMLCanvasElement`: each character is one pixel, `.` is transparent, other characters map to palette colours. Also `toDataURL()` and `toImageData()` helpers (for `map.addImage`). Used for UI icons, map patterns, map pins, placeholder birds and scene tiles. Unit-test it (dimensions, transparency, unknown character throws).

### Running Actions from the workspace

```bash
# trigger (REST; works without GraphQL)
gh api -X POST repos/JONeillio/Bird-Dex/actions/workflows/deploy.yml/dispatches -f ref=main -f 'inputs[task]=probe'
# find the run, then read its log or download its report artifact
gh api 'repos/JONeillio/Bird-Dex/actions/runs?per_page=3' --jq '.workflow_runs[] | [.id,.status,.conclusion,.display_title] | @tsv'
gh run download <run_id> -R JONeillio/Bird-Dex -n probe-report -D /tmp/probe
```

Probe and audit tasks write a Markdown report to both the job summary (Joseph can read it on his phone under Actions) and an uploaded artifact (`probe-report`, `map-audit`) that you download. Reports contain **summaries only**: counts, field names, example IDs, timings. Never keys, account payloads or raw response bodies.

---

## Part F. Milestones and tickets

Order matters. M0–M2 need no API at all, so the app is useful and shareable (with demo data) early. The probe (T0.6) runs early because its answers shape M3 and M5.

### M0. Foundations (goal: a deployed, empty-but-styled app at https://joneillio.github.io/Bird-Dex/)

**T0.1 [C] Scaffold.** `npm create vite@latest . -- --template react-ts` (keep existing files). Add deps from Part C. Set `base: '/Bird-Dex/'` in `vite.config.ts` (**case-sensitive**; must match the repo name). Scripts: `dev`, `build`, `preview`, `test` (vitest run), `typecheck`, `pipeline` (`tsx pipeline/run.ts`). Add `.nvmrc` = 22. *Check:* `npm run build` and `npm test` pass; `dist/index.html` references `/Bird-Dex/assets/…`.

**T0.2 [C] Deploy workflow.** `.github/workflows/deploy.yml`:
- Triggers: `push` to `main`; `workflow_dispatch` with input `task` choice `[deploy, refresh, probe, map-audit]` (default `deploy`); `schedule` **commented out** until M5 passes (lesson from Evens: add cron only after a manual run works).
- `permissions: { contents: read, pages: write, id-token: write }`; `concurrency: { group: pages, cancel-in-progress: false }`.
- Steps: checkout → setup-node 22 (npm cache) → `npm ci` → `npm test` → (data step, filled in M5; for now copy `public/demo/data` into place) → `npm run build` → `actions/upload-pages-artifact` (path `dist`) → `actions/deploy-pages`.
- Probe/audit tasks skip build/deploy.
- Pages source: try `gh api -X POST repos/JONeillio/Bird-Dex/pages -f build_type=workflow`. If refused, ask Joseph to set **Settings → Pages → Build and deployment → Source: GitHub Actions** (one toggle).
*Check:* the site loads on Joseph's phone.

**T0.3 [C] Tokens, fonts, global CSS** per Part E. Body background paper, ink text, safe-area padding, `font-variant-numeric: tabular-nums`, `prefers-reduced-motion` handling, focus rings visible. *Check:* a `#/dev/ui` route renders every component recipe (panel, banner, chips, segmented, pills, buttons, card, sheet) on one page.

**T0.4 [C] `pixelSprite` + tests** (Part E). Draw the three tab icons (map, bird, open book) and the leaf sprig as 16×16 grids with it. *Check:* tests green; icons show in `#/dev/ui`.

**T0.5 [C] App shell.** Hash router (`#/map`, `#/dex`, `#/journal`, `#/bird/:id`, `#/settings`, `#/dev/*`), no router library. Banner header per screen; Map/BirdDex/Journal tab bar matching the board; settings via a small gear in the banner. zustand store with persisted prefs (`bq.prefs`, try/catch around localStorage, defaults for missing fields). Lazy-load the map feature. *Check:* back button works between tabs and profile; layout fits 360–430 px without horizontal scroll.

**T0.6 [S] Probe and map audit (needs only the existing secrets).** `pipeline/probe.ts`, run by the `probe` task. Use header `X-eBirdApiToken` and base `https://api.ebird.org/v2`. Answer and report:
1. `GET /ref/region/list/subnational2/GB-ENG`: the county codes covering Greater Manchester and a ~110 km ring (Cheshire, Lancashire, Merseyside, Derbyshire, West and South Yorkshire, Staffordshire, Cumbria edge, North Wales via `GB-WLS`). Record the codes.
2. `GET /ref/hotspot/{county}?back=14&fmt=json` for the Greater Manchester code: count, field names, presence of `latestObsDt` and `numSpeciesAllTime`.
3. `GET /data/obs/{locId}/recent?back=14` for 3 busy hotspots: fields, whether it's one row per species (latest only), date format, `howMany` "X" handling, `subId` present.
4. Whether one request accepts several locations (`/data/obs/L1,L2,…/recent` or the `r` parameter, up to 10). This decides the request budget.
5. `GET /ref/taxonomy/ebird?fmt=json&locale=en_GB&species=<a few codes>`: confirm `sciName`/`comName` fields. Don't save the full taxonomy.
6. Rate behaviour: time per call, any 429s. Record that eBird publishes no quota we could verify; be polite (≤ 1 request/second).
7. ORS: `POST https://api.heigit.org/openrouteservice/v2/matrix/driving-car` with `Authorization: <ORS_API_KEY>`, body `{ "locations": [[lng,lat] start, …dests], "sources":[0], "destinations":[1..n], "metrics":["duration","distance"], "units":"m" }` for Chorlton Green to 20 hotspots. Confirm durations in seconds, distances in metres, `null` for unroutable, and the error shape. Known limit: 3,500 routes per request (1×N counts N). Note that the old `api.openrouteservice.org` host should not be used.

`pipeline/map-audit.ts` (task `map-audit`): fetch `https://tiles.openfreemap.org/styles/liberty`, follow its vector source to the TileJSON, and list source layers and the `class`/`subclass` values used by the Liberty style's filters (expected OpenMapTiles schema: `water`, `waterway`, `landcover` (wood, grass, wetland, sand, farmland…), `landuse`, `park`, `transportation`, `building`, `place`, `transportation_name`, `water_name`). Record glyphs URL and font names available, and the attribution string.

*Check:* both reports downloaded, facts written into `CLAUDE.md` under "Facts learned (probe 1)". Tell Joseph the headline answers in 4 lines.

### M1. Starter Dex and BirdDex (goal: the middle screen of the wireframe, on any phone)

**T1.1 [S] Starter Dex catalogue.** About 100 species realistically findable within 90 minutes of Manchester over a year or two (common residents, regular winter and summer visitors, a few "boss" birds like kingfisher, dipper, peregrine). Fields per D2. Scientific names must be correct: after M5's pipeline exists, a `taxonomy-check` step must match every `sciName` against eBird and fail loudly on a miss. Include the 12 species in the art manifest. Include palette colours per species for the placeholder renderer (diagnostic colours win over the UI palette, per the art contract). *Check:* JSON validates against a zod schema; dexNo is 1..N with no gaps; every set has at least 6 birds.

**T1.2 [S] Placeholder bird renderer.** 12 body templates as 32×32 grids with region letters (`o` outline, `b` back, `w` wing, `h` head/cap, `c` cheek, `t` throat/breast, `u` belly, `k` bill, `l` legs, `e` eye, `x` tail), rendered at 2× to the 64×64 contract size. Species palette fills regions; missing regions fall back to the template default. Silhouette mode = every non-transparent pixel `--silhouette`. Templates: songbird, tit, thrush/blackbird, finch, duck, swan/goose, heron (tall), raptor, woodpecker, kingfisher (long bill), gull/wader, pigeon/crow. *Check:* `#/dev/art` shows all 100 birds in colour and silhouette at 1×, 2× and 3×. Joseph agrees robin, blue tit, kingfisher and heron are recognisable (phone review).

**T1.3 [C] BirdDex screen.** Banner "BIRDDEX"; title "Your BirdDex"; progress pill "24 / 100 recorded" with a thin progress bar; chips row `All · Garden · Woodland · Wetland · Coast · Raptors · Farmland · Nearby now · Targets`; search box; 3-column grid of Dex cards (portrait or silhouette, name, `#057` in small display font, tick badge if recorded, binoculars badge if reported nearby). Sorted by dexNo. "Outside the Starter Dex" section at the bottom when relevant. *Check:* 360 px shows 3 columns without overflow; filtering is instant; long names wrap to 2 lines.

**T1.4 [C] Bird profile.** Back arrow + name in the banner area as on the board; large portrait (integer scale) on a **habitat backdrop** (`art/scenes.ts`: sky band, pixel tree line, ground/water band, built from 16×16 pixel tiles for garden, woodland, wetland, coast and farmland-upland); status pill ("Not yet recorded", or "Recorded · first 12 Oct 2026 · 3 sightings"); chips for sets and a **Target** toggle (coral when on); buttons **Find nearby** (primary), **Listen** (secondary; opens a xeno-canto search for the scientific name in a new tab, marked ↗, with no audio packaged), **Log a sighting** (full-width secondary). Below: "Reported nearby" (sites within your drive limit, date and minutes; empty state if none) and "Your sightings". *Check:* Find nearby opens the Map focused on this species (works with demo data after M3).

**Phone review 1** (after M1): BirdDex and profile look like the board; names readable; silhouettes clear.

### M2. Your records (goal: log → reveal → reload, the core reward)

**T2.1 [C] Personal DB.** `data/personal/db.ts` with idb: add/update/delete encounters, set target, list by species/date. `domain/collection.ts`: pure `deriveCollection(dex, encounters, reports, filters)` → per species `{status: recorded|unrecorded, reportedNearby, firstDate, lastDate, count}`. Deleting the last encounter makes a bird unrecorded again. *Check:* unit tests for derivation including date-less imported records.

**T2.2 [C] Log a sighting sheet.** Date (default today), place (pick from nearby sites, or type a label; never store GPS unless the user taps "use my location" and it stays on the phone), seen / heard / both, notes. Save → reveal. *Check:* saving survives reload.

**T2.3 [S] Reveal.** Full-screen overlay: silhouette → 2-frame white flash → colour portrait with pixel sparkles → "Robin recorded! #057" → if it completes a set, a second beat "Garden set 8/12". Optional chime via Web Audio (off by default; first tap unlocks audio; mute toggle in settings; see `skills/phone-first-pwa`). Reduced motion: crossfade only, no flashing. *Check:* under 1.6 s; can be skipped with a tap.

**T2.4 [C] Journal.** Banner "JOURNAL"; entries grouped by date (newest first), thumbnail, name, place, seen/heard; tap to edit or delete (confirm); filter "This year". Import and Backup buttons at the top (wired in M6 and T2.5). *Check:* edit and delete update the Dex immediately.

**T2.5 [C] Backup, restore and demo collection.** Settings: "Download backup" (JSON with schema version), "Restore from backup" (validate with zod, preview counts, merge without duplicates), and "Show a demo collection" toggle that switches to the `birdquest-demo` DB pre-filled with 24 birds (so friends can see a filled Dex) with DEMO DATA stamps everywhere. A plain sentence: "Your records live on this phone only. Download a backup now and then." *Check:* backup → clear site data → restore gives identical Dex.

### M3. The Map, Field skin, demo data (goal: the left screen of the wireframe, working end to end)

**T3.1 [C] Demo published data.** `public/demo/data/index.json` and `region/greater-manchester.json` in exactly the D1 shape, `isDemo: true`, ~25 **fictional-but-plausible** sites placed on real green spaces around south Manchester, invented report dates, drive times for 2 start points, and a few `unknown` drive entries and one site with no reports (to exercise edge cases). Do not copy real eBird data into demo files. `data/published.ts` loads `/data/` first and falls back to `/demo/data/`; validates with zod; exposes `isDemo`. *Check:* the DEMO DATA stamp shows on the map and quest card whenever demo is in use.

**T3.2 [S] Map view + Field skin.** `MapView` with maplibre-gl, our own style object built in code (`style/base.ts`: OpenFreeMap vector source + glyphs from the map audit; `style/field.ts`: quiet conventional palette using the tokens, labels in the available Noto fonts). Attribution control always visible, compact, above the sheet: "© OpenFreeMap, © OpenMapTiles, Data © OpenStreetMap contributors" with links (use the exact string from the audit). North-up, rotation and pitch disabled. *Check:* real streets, river and parks around Chorlton render; no layer errors in the console.

**T3.3 [C] Site markers.** HTML markers (simplest to style and accessible; fine up to ~150 sites, revisit if more): a cream teardrop pin with an ink outline containing the lure bird's 24 px icon, and an amber "3 NEW" badge. Button elements with labels ("Pennington Flash, 3 unrecorded birds, 34 minutes"). Tap target ≥ 44 px. Selected pin grows and gets a forest ring. At zoom < 10 show only the top 40 by rank. *Check:* tapping selects and opens the sheet.

**T3.4 [C] Site sheet.** Name; "34 min from Chorlton Green" (or "Drive time unknown"); "Updated 3 h ago · reports from the last 14 days"; access label ("Access unknown, check before you go" when unknown); list of reported birds: portrait/silhouette, name, NEW tag if unrecorded, ☆ target marker, "last reported 2 days ago", link to the eBird checklist ↗; "Other birds" collapsed group for outside-Dex reports. Buttons: **Directions** (opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`; no API key; note that the order here is lat,lng), **View on eBird** ↗. Footer credit: "Sightings: eBird (ebird.org)". *Check:* every report shows its date; unknown drive time never reads 0.

**T3.5 [C] Filters and start point.** Header shows the start point ("Chorlton Green ▾", tap to pick another preset). Segmented Adventure | Field (wired in M4; Field only for now). Drive chips 30 / 60 / 90 min (default 60): a site passes if `drive.status === "ok" && s <= limit*60`. Toggles "Unrecorded only" (default on) and "Targets". Species focus chip ("Kingfisher ✕") when arriving from Find nearby. A **List** button shows the same filtered sites as a list (also the fallback if the map fails). Counter "14 sites · 3 with unknown drive time". *Check:* `domain/ranking.ts` unit tests for: the limit boundary, unknown excluded but counted, unit conversion (seconds → whole minutes rounded up for display), `[lng,lat]` sanity (UK: lng −9..2, lat 49..61).

**T3.6 [S] Today's Quest card** (the B1 card). Ranking per handoff: most distinct unrecorded Dex species reported at the site, then newest relevant report, then shortest drive. Lure: a target reported there; else the unrecorded species reported at the fewest sites in the region (scarcest), tie → newest. Card: lure portrait, "3 new birds at Pennington Flash", "34 min · last report yesterday", **View spot ▶**, small "1 of 5 ›" to page through the next best. Empty states: "Nothing new within 60 min this fortnight. Try 90 min?" (with the chip), and "No sightings data yet". *Check:* matches a hand-calculated ranking on the demo data (unit test).

**Phone review 2:** full journey on demo data: Map → quest card → site sheet → bird → Log → reveal → reload.

### M4. Adventure skin (goal: the board's look, on real geography)

**T4.1 [S] Runtime patterns.** `features/map/patterns.ts` draws 32×32 seamless tiles with `pixelSprite` at pixelRatio 2 and registers them with `map.addImage`: `pat-grass` (light grass flecks), `pat-wood` (rounded canopy blobs in two greens with ink-dark gaps: this tile alone gives most of the wireframe's forest look), `pat-water` (two-tone ripple dashes), `pat-reeds` (for wetland landcover). Seamless at the edges (test by drawing a 3×3 repeat in `#/dev/art`). Re-register on `styleimagemissing`.

**T4.2 [S] Adventure layers** in `style/adventure.ts`, using only classes confirmed by the map audit:
- background `--grass`; `landcover` wood → `pat-wood` fill + darker outline line layer; grass/park → `pat-grass`; wetland → `pat-reeds`;
- `water` → `pat-water` fill + `--water-deep` outline; `waterway` lines in `--water` with width by zoom;
- `landuse` residential → pale cream blocks; `building` (zoom ≥ 14) → warm roof colour (`--coral` mixed toward cream) with an ink outline;
- `transportation` → cream (`--road`) fill over a light brown casing (not black: the board's roads are soft); paths as dotted cream lines;
- labels: place names and water names only, plus major road names at zoom ≥ 14; ink text with a cream halo.
Both skins live in one style; `setSkin(name)` flips `visibility` on the `adv-*` and `fld-*` layer groups and toggles a CSS class on the markers container. *Check:* toggling keeps camera, selection, open sheet and filters (add a test of the store; check the rest by eye).

**T4.3 [C] Pixel pins** for Adventure (the teardrop drawn with `pixelSprite`, lure bird inside); Field keeps the simple pin.

**T4.4 [S] Tune with Joseph** using the board side by side: Chorlton (Mersey and water park) at z12/z14, a London park at z14 (`research/art-rendering/rendering/review-scenes.json`). Record decisions in `docs/rendering/adventure-notes.md`.

*Deferred, not in v1:* decorative tree sprites placed in a stable world grid (handoff A2), and the strict low-resolution render pass (A3). Only start these if Joseph still wants more after T4.4; they're [S] work.

### M5. Live data (goal: real reports and drive times, refreshed twice a day)

**T5.1 [C] Pipeline skeleton.** `pipeline/run.ts --mode demo|reuse|refresh`. `regions.json` holds region ids, centres, eBird county codes (from the probe), start points (public landmarks: verify coordinates on a map; Chorlton Green and Manchester Piccadilly to start), radius cap (110 km) and caps (`maxHotspots: 160`, `maxReportSites: 120`). Snapshot (normalised, never raw) at `.cache/snapshot.json`. Workflow data step:
- `push`/`deploy`: restore cache (`actions/cache/restore`, key prefix `bq-snapshot-`); if hit, `--mode reuse` (0 requests); else `--mode demo`.
- `refresh`/schedule: restore, `--mode refresh`, then `actions/cache/save` with key `bq-snapshot-${{ github.run_id }}` (cache keys are immutable, so use a new key each time).
- If refresh fails partway: deploy the last snapshot with `coverage.note` saying the data is stale, never a half-built file.

**T5.2 [S] eBird adapter** (`pipeline/ebird.ts`): one thin client that logs every call (endpoint, status, ms; never the key), waits ≥ 1 s between calls, 15 s timeout, one retry on network error only, stops for the run on 401/403/429. Steps: hotspots per county with `back=14` → straight-line prefilter ≤ 110 km from the region centre → rank by `latestObsDt` then `numSpeciesAllTime` → cap → recent reports per hotspot (batched if the probe confirmed multi-location) → map to D1 shape, joining to the Starter Dex by `sciName` (then by common name, then `null`). `taxonomy-check`: report Dex species never matched (likely a name split) in the run summary.

**T5.3 [C] ORS adapter** (`pipeline/ors.ts`): for each start point, one matrix request with `sources:[0]` and all candidate sites as destinations (well under 3,500). Store `{status:"ok", s, m}`, or `"unknown"` for `null`/error. Cache drive results per (startId, siteId) for 30 days in the snapshot; only route new sites. Sites' own coordinates are used (labelled approximate); a reviewed-entrance table (`pipeline/config/entrances.json`) can override later.

**T5.4 [C] Build + validate + publish.** Write `dist/data/index.json` and region files; zod-validate; print a summary to the job summary (sites, reports, unmatched species, requests used, time taken). Attribution fields included. *Check:* `npm test` includes pipeline tests on **synthetic** fixtures (`tests/fixtures/`, clearly fake IDs) for: join, null drive, date-only obs, "X" counts, coordinate order.

**T5.5 [C] Turn on the schedule** after two successful manual refreshes: `cron: "40 5 * * *"` and `"40 15 * * *"` (UTC, comment says so; a few minutes' delay is normal). Bump nothing else.

**Phone review 3:** real data. Pick 3 sites Joseph knows (e.g. Pennington Flash, Sale Water Park) and sanity-check the birds and drive times.

### M6. Bring in his history

**T6.1 [S] eBird "My eBird data" CSV import** (format to be confirmed from a real export; expected columns include Submission ID, Common Name, Scientific Name, Date, Time, Location, Count). Flow: pick file → parse in the browser (papaparse) → preview (matched to Dex, outside Dex, unmatched/ambiguous, duplicates) → confirm → write. Idempotency key = `ebird:` + Submission ID + `:` + Scientific Name; re-importing the same or a newer export adds only new rows. Keep `originalTaxonText`. Hybrids, "sp." and slashes go to "needs review", never auto-counted. *Check:* importing the same synthetic file twice changes nothing; unit tests cover each row type.

**T6.2 [C] Generic list import** (one species per line or a simple CSV with name/date): for BirdTrack exports or a pasted list; no invented dates.

**T6.3 [C]** Import history in the Journal (batches with counts, "undo this import").

Real exports are tested only on Joseph's/his brother's phone or in `private-data/` (gitignored). Never commit them.

### M7. Real art (runs whenever drafts arrive; never blocks M1–M6)

**T7.1 [C] `scripts/art/prepare_sprite.py`** (Pillow): input a draft PNG plus asset ID → trim → fit within 56×56 (keeping the 4 px safe margin) using nearest-neighbour → quantise to ≤ 24 colours → binary alpha (threshold 128) → pad to 64×64 → write `public/assets/birds/<species>/adult-portrait-v1.png` → set the manifest entry to `draft` with provenance (tool, date, prompt file). Then run `validate_assets.py`. Copy the art pack's `art/` folder to the repo root when this starts, so the manifest paths resolve.

**T7.2 [C] Contact sheet** in `#/dev/art`: each portrait at 1×/2×/4× on paper, dark and card backgrounds, next to its placeholder; silhouette version beside it.

**T7.3 [C] Loader:** `art/portraits.ts` uses an approved portrait when the manifest says `approved`, else the placeholder. Approval is the integrator's review (identity, grid, alpha, in-app), recorded in the manifest.

Joseph's part: generate the 3 anchors (robin, kingfisher, grey heron) with an image tool using `research/art-rendering/art/prompts/anchor-birds.md`, upload them, then freeze the grid (64 unless the heron really needs 96) before the other 9.

### M8. Polish and hand-over

- **T8.1 [C] PWA:** manifest (name BirdQuest, theme `--forest`, background `--paper`), pixel icons generated with a Pillow script (192, 512, maskable), vite-plugin-pwa with network-first data and an offline shell. "Add to home screen" hint in Settings.
- **T8.2 [C] First run:** pick region and start point → "Import your list" or "Start fresh" → land on the Map. One screen each, skippable.
- **T8.3 [C] Credits screen** plus point-of-display credits (already in M3/M4): eBird, OpenFreeMap/OpenMapTiles/OpenStreetMap, openrouteservice by HeiGIT (CC BY-SA 4.0 for routing results), fonts (OFL).
- **T8.4 [C] Accessibility pass:** contrast of ink on sage/grass ≥ 4.5:1 for text, labels on every icon button, focus order in sheets, reduced motion everywhere, no meaning by colour alone (NEW badge has text; tick has a label).
- **T8.5 [S] Quest trail (stretch, it's on the board):** for the top 5 sites per start point, fetch one ORS directions geometry per refresh, simplify it, publish it, and draw it as a dotted cream line from the start point when a site is selected. Label it "approximate route".
- **T8.6 [C] Hand-over note** for the brother: link, Add to home screen, how to import, back up monthly.

### M9. Lewis's feedback (8 Nov 2026)

Lewis is the most experienced birder testing the app and is based in **Location 2**. Treat his needs as the bar: someone who goes out often, already uses eBird/Merlin, and knows the local sites. What he said, and what it means:

- "Filter for birds and drive time and get route planners. That would be huge." Drive filter is live; the gap is a **day route** through several sites.
- "Sometimes I have a bird I want to look for but can't be bothered filtering eBird for recent sightings." **Species-first search** is his main pain.
- "Could you build an API that extracts data from eBird?" (about getting his Merlin data in). The eBird API has **no endpoint for a user's life or year list**; Merlin's life list includes his eBird checklists. So his history comes in by **eBird "Download My Data" CSV import** (M6), re-imported now and then. Scraping eBird as him is off the table (terms).
- "I really like the layout." Keep it.
- "Integrate some achievements, kinda like gym badges in Pokémon."
- Implied: a 104-bird Starter Dex will be nearly full on his first import, so he needs a list that never runs out.

**T9.1 [S] Find a bird — done 8 Nov.** `src/domain/findBird.ts` (bird keys: Dex id or `ebird:<code>`, so any reported bird is searchable; `birdIndex`, `searchBirds` word-start matching, `whereSeen`, `rarities`, `limitFor`). Map: "Find a bird" chip opens `FindBirdSheet` (type any bird → sites, latest report, nearest drive; empty box lists rarities). Choosing a bird focuses the map, widens the drive limit to fit its nearest report, ranks sites by that bird's newest report then drive, and says how many more sites are beyond the limit. Profile: "Reported nearby" lists the newest six sites with date, count and drive; tapping one opens the map on that site. Tests: `tests/findbird.test.ts`.

**T9.2 [S] Rarities — done 8 Nov, needs a refresh to show.** Pipeline makes one extra call per location: `/data/obs/geo/recent/notable?dist=50&back=14&detail=simple`. `mergeNotable` (in `pipeline/build.ts`) marks rarities at listed sites, adds up to `maxRaritySites` (30) extra public hotspots that had one (before routing, so they get drive times), and **never publishes private locations**. Records awaiting review are kept and labelled "Rare · unconfirmed". Report schema gained optional `notable` and `unconfirmed`. Record what the endpoint really returns in CLAUDE.md after the first refresh.

**T9.3 [S] His history and a list that never runs out.** Pull M6 forward (eBird CSV import, idempotent, preview). Add **Year list** mode (resets 1 Jan; "first of the year" reveal) and a **full UK list** beyond the Starter Dex, using eBird taxonomy for birds outside it. Check with his first real export whether Merlin-only saves are in it. Ask Lewis for: his eBird export, and whether he logs in eBird, Merlin or BirdTrack.

**T9.4 [S] Gym badges.** Client-side only, derived from encounters (never from public reports, demo never counts). Each location gets about 8 "gyms": well-known sites, each with a short list of signature birds and a boss bird; log enough of them at that site → badge. Plus set badges (complete Wetland, Raptors…) and year-list milestones (50/100/150). A Badges case screen in the style of the board.

**T9.5 [S] Route planner.** Pick targets (or "most new birds") and a time budget; the Action precomputes an ORS site-to-site matrix for each location's top sites (one request; check the 3,500-route limit); the phone picks an order greedily and opens Google Maps with waypoints (no key). Label it as a plan from recent reports, not a guarantee.

### Backlog (good ideas, not v1)

Year list and "first of the year" badges; seasonal sets ("Winter visitors" shown Nov–Mar); eBird "notable" reports as a gold-star flag; badges for sites visited; a shareable "new bird" card image; real calls once licences are checked; more regions on request; cross-device sync only if he asks.

---

## Part G. Testing and definition of done

- **Unit tests (vitest), required:** pixelSprite; collection derivation; ranking, lure choice and drive filter; zod schemas against demo files; importers (idempotency, row types); pipeline joins on synthetic fixtures; coordinate-order guards. Don't write tests that only mirror markup.
- **Every milestone:** `npm run typecheck && npm test && npm run build` green; the deploy succeeds; a phone review where marked.
- **Acceptance (from the handoff), checked at M5/M8:** choose a start point and limit, filter unrecorded/targets, inspect reports, open directions; Adventure/Field keeps state; reports show dates, source and freshness; collection changes only on log/import; import is idempotent; unknown routes, sparse coverage and failures are visible; demo never counts; backup/restore works; no key in the bundle or git (`grep -r "EBIRD\|ORS_API" dist` must find nothing but the attribution text); credits visible in both skins; works at 360 px with reduced motion and audio off by default.

## Part H. Gotchas (each of these will bite)

1. Vite `base` must be `/Bird-Dex/` exactly; asset and data fetches must use `import.meta.env.BASE_URL`, never a leading `/data/…`.
2. Commits pushed by the Actions token don't trigger other workflows: keep fetch, build and deploy together in `deploy.yml`.
3. GeoJSON, MapLibre and ORS use `[lng, lat]`; Google Maps directions and eBird responses use `lat`, `lng` fields. Convert only at adapter edges.
4. eBird `obsDt` has no timezone and may be date-only; `howMany` may be absent ("X"). Recent-obs endpoints return the **latest record per species**, not every sighting: never claim frequency or abundance.
5. ORS matrix: durations in seconds, `null` = unroutable. Never `?? 0`.
6. MapLibre fill patterns need power-of-two tiles; register images before layers use them and on `styleimagemissing`.
7. `image-rendering: pixelated` on every sprite `<img>`/`<canvas>`; scale by integers only.
8. localStorage and IndexedDB can throw (private mode, storage full): wrap and show a message, don't crash.
9. Android back gesture owns the screen edges: sheet swipe gestures start from the handle, not the edge.
10. Never log or upload `process.env` objects; never echo secrets in workflow steps; don't print raw responses in probes.
11. Demo fixtures must be obviously fictional (IDs like `LDEMO01`) so they can't be mistaken for real records.

## Part I. What Joseph needs to do (short list)

1. Settings → Pages → Source: **GitHub Actions** (only if Claude can't do it via the API in T0.2).
2. After T0.6: read the 4-line probe summary; nothing else needed.
3. Phone reviews 1–3 (5 minutes each, send screenshots).
4. When you can: your brother's region, the app he logs birds in, and one export.
5. Whenever convenient: generate the 3 anchor birds with an image tool using the briefs, and upload them.

---

## Status

| Milestone | State | Notes |
|---|---|---|
| M0 Foundations | done 7 Nov 2026 | Shell, tokens, pixelSprite, router, prefs, UI kit, deploy workflow, probe and map audit run green. Site goes live once Pages source is set to GitHub Actions. |
| M1 Starter Dex + BirdDex | built 7 Nov 2026, awaiting phone review 1 | 104-species Starter Dex (all scientific names verified against eBird), BirdDex screen, bird profile with habitat scenes, 12-template placeholder birds, 3 real Bold Pixel draft portraits (robin, kingfisher, grey heron), demo collection toggle. Review needs the site live (Pages setting). |
| M2 Your records | built 8 Nov 2026 | Log a sighting sheet (bird, date, place, seen/heard/both, notes, optional photo shrunk to ~640 px JPEG), IndexedDB records via `RecordsStorage` (memory fallback with a warning), collection derived from encounters, first-sighting reveal, Journal screen (delete with confirm, backup reminder after 30 days), backup/restore JSON v1 with merge-by-id preview, Settings. Demo collection stays separate and is switched off when a real sighting is saved. 98 tests pass. Not yet done: BirdTrack/eBird history import (M6), editing an existing sighting. |
| Phone extras | built 8 Nov 2026, unverified on a device | 8-bit Web Audio sounds (off by default), haptics, tilt parallax and foil shimmer (`--tilt-x/--tilt-y`), bird radar ("Point me there": geolocation + compass, straight-line only), shake for next spot, wake lock, install as app (manifest, icons, hand-written `public/sw.js`: shell cache-first, `/data/` network-first, never caches other origins). Sensors, audio and install prompt can only be checked on a real phone. |
| M3 Map, Field, demo | built 7 Nov 2026, hierarchy pass 8 Nov | MapLibre on OpenFreeMap Liberty recoloured to the palette (one skin for now), Location 1 / Location 2 switch, 30/60/90 chips, New to me toggle. 8 Nov: one always-selected site (coral marker with its featured bird), compact site card with a strip of recently reported birds and an expandable details sheet, small pins for ordinary sites, flags for targets, screen-overlap clustering into "N spots", short display names, clearer counts ("N species new to you"), framing that leaves the card clear. Floating bird sprites removed. Demo data at `/demo/data/` is the fallback. No List view yet. |
| M4 Adventure skin | not started | |
| M5 Live data | live 7 Nov 2026 | `pipeline/run.ts` + `build.ts`: per location, eBird hotspots active in 14 days within 50 km, top 80 by species, recent reports per hotspot (en_GB names), one ORS matrix per start point. Derived JSON only, kept in the Actions cache (`bq-data-<run id>`), never git. First run: 162 eBird calls + 2 ORS, 77 s; ~80 sites and ~3,400–3,800 reports per location. Schedule on: 05:40 and 15:40 UTC. |
| M6 Import | not started | |
| M7 Real art | started | Style locked: Bold Pixel (7 Nov). 12 bird portraits converted to 64×64 and in the app (3 anchors + 9 from `expansion-v1/`), plus converted markers, scenery and a grass tile in `public/assets/map/` (`src/art/mapAssets.ts`). All still drafts: individual approval pending. Missing from the batch: water and woodland textures. 92 birds still use generated placeholders. |
| M8 Polish + hand-over | not started | |
| M9 Lewis's feedback | started 8 Nov 2026 | T9.1 Find a bird and T9.2 rarities built. Next: T9.3 import + year list, T9.4 gym badges, T9.5 route planner. |
