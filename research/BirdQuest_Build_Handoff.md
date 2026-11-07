# BirdQuest — implementation handoff

Prepared 7 November 2026. Read this document before implementing. It is self-contained; the earlier foundation pack and visual concept are useful companion material.

## 1. Brief and current state

Build a mobile-first birdwatching app for Joseph's brother. It should feel like a classic Pokémon-style handheld adventure: a pixel-art local map, real bird species to discover, an illustrated BirdDex, collection progress, nearby reports and destinations within driving range.

The product question is: **“Where could I go today, within my driving limit, to look for birds missing from my collection?”**

The user likes the generated BirdQuest concept board. Preserve its green/cream palette, illustrated real birds, square pixel-style framing and Map / BirdDex / Journal navigation. The board is aesthetic reference, with illustrative geography and demo records. It is not a working map, an actual report or a finished set of individual bird assets.

The current deliverables are planning documents, a design concept, proposed design tokens/domain types, and an art/rendering starter pack with a working read-only asset validator. The pack contains planned metadata, prompts and semantic map recipes; no production portraits, terrain images, atlas or map renderer have been supplied. No app, live API adapter, authenticated API check or personal-history importer has been implemented. The user has supplied the target repository `https://github.com/JONeillio/Bird-Dex`; its contents and configured keys have not been inspected in this session. GitHub write access is not authenticated here; no push has been performed.

Manchester/Chorlton is an editable demonstration area. The brother's location and actual logging app are unconfirmed. Merlin was mentioned as a possibility. Do not assume his home or that a Merlin account connection exists.

## 2. Repository setup

Use the existing repository **`JONeillio/Bird-Dex`** at https://github.com/JONeillio/Bird-Dex . `BirdQuest` is the working product name; `birdquest` was an earlier repo-name suggestion, not a request to create another repository. A private repo is a preference, not a requirement; GitHub Free supports private repositories. A public source repo is also suitable for this personal hobby project when keys, private records and restricted provider datasets are excluded. Source visibility and website visibility are separate choices. [R14]

Suggested description:

> A pixel-art birding adventure: discover recent sightings, plan nearby trips and build your BirdDex.

Put this document at `docs/BirdQuest_Build_Handoff.md` in the eventual repo. Create a normal project README when the implementation has actual run/build commands.

The user needs two provider keys for the initial live version. Keys belong in local or hosted secret settings, not in committed files, even in a private repository.

## 3. Initial services and credentials

| Service | Purpose | Setup | Proposed setting |
| --- | --- | --- | --- |
| eBird API | Recent observations, hotspots and species taxonomy | Cornell account and API key: https://ebird.org/api/keygen | Server secret `EBIRD_API_KEY` |
| openrouteservice / HeiGIT | Driving-time matrix; optional route geometry and isochrones | https://account.heigit.org/ | Server secret `ORS_API_KEY` |
| OpenFreeMap | Geographic vector map tiles | No account/key for the public instance | Configure tile/style URLs in the map code |
| MapLibre GL JS | Render and style the map | Software dependency, not a paid API account | Install during project setup |

OpenFreeMap explicitly documents a public instance without registration or API keys. Keep attribution and follow its current offline-download rules if implementing offline maps. [R4]

**No OpenAI, Claude, Google Maps, Mapbox or paid bird-news subscription is required by this first-version design.** Image production is separate from app operation. The normal app should work without an LLM call.

Optional later: xeno-canto for real calls, iNaturalist for supplementary observations/photos, NBN Atlas for historical UK records, and RSPB open data for reserve/habitat overlays. Do not make these account signups prerequisites for the first build. xeno-canto's official API/terms were blocked by its anti-bot page in research, so verify its current access and recording licences before integration.

GPS location comes from the browser's permission-based geolocation feature; it does not require a separate purchased location API. Support a manually selected area/pin when location permission is unavailable. Town-name search is an optional geocoding feature whose provider contract must be verified before implementation.

### Environment example

Create a committed `.env.example` containing placeholders only:

```dotenv
# Backend-only secrets. Leave these empty in version control.
EBIRD_API_KEY=
ORS_API_KEY=

# Proposed application configuration; implement and validate explicitly.
DATA_MODE=demo
EBIRD_BASE_URL=https://api.ebird.org/v2
ORS_BASE_URL=https://api.heigit.org/openrouteservice/v2
```

Use the selected backend's actual development-secret mechanism: for a Cloudflare Worker this may be an ignored `.dev.vars` file, and production secrets are Worker bindings. A frontend `.env.local` is not itself a secure backend. Never expose provider secrets through client-side build variables such as Vite's `VITE_` variables. GitHub Actions secrets are only useful when a CI workflow explicitly consumes them; they do not automatically configure runtime secrets in the deployed app. [R12]

Proposed `.gitignore` additions:

```gitignore
.env
.env.*
!.env.example
.dev.vars
.dev.vars.*
private-data/
node_modules/
dist/
.wrangler/
```

Exclude real personal exports, precise origin settings and downloaded provider datasets. Use deliberately synthetic fixtures for the initial demo, clearly labelled as such.

### Important current routing URL

Use the documented current base `https://api.heigit.org/openrouteservice/v2`, with the selected endpoint/profile appended. For example, the candidate matrix URL is `https://api.heigit.org/openrouteservice/v2/matrix/driving-car`; confirm against the current official API explorer before implementation.

The provider announced migration away from `api.openrouteservice.org` and scheduled its final retirement for 2–6 November 2026. Do not copy an old tutorial's hostname. This planning session did not test whether the old hostname is still responding. [R7]

## 4. Terms-of-use findings and resulting decisions

Checked 7 November 2026. This section distinguishes explicit provider wording from implementation judgments. Provider terms can change; retain the source links and check the terms accepted by the actual account before launch.

### eBird

The API terms expressly include non-commercial websites and mobile apps, require eBird attribution, prohibit key sharing and require written permission for commercial use. Commercial is defined broadly enough to include use by or for a for-profit entity, rather than only charging users. [R1]

The API terms also incorporate the Data Access Terms, which restrict passing on original datasets and distributing them in their original form. Those data terms have narrower purpose wording than the API's explicit app permission, so do not treat the service as an unrestricted open-data licence. [R1–R2]

For BirdQuest: keep the initial use personal/non-commercial, display attribution with source links, keep credentials server-side and do not commit/publish raw eBird responses or bulk datasets. Short response caching for efficiency is an engineering proposal, not an independently established storage permission. Review the applicable terms before building persistent archives or redistribution. A paid/advertising/business version needs a separate permission decision. No permission request has been sent.

### openrouteservice / HeiGIT

The **current** HeiGIT terms were read in the rendered account website. They license openrouteservice results under **CC BY-SA 4.0**, require attribution, restrict abusive/excessive use and prohibit transmitting personal data apart from account-management data. The provider's October 2026 staff clarification confirms commercial use is permitted on the Standard plan. [R3, R5]

Older provider staging terms still show CC BY 4.0. They are not the source to use for the current licence. Preserve the attribution and licence of routing outputs and assess share-alike obligations when distributing adaptations of those results. Do not assume this automatically determines the licence of every independent application-code file. [R3, R5, R13]

Required attribution wording from the current terms:

> © openrouteservice by HeiGIT | Data from OpenStreetMap

Link the data credit to OpenStreetMap's copyright page and include the applicable results-licence reference. Provider staff also confirm results may be stored/reused subject to the terms; refresh estimates appropriately rather than presenting old cached values as current. [R3, R6]

**Origin-location decision:** do not silently send precise GPS/home coordinates to the hosted routing service. The first beta can use a selected public start point, such as a town centre or public landmark, with reports labelled “driving from [start point]”. Keep personal logs and identity out of routing payloads. Rounding coordinates or removing a name is not by itself proof of anonymisation. Exact personal-origin routing needs a resolved provider/contract/privacy approach, or an alternative appropriately configured routing service, before activation. The map may still locate the user locally with permission; routing origin selection is a separate action.

### Attribution implementation

The Adventure skin must preserve map-source credits. Include eBird attribution by sightings/results and HeiGIT/OpenStreetMap attribution by routing results; retain licence metadata for downloaded/derived outputs and any media. A single generic “credits” screen must not hide attribution that is required at the point of display. Use text/link credits rather than provider logos unless their logo use is authorised.

## 5. The core experience

1. Choose an area and an explicit routing start point. Optionally import an existing bird list.
2. Open the local adventure map and select 30/60/90 minutes of driving, within validated source/search limits.
3. Toggle unrecorded birds, targets or a selected species.
4. Open a site sheet: recent reported birds, observation dates, approximate drive time, destination/access details and original report links.
5. Open directions to an appropriate entrance; explicitly log a personal bird encounter later.
6. Reveal the bird's illustrated collection card and update the journal.

Use “unrecorded” for birds missing from the app's known personal data. Public reports do not prove a bird is still present and never automatically award collection progress. A map visit alone does not record a bird.

### Screens

| Screen | Essential behaviour |
| --- | --- |
| Map | Area, routing origin, drive filter, report window, target/unrecorded filters, site clusters, list equivalent |
| Site sheet | Birds reported there, observation dates, travel estimate, access/entrance information and source links |
| BirdDex | Search, recorded/unrecorded cards, families, themed sets, stable catalogue denominator |
| Bird profile | Names, original pixel portrait/fallback, record status, personal history, target toggle, nearby sites, optional call |
| Journal | Personal encounter log, seen/heard basis, edit/delete, import history and backup |
| Settings | Origin preferences, imports, backup/restore, audio, reduced motion and credits |

Mobile main tabs: Map, BirdDex, Journal. Use bottom sheets for selected sites/birds. On desktop a side panel can accompany the map.

## 6. Dynamic adventure map, including travel to another city

**The map must work from geographic data and reusable styling rules. Do not pre-paint a separate whole-map image for every location.**

When the user moves from Manchester to London, load the appropriate map tiles and apply the same theme. Trees/textures are reusable assets; real geographic geometry determines where parks, water, roads and buildings are drawn. Refresh sighting searches for the selected area and calculate travel results from the explicit routing origin. Panning the map must not silently move that origin.

MapLibre supports sprites and image patterns, and OpenFreeMap supports a custom style JSON hosted with the app. These are verified building blocks; matching the concept's exact visual quality needs an implementation experiment. [R4, R8]

| Map layer | Adventure rendering |
| --- | --- |
| Woodland | Green ground, restrained pixel tree sprites/patterns inside mapped areas |
| Parks | Light grass texture with reduced detail at regional zoom |
| Rivers/lakes | Blue patterned water following actual outlines |
| Roads/paths | Cream shapes with clear edges and useful connectivity |
| Buildings | Simplified warm shapes, limited to close zoom |
| Birding sites | Reusable pixel markers at source site coordinates |
| Bird reports | Site-associated information, not fictional live bird positions |

Decorative placement should be stable as the camera moves. Preserve geographic accuracy and readable labels. Test mobile rendering before committing to a strict low-resolution shader or more complex procedural renderer.

Provide **Adventure / Field** modes for the same map state. Switching the style preserves camera, filters, selected site and routing data. Field mode uses a restrained conventional geographic view.

## 7. BirdDex, artwork and sound

Use a stable app-owned species ID mapped to versioned provider taxonomy identifiers. Keep common names, scientific names and aliases as data, not join keys. Use a finite versioned regional catalogue for progress, independent of the current map viewport. Imported species outside it remain available without corrupting its denominator.

Support taxonomy families for browsing, plus curated overlapping game-style sets such as garden, woodland, wetland, raptors and coast. These are not interchangeable with scientific classification.

Keep three independent states: collection status, target/favourite status, and recent reports within current filters. Show species names on unrecorded cards, even when the art is a silhouette.

Artwork is a separate production track. Start with robin, kingfisher and grey heron to establish a consistent style. Proposed portrait target: a transparent square asset on a 64×64 pixel grid, with consistent pose/outline/palette and reviewed real species markings. AI-generated drafts need final grid/size/quality validation. No individual production-ready bird sprites have been made yet.

Reuse one portrait for the profile, collection card, reveal and derived silhouette. Small map icons may need a simpler version. Reuse a few habitat backgrounds rather than designing an entire profile scene for every species. Missing art must not prevent a species from appearing.

Further proposed art set: blue tit, great tit, blackbird, wren, mallard, mute swan, great spotted woodpecker, kestrel and buzzard.

Separate optional original interface tones from real bird recordings. Keep audio off until enabled by a user action. Track each real call's creator, source, exact licence and reuse decision. Do not assume API access grants redistribution rights. Build no sound-recognition engine in this first version.

## 8. Data and technical architecture

Recommended portable stack: React + TypeScript, MapLibre, browser-local IndexedDB for personal records, and a small same-origin backend for eBird/routing requests and public-data caching. A Cloudflare Worker/static-assets deployment is a candidate. Follow the actual implementation environment's required starter/deployment workflow and current official documentation rather than forcing this suggestion.

Keep separate adapters for eBird and routing. Validate provider responses and expose app-owned types. Keep personal imports in the browser by default. Add authenticated cross-device sync only if later requested.

Core records: Species, RegionalCatalogue, BirdingSite, PublicObservation, PersonalEncounter, SpeciesPreference, DriveEstimate, ImportBatch and MediaAsset.

Important fields and joins:

- `speciesId` joins reports to personal collection; `siteId` joins destinations to travel estimates.
- Public reports keep provider IDs/source links, actual observation precision and a separate fetch time.
- Personal encounters keep source/import batch, optional date/place, seen/heard basis and editable notes.
- Drive estimates keep seconds/metres, routing origin, destination type, provider and calculation time. An error/unroutable result is unknown, not zero minutes.
- Assets keep species, creator, licence, attribution and approval status.
- Collection totals are derived from personal records and catalogue membership.

### Query strategy and important checks

Verify current official eBird endpoints/limits and a few real local responses before relying on them. Cornell's canonical Postman page did not render in research. Nearby recent endpoints may be summaries rather than complete site-by-site histories: test latest-per-species semantics before using results for multiple sites or report-frequency claims. [R9]

Use hotspot inventories plus bounded expansion for the supported search area. A geographic radius is not a drive-time boundary, and 90 minutes can extend beyond one nearby search request. Clearly identify any incomplete coverage.

Route one origin to many reviewed destinations; avoid an unnecessary all-to-all matrix. Initially bound work to about 50 candidate sites and recent-report fetches for about 20 eligible sites, then paginate/expand explicitly. These are proposed app budgets, not claimed provider limits.

Prefer reviewed car-park/entrance coordinates. A hotspot point might be in a lake or cover a large reserve. Label approximate destinations and restricted/unknown access. Retain sensitive-location generalisation supplied by the source.

Start with a seven-day reporting window, with observation dates visible. Proposed ranking: most distinct unrecorded species, then newest relevant report, then lower drive time; offer nearest/target sorts. Do not invent sighting probabilities or independent-observer counts.

Cache according to the resolved provider terms and configurable expiry; reuse results on local filter changes. Include timeouts, bounded retries, stale-data states and provider-request budgets. No background scheduler or alert automation has been requested.

## 9. Personal-history import

Begin with eBird's documented personal export plus manual logs. Merlin-saved records are private and can be accessed through eBird, but their presence/completeness in the brother's actual export must be tested. No supported complete third-party Merlin/eBird history-sync flow was established. [R10]

Flow: upload locally → preview → match species → flag unresolved rows/duplicates → confirm → import. Importing a file twice must not inflate records. Preserve original taxon text and source IDs. Handle list-only records without inventing dates; keep hybrids/subspecies/unmatched taxa for review. Editing/deleting the final record changes collection state correctly.

If he uses BirdTrack, use its documented personal Excel export instead of assuming an account API. [R11]

Provide local backup/restore. Clearly explain that browser-local records need backup until an optional cross-device sync system is built. Keep demo and real personal records completely separate.

## 10. Build sequence and checks

### First: feasibility evidence

1. Inspect the selected area's real eBird site/report coverage using an authorised key.
2. Build one genuine neighbourhood map in both styles and test on a phone.
3. Verify the new HeiGIT endpoint, the selected public routing start point and a small one-to-many travel matrix.
4. Test a brother-owned export when available and compare known entries/totals with his logging app.

Then implement one complete journey: map → site → bird profile → log → collection reveal → reload. Connect live adapters, refine styling and add the first approved art assets. Add curated calls/installation polish afterwards.

If credentials or a personal export are missing, continue with explicit demo mode, adapter interfaces, synthetic fixtures and setup instructions. Report the missing live checks. Never present fixtures or guessed drive times as real results.

### Acceptance criteria

- A user can choose a start point and drive limit, filter unrecorded/target birds, inspect reports and open directions.
- Moving to another city loads that area's real geography with the same styling rules.
- Adventure/Field changes preserve camera, filters and selection.
- Public reports show dates, sources and freshness; personal collection changes only on explicit import/logging.
- Import is idempotent, exceptions are visible, and personal edits/deletes survive reload.
- GeoJSON/routing uses `[longitude, latitude]`; seconds/minutes and metres/distances are converted correctly.
- Unknown routes, missing reports, sparse coverage and provider failures are visible states.
- Demo data cannot count toward real achievements; backup/restore preserves personal records.
- No provider key reaches the browser bundle or git. Exact personal routing origins are not enabled without resolving the provider's personal-data restriction.
- Required credits/licences remain visible, including in adventure mode. Real calls have per-asset rights records.
- The layout works on narrow phones; controls are accessible, audio is opt-in and reduced motion works.

Test importer mapping/idempotency, collection derivation, public/personal separation, date precision, coordinate/units, ranked drive filters, demo isolation and one end-to-end journey. Validate important behaviour rather than writing a large suite around decorative markup.

## 11. Instructions to the implementation model

Carry this plan into a working vertical slice. Do not restart broad ideation or replace the retro visual direction with a generic dashboard. Verify official provider contracts and current hostnames before live integration. Keep unsupported assumptions explicit.

Ask for missing information only when it blocks dependent work. The useful remaining user inputs are the repo URL, selected region, actual logging app and a representative personal export. Provider secrets must be configured through the environment; do not request passwords/full keys in chat. Bird art can arrive separately and must not block implementation.

Keep the initial use personal and non-commercial, respect the terms decisions above, and do not create paid subscriptions, domains or a public launch as an incidental implementation step. Sharing source code or the intentionally hosted free app with friends is part of the intended use; sharing private API keys is not. Native apps, trading/battles, complex accounts, weather, migration forecasting, multi-provider aggregation and alerts are later scope decisions.

## 12. Detailed pixel-art and rendering work programme

This section expands the implementation plan after two specialist planning passes: geographic rendering and bird-art production. It is a concrete task split, not a claim that either renderer or images have already been built.

### 12.1 What is dynamic, and what is made once

| Element | Runtime source | Art/code production |
| --- | --- | --- |
| Roads, park boundaries, buildings and rivers | Geographic tiles for the selected location | Shared rendering rules; no painted whole-city map |
| Grass, woodland and water appearance | Reusable tile textures applied to geometry | Three initial seamless patterns |
| Decorative trees/bushes/reeds | Optional stable positions inside eligible geography | Four small reusable scenery sprites and placement logic |
| Birding-site markers | Provider site coordinates and selected state | Three distinct reusable site symbols |
| Bird portraits | Species-to-asset lookup | Twelve proposed portraits in small batches |
| Unrecorded silhouettes and reveal states | UI transformations of the same portrait | One implementation, not another illustration per state |
| Profile frames, labels, dates and collection counts | Application UI and data | One reusable profile/card layout |
| Calls and menu effects | Separate audio paths | Real call rights/sourcing later; small original UI effects optional |

The initial inventory is **22 planned raster assets: 12 birds and 10 map assets**. This is a useful first production budget, not a complete UK bird catalogue. Other birds must still function with labelled fallbacks. Optional habitat backgrounds and animations are not in this first inventory.

### 12.2 The shared contract before parallel production

Use the companion pack's `art/art-contract.json`, `art/asset-manifest.json`, `art/production-queue.json` and `docs/art-style-guide.md` as proposed starting specifications. The integrator owns the combined contract/manifest and accepts changes deliberately. The image inventory records planned files; their absence is expected until images are produced.

| Asset family | Initial canvas | Key constraints |
| --- | --- | --- |
| Bird portrait | 64×64 provisional | Transparent; 4 px safe margin; consistent facing/style; real species colours |
| Site/target/selected marker | 32×32 | Transparent; distinct shape as well as colour; larger interaction area supplied by UI |
| Broadleaf/conifer tree | 32×32 | Transparent; explicit bottom-centre ground anchor |
| Bush/reeds | 16×16 | Transparent; explicit footprint and ground anchor |
| Grass/water/woodland pattern | 32×32 | Opaque; seamless repeated texture; documented power-of-two constraints |

Compare the three anchor birds on 64 and a 96-pixel candidate if necessary, then freeze one portrait grid for the whole initial collection. This is a controlled early decision, not permission to mix native sizes freely. Map marker sizes do not depend on the portrait choice. The integrator can review routine conformance without requiring the user to approve every file.

Bird colours have priority over the green/cream UI palette. Record the represented age/sex/plumage where material. Do not guess eBird codes from common names: the planned inventory leaves unverified provider mappings empty.

### 12.3 Agent ownership and coordination

| Owner | Main responsibility | Owned paths |
| --- | --- | --- |
| Agent A — map | Source audit, map styles, map textures/icons, atlas logic, optional scenery | `src/features/map/**`, `public/map/styles/**`, `public/assets/map/**`, `scripts/map/**`, `tests/map/**`, `docs/rendering/**`, `art/manifests/map.json` |
| Agent B — birds | Reference/variant research, anchor portraits, batch art, bird provenance | `art/birds/**`, `art/prompts/birds/**`, `art/references/birds/**`, `public/assets/birds/**`, `art/manifests/birds.json` |
| Integrator | Shared decisions, merged inventory, UI/data integration and acceptance | Combined art contract/manifest, semantic recipes and main app integration |

The integrator may be the main coding agent; a separate third worker is optional. Source inspection and bird anchor work can run in parallel with no API key. Each specialist writes a contribution manifest; the integrator merges by stable asset ID and checks collisions. Agents do not silently rename assets, change the portrait grid, overwrite another workstream or duplicate atlas-building work.

The companion `docs/agent-briefs.md` contains complete copy-paste tasks, explicit scope boundaries and required completion reports.

### 12.4 Geographic renderer stages

**A0 — Audit the actual map source.** Inspect the selected OpenFreeMap style/TileJSON, actual source-layer names/classes, ID behaviour, sprites, fonts and attribution. Store a semantic mapping such as woodland/park/water/road only after checking the real schema. Do not assume a `forest` property exists. The supplied `rendering/map-theme.rules.json` is app-owned semantic design input, not a loadable MapLibre style or a verified source mapping.

**A1 — Deliver the geographic theme.** Start 2D and north-up: shared palette, cream roads, simplified buildings, approved patterns and site markers. Keep useful labels and true geometry. Deliver Field and Adventure styles at local/wider zoom in both Manchester and London. This version should already be useful without elaborate tree placement.

**A2 — Add optional decorative scenery.** Use a fixed world/projected-coordinate grid with stable candidate IDs, deterministic jitter and bounded counts. A candidate seed depends on theme version, cell coordinates and decoration kind; it never depends on the screen, clock, current zoom or a temporary clipped-polygon ID. Enumerate visible cells plus a buffer, classify points against the eligible geographic masks, exclude unsuitable water/road/building areas where supported, and omit decoration when classification is unknown. Deduplicate by global candidate ID. More detail at close zoom reveals a nested subset of the same candidates rather than generating a new arrangement.

Source-query caveat: `querySourceFeatures` returns loaded-tile features, including possible clipped/duplicated geometry. It is not a complete stable polygon database. If stronger seam guarantees need complete geometry, explicitly supply that geometry path. A loaded mask may determine whether a tree appears; it must not reseed or move the candidate. [R15]

**A3 — Optional stricter pixel rendering experiment.** Compare a low-resolution render pass only if the normal themed map falls short visually. Keep UI/labels legible separately and measure phone behaviour. CSS image rendering alone does not prove crisp sampling inside WebGL. No promise of exact concept-image reproduction is made.

Texture details to handle: seamless fill patterns need supported power-of-two dimensions; a separate outline layer may be needed for patterned fills. Keep atlas logical/physical size, pixel ratio, anchors and packing padding explicit. Do not repurpose a portrait atlas as a terrain-pattern atlas without checking renderer requirements. [R8, R15]

### 12.5 Bird-art production stages

**B0 — Anchors:** European robin, common kingfisher and grey heron. They test round, compact/colourful and tall silhouettes respectively. Use the ready briefs in `art/prompts/anchor-birds.md` and primary species references. Keep originals and edits separate from runtime PNGs. Image generation can supply drafts, but exact dimensions alone do not certify coherent pixel clusters. [R16]

**B1 — Freeze the art language:** compare native size and enlarged card/profile views, safe margins, silhouette, diagnostic markings, palette and consistency. Select 64 or 96 once; record the decision/version before scaling production.

**B2 — Small batches:** blue tit/great tit/blackbird, then mallard/mute swan, then wren/great spotted woodpecker/kestrel/buzzard. Each image records a declared variant and provenance. A male mallard depiction is not a generic appearance for every age/sex. Later references/provider mappings remain tasks, not silently guessed metadata.

Asset lifecycle: planned → draft → reviewed → approved → retired. Approval needs species identity, grid, alpha and in-app checks plus provenance. Automated file checks cannot establish species accuracy or legal rights. Use the app's fallbacks for any missing asset rather than blocking collection data.

### 12.6 Scripts and smaller work: actual status

| File/task | Status in the companion pack | What it does or should do |
| --- | --- | --- |
| `tools/validate_assets.py` | Implemented; tested with synthetic valid/broken fixtures | Read-only metadata/PNG inspection, dimensions, alpha, padding, duplicates, approval declarations |
| `art/art-contract.json` | Written; provisional | Shared dimensions, palette, lifecycle and responsibilities |
| `art/asset-manifest.json` | Written; all 22 entries planned | Stable IDs, proposed paths, status, expected format and provenance placeholders |
| `art/production-queue.json` | Written; no images made | Twelve portraits grouped into production batches |
| `art/prompts/anchor-birds.md` | Written; generation not run | Three species briefs and reference requirements |
| `rendering/map-theme.rules.json` | Written; semantic specification only | Proposed layer appearance and scenery rules; not runnable engine JSON |
| `rendering/review-scenes.json` | Written; not executed | Approximate public Manchester/London views for later QA |
| Source inspector / style builder | Planned | Audit real schema and produce actual Field/Adventure style files |
| Atlas builder | Planned | Pack approved map assets deterministically with correct metadata |
| Scenery cell generator/masks | Planned | Stable positions, eligibility, deduplication and zoom detail |
| App art loader/review contact sheets | Planned | Load approved assets, fall back for missing art and show real comparison evidence |

Run `python tools/validate_assets.py --root .` from the companion pack/workspace. With the current inventory it must say **0 production images checked**; a planned-only inventory is not an art QA pass. `--require-approved` deliberately fails until approved images exist. The tool requires Python and Pillow and never modifies images. It does not validate visual grid coherence, seamless repetition, source copyright, species identity or renderer performance.

### 12.7 Integration and evidence

1. Merge a small style/anchor milestone before starting bulk art. Use ordinary UI placeholders and real geography independently.
2. Check the same park/river/road lines align in both map modes; toggle retains the selected site and camera.
3. Check adjacent tile windows return identical candidate IDs/positions, no double trees and stable detail after zoom out/in. Unknown masks produce absence, not floating scenery.
4. Give geographic labels, roads, site markers and attribution priority over decorative art. Test dense London as well as green local scenes.
5. Review PNGs on transparent-checker/paper/dark contexts and actual cards at native/integer scales. Keep direct references and evidence for the named bird variant.
6. Record device/browser, viewport, device-pixel ratio, active-decoration count and measured performance. No fabricated benchmark targets-as-results. Set budgets after the initial measurement and tune density.
7. Missing sprite/atlas/source failures must leave a usable plain map and labelled species entries.

### 12.8 Sensible work to do here next

The reusable specifications and validator above are already prepared. The next contained creative task is **three anchor bird drafts**, followed by one small terrain/marker batch once the style is settled. These tasks need no live API key and can be shared as files with the coding workspace. The heavier implementation work is the real source audit, map style generation, scenery masks/placement and app integration. Keep those as clear agent tasks instead of promising that a generated mockup is a renderer.

## 13. Primary sources and research limits

Provider terms/documentation checked on 7 November 2026 unless noted. These sources support provider facts; the product and architecture choices above are recommendations.

- **R1 — eBird API terms:** https://www.birds.cornell.edu/home/ebird-api-terms-of-use/
- **R2 — Incorporated eBird Data Access Terms:** https://www.birds.cornell.edu/home/ebird-data-access-terms-of-use/
- **R3 — Current HeiGIT terms:** https://account.heigit.org/info/tos — read in the rendered website because the research text fetch returned an empty page. Includes CC BY-SA 4.0, attribution and personal-data restrictions.
- **R4 — OpenFreeMap service and styling:** https://openfreemap.org/ and https://openfreemap.org/quick_start/
- **R5 — HeiGIT staff clarification, 12 October 2026:** https://ask.openrouteservice.org/t/free-plan-in-an-app-with-a-paid-tier-license-cc-by-sa-4-0-personal-data-and-attribution-questions/8079 — Standard-plan commercial use and CC BY-SA results; not a blanket resolution of personal-data or adaptation questions.
- **R6 — HeiGIT staff on stored matrix results:** https://ask.openrouteservice.org/t/persistent-storage-and-reuse-of-matrix-api-duration-results/8010 — storage/reuse remains subject to current terms.
- **R7 — API hostname migration:** https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912/
- **R8 — MapLibre styles and sprites:** https://maplibre.org/maplibre-style-spec/ and https://maplibre.org/maplibre-style-spec/sprite/
- **R9 — eBird API/download overview:** https://support.ebird.org/en/support/solutions/articles/48000838205-download-ebird-data ; canonical API documentation https://documenter.getpostman.com/view/664302/S1ENwy59 was not readable in this research session. Hotspot guidance: https://support.ebird.org/en/support/solutions/articles/48001009443-ebird-hotspot-faqs .
- **R10 — Merlin privacy and personal exports:** https://support.ebird.org/en/support/solutions/articles/48001144489-saving-birds-identified-with-merlin and https://support.ebird.org/en/support/solutions/articles/48000794682-my-ebird .
- **R11 — BirdTrack personal downloads:** https://www.bto.org/get-involved/volunteer/projects/birdtrack/taking-part/viewing-your-life-and-year-lists
- **R12 — Cloudflare secret configuration:** https://developers.cloudflare.com/workers/configuration/secrets/ ; check current framework-specific local setup when implementing.
- **R13 — CC BY-SA 4.0:** https://creativecommons.org/licenses/by-sa/4.0/ — consult licence wording for the specific output/adaptation being distributed.
- **R14 — GitHub repository plan options:** https://docs.github.com/en/get-started/learning-about-github/githubs-plans — free personal accounts support public and private repositories; hosting features are separate.
- **R15 — Map renderer constraints:** https://maplibre.org/maplibre-style-spec/layers/ and https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/ — fill patterns/outlines and loaded-tile source-query limitations. Scenery architecture above is a proposed design, not a built-in complete solution.
- **R16 — Anchor species references:** https://www.rspb.org.uk/birds-and-wildlife/robin , https://www.rspb.org.uk/birds-and-wildlife/kingfisher and https://www.rspb.org.uk/birds-and-wildlife/grey-heron — identity guidance, not a redistribution licence for the photographs.

The actual API keys/account plans, live data coverage, personal export, visual map implementation and audio source remain untested. Do not substitute the older staging openrouteservice licence for the current HeiGIT terms.
