# BirdQuest — foundation and build plan

Prepared 7 November 2026. Working name only. This is a planning and handoff package, not an implemented or deployed app.

## 1. The product decision

Build a mobile-first bird discovery and collection app for Joseph's brother. Its promise is: **find an interesting bird you have not recorded, choose somewhere reachable to look for it, and grow a personal illustrated bird collection.**

The personality is a classic handheld creature-collecting adventure: a charming local overworld, a BirdDex, pixel bird portraits, collection sets, and small moments of discovery. The information remains real birding information. A reported bird is an opportunity to look, not a guaranteed encounter.

The app's distinctive combination is personal collection gaps plus recent reports plus driving time. Start by answering one question well: **“Where could I go today, within an hour, to look for birds missing from my list?”**

### Planning assumptions

- UK first. Manchester/Chorlton is the editable demo region, not a claim about the brother's home.
- One birder first; a browser-based app that can later be installed to the home screen. Native Android/iOS store releases are a later decision.
- Private, non-commercial gift/prototype initially. No domain purchase, paid subscription, public launch or remote repository creation is part of this planning stage.
- Configurable origin, initially a town selection or dropped pin. Precise home coordinates are optional and remain private.
- eBird is the proposed first sightings provider. Its actual local coverage must pass an early validation step.
- Personal history begins with import and manual logging. A seamless Merlin connection is not an established capability.
- The accompanying generated visual is aesthetic direction only: its map, counts and reports are illustrative demo content.

### A complete first-use journey

1. Pick an area; optionally import an existing bird list or continue with an explicitly empty list.
2. See a game-styled geographic map and choose a driving limit and reporting window.
3. Toggle “Unrecorded” or select a target bird.
4. Open a site card: travel estimate, last report dates, bird list, access information where available, and links to original reports.
5. Open directions to a suitable entrance, go birdwatching, then explicitly log a sighting.
6. The bird becomes coloured in the BirdDex; its first-recorded date and personal notes appear in the journal.

“Unrecorded” means missing from the data imported or entered into this app. Do not claim “you have never seen this bird” when the history is incomplete.

## 2. What to build first

| Stage | Deliverable | Completion condition |
| --- | --- | --- |
| 0 — foundation, now | This plan, next-model brief, proposed domain types, design tokens and concept direction | A builder can begin without reconstructing the conversation |
| 1 — feasibility | Verify local eBird coverage, one personal export, one travel matrix, one game map style, and mobile interaction | Written results distinguish supported features from gaps; no live claims based only on fixtures |
| 2 — convincing prototype | Real geographic map, Adventure/Field toggle, BirdDex, target filters, bird/site sheets, log action and local persistence | The core journey works on a phone with clearly labelled demo data when credentials are absent |
| 3 — usable personal beta | Live eBird reports, routed site list, tested import, local backup/restore, error states and source credits | The brother can use the entire journey using real reports and his own list |
| 4 — polish | Small approved bird sprite set, curated calls, optional menu sounds, installation/offline shell and a few collection milestones | Assets are credited, audio is opt-in, offline information is labelled stale |
| Later | Additional observations providers, seasonal/historical intelligence, optional account backup, selected alerts and more art | Each addition has a concrete data path, a user need and its own acceptance criteria |

Stages 2 and 3 may be implemented as one vertical slice after feasibility. Do not produce a large disconnected mockup before verifying the primary data path.

## 3. The visual and interaction system

### Real geography with an adventure skin

Use **MapLibre GL JS with an OpenStreetMap-derived vector basemap**, provisionally OpenFreeMap. Its styles can be customised and hosted as JSON. MapLibre supports sprite icons and fill patterns, which are useful building blocks for pixel trees, water textures and reserve markers. These are documented capabilities; a convincing full pixel-world aesthetic still needs a rendering experiment. [S6–S8]

| Geographic feature | Adventure presentation | Accuracy rule |
| --- | --- | --- |
| Parks and woodland | Sage/green areas, restrained pixel tree textures | Preserve real mapped area outlines |
| Rivers, canals and lakes | Blue water with a subtle tiled texture | Preserve the actual geometry |
| Roads and paths | Cream roads and clear dark edges | Retain useful connections and route geometry |
| Buildings | Simplified warm blocks at close zoom | Hide excess detail at regional zoom |
| Birding sites | Pixel signposts or binocular markers | Anchor each to its real site coordinates |
| Birds | Bird sprites inside selected site sheets; clusters on the map | Do not imply a bird is standing at an exact current position |
| Reachability | Light optional travel-area overlay | Use routed results, not a circle labelled as driving time |

The map must pan and zoom like a usable map. Do not rebuild it as an invented grid that moves roads and rivers away from their real locations. Do not generate the navigation map with image generation. Use image generation for design exploration and discrete art assets.

The **Adventure / Field** toggle changes the basemap styling, textures and decorative markers, while preserving camera position, site selection, reports and routes. Field mode uses a restrained conventional map for checking roads and location context. A CSS colour filter alone will not deliver the intended look.

Start with custom map colours, restrained textures, pixel marker sprites and interface art. If a stricter low-resolution map renderer is explored, keep labels and controls legible; test the effect on geographic accuracy, zoom and phone performance before adopting it. An entire full-screen pixelation shader is not an agreed requirement.

### Main screens

| Screen | Essential content and actions |
| --- | --- |
| Map | Area selector, Adventure/Field, 30/60/90-minute chips, reports window, unrecorded/targets filters, clustered site markers, matching list |
| Site sheet | Site name, approximate drive time, entrance/access status, report dates, distinct birds, potential additions to the collection, original report links, directions |
| BirdDex | Searchable collection, recorded/unrecorded filter, family browsing, themed sets, illustrated cards and progress for the selected catalogue |
| Bird profile | Common/scientific name, family, original pixel portrait, record status, personal first/last record, target toggle, nearby reports, optional call, log action |
| Journal | Personal entries, date/place, seen/heard basis, notes, edit/delete, import history and export backup |
| Settings | Origin, home-region catalogue, import/backup, audio, reduced motion, credits and data freshness |

On a phone, use Map / BirdDex / Journal as the three main tabs. Settings can sit behind a small profile/gear button. Site and bird detail sheets should not force repeated navigation away from the map. On desktop, use a map with an adjacent results panel.

### Pixel art without losing usability

- Pixel artwork and headings supply the retro feel. Use an ordinary readable font for dates, report details and longer text.
- Use a limited green/cream/blue palette with amber highlights for discovery and coral accents. See `design-tokens.json` for proposed values.
- Keep tap targets at least 44 CSS pixels and support reduced motion. All actions have text labels and keyboard-accessible equivalents.
- Use a short reveal animation only after a confirmed personal log. Never play audio automatically.
- Include a list equivalent to the map. Filters and selected details must remain usable if a map fails to load.
- Keep source attribution visible in both modes; decorative interface panels must not cover it.

## 4. The BirdDex and collection rules

Use an app-owned stable species identifier, provider identifiers and a versioned taxonomy mapping. Never identify a species by its display name alone. Regional common names can differ; scientific names can also change over time. Store alias/migration decisions explicitly.

### Two complementary ways to group birds

| Layer | Purpose | Examples |
| --- | --- | --- |
| Taxonomy | Reliable navigation and provider matching | Finches, tits, ducks, herons, raptors; derive actual families from the chosen taxonomy |
| Themed collection sets | Friendly game-style progress | Garden regulars, woodland birds, wetland birds, birds of prey, coast and sea |
| Personal lists | Intentional birdwatching | Targets, favourites, this year's records, birds missing from the imported list |

Themed sets are curated app tags and may overlap. They are not a substitute for taxonomy or a machine-inferred claim about which habitat every bird always uses.

### Keep state dimensions separate

- **Collection:** unrecorded or recorded. “Recorded” comes from import or a deliberate personal log.
- **Intent:** target/favourite flags, independent of collection status.
- **Availability:** recent report exists within the selected search; this is computed from public observations and filters.
- **Notable report:** source-provided unusual-report flag, where supported. It is not a conservation status, a national rarity tier or a probability of seeing the bird.

Unrecorded cards can use a silhouette or desaturated sprite, but show the species name so discovery remains actionable. Let users open profiles before recording a bird. Do not conceal useful field information behind “???” placeholders.

For version one, the BirdDex catalogue should be a versioned, finite home-region species list, with a clearly labelled denominator. Its membership must not change whenever somebody pans the map. Validate the permitted source for that list in feasibility; recent sightings alone are not a complete regional catalogue. Imported species outside it remain available in an “Outside this catalogue” view and keep their logs. The art launch set is smaller than the species catalogue: a missing illustration must not prevent a species from appearing.

Begin artwork with around 12 visually distinct real species: robin, blue tit, great tit, blackbird, wren, mallard, mute swan, grey heron, kingfisher, great spotted woodpecker, kestrel and buzzard. This is an art production list, not a claim that all are currently reported near the demo origin.

Collection rewards can include first record, first woodland set milestone, or first five different sites visited. Add only a few initially. Do not build battles, trading, breeding, a currency or a leaderboard for the first release. A map visit alone does not count as a bird record.

## 5. Data sources and decisions

| Requirement | First choice | Why | Dependency or limitation |
| --- | --- | --- | --- |
| Public recent bird reports | eBird API | Intended for limited recent/summary app outputs | API key; actual local reporting activity must be measured [S1] |
| Birding destination inventory | eBird hotspots plus a small curated entrance table | Coordinates and site identifiers support map and route joins | A hotspot can have restricted/private access; its pin is not necessarily a car park [S2] |
| Species names and hierarchy | eBird taxonomy, versioned in an app mapping | Aligns the first provider with the collection index | Confirm fields, catalogue membership and update handling against official docs |
| Existing personal list | eBird personal export, plus manual entry | Documented personal download route | Verify an actual export and any Merlin-only records [S4–S5] |
| Basemap | MapLibre + OpenFreeMap | Custom style control and real geographic data | Check terms, keep attribution, allow provider replacement [S6–S8] |
| Driving estimates | openrouteservice matrix | One origin to many destinations | Key and hosted limits; estimates do not include live traffic [S9–S11] |
| True reachability outline | openrouteservice isochrones, optional after matrix | Useful drive-limit visual | Extra request; outline and individual routed time can differ at edges |
| Bird illustrations | Original curated pixel assets | Consistent appearance and clear provenance | Per-species identity/pose review; start small |
| Bird calls | Candidate: xeno-canto, alternatively a licensed curated set | Appropriate specialist sound source to investigate | Official API/terms were blocked during research; do not mark production-ready [S12] |
| Interface sound effects | Original simple Web Audio tones or licensed effects | Separate from biological recordings | Tap-to-enable, mute, no autoplay |
| Extra sightings/photos | iNaturalist, later | Supported observations API and OAuth | Separate taxonomy, quality, privacy and media licences [S13] |
| Historic UK records | NBN Atlas, later | Geographic occurrence searches | Source licences, record resolution, timeliness differ [S14] |
| Reserve map overlays | RSPB open data, later | Reserve boundaries and habitat context | Boundaries are not an entrance/opening-hours directory [S15] |
| BirdTrack personal history | Excel import, if that is his actual app | BTO documents record downloads | Do not assume a public account-sync API [S16] |

For a non-commercial prototype, eBird's published API terms permit relevant apps and require attribution. Commercial use requires written permission. Use the API terms, not assumptions that “public” data is unrestricted. Keep keys on the server and out of the repository/browser bundle. [S3]

### Integration boundaries

The browser holds private personal records and renders the map. A small same-origin backend fetches public eBird data and routing estimates with server-side keys. Public basemap tiles load from the map provider. An asset registry supplies original art and any separately cleared audio. Public sightings and personal logs remain separate datasets.

## 6. API feasibility and query plan

### Evidence status as of this planning pass

- **Verified in provider documentation:** eBird offers public API access and personal downloads; hotspot coordinates are available; Merlin private records are not a public sightings feed; MapLibre supports custom styles/sprites; OpenFreeMap supports custom styles; openrouteservice has matrices and a free plan. [S1–S11]
- **Not live-tested:** authenticated eBird requests, counts of reports around a real origin, an actual brother-owned export, routed destinations, mobile map rendering or audio playback.
- **Incomplete documentation access:** Cornell's linked official Postman page was not readable by the research browser, and direct public-page access returned an access error. xeno-canto's official pages presented an anti-bot block. Resolve these through normal authorised access before relying on endpoint details or licences. These failures do not establish that the underlying services are unavailable.
- **Not available in this workspace:** logged-in GitHub CLI credentials. No external repo was created.

### Candidate eBird adapter operations

The following is a **candidate implementation checklist**, not an authenticated contract test. Confirm names, allowed parameters, field types and limits against Cornell's current linked API documentation before coding provider adapters.

| Adapter operation | Candidate API path under `https://api.ebird.org/v2` | Intended use |
| --- | --- | --- |
| Taxonomy | `/ref/taxonomy/ebird` | Species codes, names, family hierarchy |
| Nearby hotspots | `/ref/hotspot/geo` | Initial nearby destination discovery |
| Regional hotspots | `/ref/hotspot/{regionCode}` | Broader inventory and adjacent-region coverage; coordinate list documented in [S2] |
| Recent site reports | `/data/obs/{locationId}/recent` | Populate multiple different sites correctly |
| Recent nearby reports | `/data/obs/geo/recent` | Discovery summary and initial source check |
| Nearby notable reports | `/data/obs/geo/recent/notable` | Optional source-marked unusual reports |
| Nearby species reports | `/data/obs/geo/recent/{speciesCode}` | Optional target-bird search |

Commonly published API descriptions indicate a nearby search cap of 50 km and a recent window up to 30 days. Treat both, and “latest report per species” response behaviour, as **parameters to verify against current official docs and sample responses**. The first live spike must record their actual values. Never assume a nearby summary contains every observation or every site for a species.

### How to produce useful map results

1. Load an inventory of hotspots for the supported demo region and adjacent areas needed for the chosen travel limits. Use stable site IDs and retain provider coordinates.
2. Apply a conservative geographic prefilter to reduce routing work. Label the supported search extent; the inventory is not a promise of all possible birdwatching places.
3. Route a bounded set of candidates to suitable entrances, using **one origin to many destinations** rather than a full all-to-all matrix. Start with a maximum of 50 candidate destinations, batched to current provider limits.
4. Exclude destinations over the selected driving limit. A failed or unroutable estimate is unknown, never zero minutes.
5. Fetch recent reports for a bounded set of eligible sites, initially up to 20. Reuse cached data when filters change. Where there are more candidates, use explicit pagination/search expansion rather than silently claiming complete coverage.
6. Join each site's distinct reported species to the user's collection and target list.
7. Show the site list and clusters, with observation date, source fetch time and data window. Avoid rendering hundreds of overlapping bird sprites.

A radius is measured in distance; a driving limit is measured on the road network. A 90-minute drive may go beyond a single nearby API radius. Do not quietly truncate it and call the result exhaustive. Regional site inventories and bounded expansion must be validated. Until they are, expose the actual supported area rather than an unsupported reachability claim.

Report a hotspot-level location as a site, not as an exact bird position. Keep provider generalisation/sensitive-record restrictions intact. Access restrictions and entrance coordinates need their own fields; route to a reviewed entrance when one exists, otherwise label the destination point as approximate.

### Freshness, ranking and cost controls

- Suggested report windows: 24 hours, 7 days and the provider-supported longer window. Start with 7 days; make clear that a week-old report may no longer reflect presence.
- Keep `observedAt` separate from `fetchedAt`. Recently downloaded data may describe an older observation. Preserve source date-only precision rather than inventing midnight timestamps.
- Suggested cache policies, to validate against terms: hotspots daily, taxonomy on a versioned slower cadence, public reports 15 minutes, driving estimates 24 hours by origin/site/profile. Local filter toggles should not refetch everything.
- Default ranking: eligible sites with the most distinct unrecorded species in the selected window; ties by newest relevant report, then lower drive time. Offer Nearest and Target match as alternate sorts. Explain this as a ranking, never a percentage chance of seeing a bird.
- Do not infer report frequency, abundance or number of independent observers from an endpoint returning only a latest record. Shared checklist duplicates must not inflate evidence.
- Start with user-triggered refresh. No scheduled task or push alert is created by this plan.
- Log provider request counts and cache hits without personal import contents or precise home locations. Add timeouts, bounded retries, backoff and a stale-data state.

## 7. Existing history and account connection

Merlin and eBird are related but different tools. Merlin-saved observations can be accessed via eBird's website, while Merlin-only entries remain private and absent from public outputs. eBird provides personal spreadsheet downloads. Those documented facts support an import experiment, not a promise of third-party full-history sync. [S4–S5]

First build: **upload export → preview → map species → confirm → import → review exceptions.**

- Parse personal exports in the browser and keep them in local storage by default.
- Show recognised rows, duplicates and unmapped taxa before changing the collection.
- Keep source, import batch ID and original taxon text so mapping mistakes are repairable.
- Importing the same file twice is idempotent. Re-exported history can add new rows without duplicating earlier entries.
- Distinguish a species-only list from dated sightings: do not invent encounter dates or locations for list-only rows.
- Keep hybrids, subspecies, unknown taxa and ambiguous names visible for resolution rather than discarding them or silently awarding multiple species.
- Personal logs support edit/delete and backup. Deleting the final encounter for a species updates collection status consistently, including species-only imported records.
- Export a portable JSON backup and a useful human-readable records file later; local browser persistence alone is not a durable backup.

If the brother uses BirdTrack, start from BTO's documented Excel export instead. If he only uses Merlin, inspect one export and compare its totals and entries with his actual life list before implementing the importer. iNaturalist has documented OAuth support if it becomes relevant; that does not imply Merlin/eBird offers an equivalent third-party flow. [S13, S16]

## 8. Recommended technical foundation

### Proposed stack

| Layer | Proposed choice | Reason |
| --- | --- | --- |
| App | React + TypeScript; Vite for a conventional repo build | Portable, good for a map-heavy interface and a phone-friendly PWA |
| Mapping | MapLibre GL JS | Custom geographic styling with replaceable tile sources |
| Backend | Small HTTP API, provisionally Cloudflare Worker | Protects provider keys, validates requests, shares public-data cache |
| Hosting | Provisionally one Worker/static-assets deployment | Same-origin UI/API; confirm current deployment tooling during implementation |
| Personal storage | IndexedDB with explicit backup/restore | Avoids an account database for a single-user first version |
| Server storage | Public response cache only at first | Public data cache and personal records have different privacy needs |
| Future sync | Authenticated user-scoped database only if requested | Enables multiple devices; not assumed in initial architecture |
| Assets | Local original sprites + attribution-aware registry | Consistent art and traceable audio/media provenance |

This is an architectural recommendation, not a pinned package/version selection. The next builder must verify current official framework/deployment documentation and follow any chosen hosting environment's required starter. If building inside ChatGPT Sites, use that environment's supported starter and storage approach rather than forcing a conflicting deployment configuration.

Keep an eBird adapter and routing adapter behind app-owned types. Place local history parsing behind a separate importer. A missing API key should activate a clearly marked demo mode, not crash the application or silently masquerade as live data. Demo and live caches/storage must be separated so sample records cannot become personal achievements.

### Data contracts

See `contracts/domain.ts` for proposed types for Species, BirdingSite, PublicObservation, PersonalEncounter, CollectionEntry, DriveEstimate and MediaAsset. They are design contracts, not tested provider response schemas.

The essential joins are `speciesId` between observations and collection, and `siteId` between public observations and drive estimates. Each source record retains its provider ID, source URL, observation precision and provenance. Collection progress is derived from personal records and catalogue membership, not from public sightings.

### Proposed repo layout when implementation begins

| Path | Purpose |
| --- | --- |
| `docs/` | Product plan, research evidence, visual decisions and acceptance checks |
| `src/features/map/` | Map layers, site clusters, sheets and filters |
| `src/features/birddex/` | Catalogue, collection sets, profiles and progress |
| `src/features/journal/` | Personal log, edit/delete and backup |
| `src/data/importers/` | eBird/BirdTrack/generic-list parsing and reconciliation |
| `src/domain/` | App-owned types, taxonomy mappings, ranking rules |
| `src/assets/` | Pixel bird art, interface sprites and approved sound assets |
| `worker/` | Public-data adapters, routing, response cache and key handling |
| `tests/` | Import, ranking, coordinate and core journey checks |

Working repo name: `birdquest`. Begin as private if a remote is created later. Track `.env.example`, never real keys; exclude `.env*` credentials, real personal exports, precise origin settings and generated cache dumps. Actual repository creation is deferred to the build stage; this pack can supply its initial documentation.

## 9. Art and audio production

### Bird sprite specification

Use one consistent native canvas, provisionally 64×64 px, with transparent backgrounds, a consistent facing direction, visible species markings and integer-size scaling. A 32×32 map marker can be a separately designed simplified asset rather than an unreadable crop. Record the creation/source and review status for each asset.

Prototype with three real examples: robin, kingfisher and grey heron. Check shape and markings with a bird reference before producing the next batch. Extend to the 12-bird art set only after one art style is approved. Do not generate hundreds of inconsistent species illustrations at once. Unillustrated catalogue birds still have a labelled fallback and fully functioning records.

### Two different sound systems

| System | Initial decision | Required metadata |
| --- | --- | --- |
| Game interface | Optional original reveal/menu tones, enabled by a tap | Asset source, mute setting, volume |
| Real bird calls | Curated Listen action after sourcing verification | Species, call/song type, recordist, source URL, exact licence, attribution and allowed use |

Do not assume that access to an API grants the right to redistribute or edit every recording/photo. Keep full source/credit/licence records. If a recording has no verified reuse path, link to its source instead of packaging it. Do not use generated bird audio as an identification reference. Build no Merlin-like sound identification engine in the first version.

## 10. Feasibility tasks for the next model

| Task | Concrete evidence to collect | Decision it resolves |
| --- | --- | --- |
| A. Local coverage | With an authorised eBird key, inspect a few real sites and windows around the selected origin; record unique species, latest observation dates and missing sites | Whether eBird alone makes a worthwhile local beta |
| B. Personal history | One brother-owned export, checked against his app totals and a few known records | Correct importer and whether Merlin-only records are present |
| C. API semantics | Current official endpoint docs and redacted response samples | Limits, latest-per-species behaviour, provisional flags, date fields and pagination |
| D. Drive times | One origin to a small set of reviewed site entrances; check coordinate order and units | Routing works without matrix expansion or lake-centre destinations |
| E. Game map | One real neighbourhood, Adventure and Field styles at neighbourhood and regional zooms, on a phone | Whether MapLibre styling delivers the desired appearance/performance |
| F. Audio | Read current specialist source terms/API requirements through normal access; identify a small legal playback set | Whether calls can ship in the beta or stay source links |

Stop expanding integrations after these are resolved. If local eBird coverage is weak, tell Joseph what is missing and scope a supported second source or a smaller useful patch; do not fill gaps with invented current sightings or unauthorised scraping of paid feeds.

## 11. Acceptance criteria for a usable beta

1. A user can choose origin and driving limit, filter unrecorded birds, inspect a site and open directions.
2. Changing map mode preserves camera, filters, selection and route results.
3. A public report shows species, site, observation date/precision, original source and fetch freshness. It never becomes a personal record automatically.
4. A bird recorded today can be edited/deleted; collection and journal update correctly after reload.
5. Import preview handles known taxa, unmapped rows and duplicates; importing the same export twice does not inflate totals.
6. Map and list agree. Unknown routing and provider failures are visible states, not false zero times or empty claims that no birds exist.
7. Degree/metre and second/minute conversions are checked. GeoJSON is `[longitude, latitude]`; no latitude/longitude reversal reaches routing.
8. Demo fixtures are unmistakably labelled, are stored separately, and cannot count toward the user's real collection.
9. Keys are absent from client bundles and git. Personal history/origin are not in request/error logs; live API deployment has request limits and an appropriate private access gate.
10. Attribution survives the Adventure skin and mobile layout. Licensed media has per-asset credits.
11. The layout works at 360–430 px widths, controls are accessible, long bird names wrap sensibly, and audio/motion preferences work.
12. Backup export/import restores the list. If cross-device sync is absent, settings say the records belong to this browser until backed up.

Test the important logic: import idempotency and mapping, source/public-versus-personal separation, catalogue progress, date precision, drive units, ranking, and mode/selection persistence. Add a single end-to-end core journey. Avoid a large suite of tests that only mirrors decorative markup.

## 12. Cost, setup and what remains undecided

The initial aim is no mandatory paid data subscription and no usage-based AI in normal app operation. That is a design target, not a verified £0 operating-cost promise. Image creation is a separate production activity; routine map navigation, report refresh and collection updates should use conventional software.

Create/obtain only what the live spike needs: a Cornell/eBird API key and an openrouteservice account/key. MapLibre is a software dependency; OpenFreeMap's public setup does not require creating a map account. Audio credentials are only necessary after choosing and verifying the audio source. Add a host account and private GitHub repo at the build stage. Never ask for passwords or keys in the chat; use the implementation environment's secret controls.

The public-map provider has no promised app-specific SLA in this plan. Free-tier quotas, hosting eligibility, egress and current terms must be checked when deploying. Use bounded requests and caching from day one; do not promise unlimited live API access.

Only three user inputs materially affect the first real beta: **the brother's starting area; the app where he actually logs birds; and one export he is happy to import.** These do not block foundation work or a clearly marked demo. Visual style can be refined from the concept after the first working geographic slice.

## 13. Sources and evidence register

Provider documentation reviewed during planning, 7 November 2026. Product, visual, architecture, limits and milestone choices labelled as proposals above are recommendations, not claims that the providers offer the entire app.

- **S1 — eBird data formats/API:** https://support.ebird.org/en/support/solutions/articles/48000838205-download-ebird-data — confirms limited recent/summary API role and personal downloads; linked canonical API docs: https://documenter.getpostman.com/view/664302/S1ENwy59 (not readable in this session).
- **S2 — eBird hotspot FAQ:** https://support.ebird.org/en/support/solutions/articles/48001009443-ebird-hotspot-faqs — geographic hotspot list/API key and access limitations.
- **S3 — eBird API terms:** https://www.birds.cornell.edu/home/ebird-api-terms-of-use/ — non-commercial use, commercial permission, keys and source attribution.
- **S4 — Merlin observations:** https://support.ebird.org/en/support/solutions/articles/48001144489-saving-birds-identified-with-merlin — life list relationship, private Merlin-only records and access through eBird.
- **S5 — My eBird downloads:** https://support.ebird.org/en/support/solutions/articles/48000794682-my-ebird — personal data export; inspect an actual file before assuming all Merlin entries are included.
- **S6 — MapLibre style specification:** https://maplibre.org/maplibre-style-spec/ — real geographic data/layer styling.
- **S7 — MapLibre sprite documentation:** https://maplibre.org/maplibre-style-spec/sprite/ and https://maplibre.org/maplibre-style-spec/layers/ — sprite and pattern capabilities; not proof of a finished pixel map.
- **S8 — OpenFreeMap quick start and attribution:** https://openfreemap.org/quick_start/ and https://openfreemap.org/ — MapLibre integration, custom styles and attribution.
- **S9 — openrouteservice matrix:** https://giscience.github.io/openrouteservice/api-reference/endpoints/matrix/ — source/destination travel-time matrices.
- **S10 — openrouteservice plans/limits:** https://openrouteservice.org/plans/ and https://giscience.github.io/openrouteservice/hosted-api-restrictions — verify current account limits at implementation; the main plans page redirected to an account page without readable text, while the provider's staging plans page displayed a free standard plan: https://staging.openrouteservice.org/plans/ .
- **S11 — Provider forum clarification on traffic:** https://ask.openrouteservice.org/t/isochrone-trafic-data/7875 — hosted service has no live traffic input.
- **S12 — xeno-canto candidate official documentation:** https://xeno-canto.org/explore/api and https://xeno-canto.org/about/terms — both blocked by the site's anti-bot page in this session; credentials, current API contract and recording licences remain to verify.
- **S13 — iNaturalist official API and auth guidance:** https://www.inaturalist.org/pages/api+reference and https://www.inaturalist.org/pages/api+recommended+practices — supported API, authorisation and bounded use; API explorer: https://api.inaturalist.org/v1/docs/ .
- **S14 — NBN Atlas occurrence services and licences:** https://nbnatlas.freshdesk.com/support/solutions/articles/201000131599-occurrence-web-services and https://nbnatlas.freshdesk.com/support/solutions/articles/201000131300 — geographic occurrence queries, per-record licence and spatial generalisation.
- **S15 — RSPB conservation/open data:** https://www.rspb.org.uk/helping-nature/what-we-do/protecting-species-and-habitats/conservation-data-at-rspb — reserve boundaries, habitat data, API access and dataset-specific licensing.
- **S16 — BTO BirdTrack downloads:** https://www.bto.org/get-involved/volunteer/projects/birdtrack/taking-part/viewing-your-life-and-year-lists — downloadable personal Excel records.

