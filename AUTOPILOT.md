# BirdQuest autopilot plan (code and UI)

Written 8 Nov 2026 by Claude Opus with Joseph, for **Claude Sonnet to execute session after session without needing decisions**. Every judgement call that matters has already been made here or in the data files listed below. If this file disagrees with `BUILD_PLAN.md`, this file wins for *what to build next and how*; `CLAUDE.md` hard rules and `research/BirdQuest_Build_Handoff.md` win for *rules* (terms, privacy, attribution). `GAME_DESIGN.md` is the why behind phases C, D, E and G; where its numbers differ from this file, this file wins.

Art is done elsewhere (Joseph sends briefs to ChatGPT/Astra: `research/art-rendering/art/prompts/bird-batches.md` and `game-art-brief.md`). **Art never blocks code**: every ticket draws a fallback until real art arrives.

---

## 0. How to run a session (read every time)

1. Read `CLAUDE.md` (loads automatically), then this file from the top down to the checklist, then the specs of the ticket you will do. For phases C–G also skim `GAME_DESIGN.md`.
2. `git pull origin main`, `npm ci`, then `npm run typecheck && npm test`. If the baseline is red, fixing it is your first job.
3. Take the **first unticked ticket** in the checklist (section 2) whose "Needs" are met. Skip a ticket only if it is blocked on Joseph; note why in the Waiting list (section 1) and move on.
4. Build it: domain logic first as pure functions with tests (`src/domain/`, `tests/`), then UI. Keep to the existing style: plain English UI copy, UK spelling, tokens and component recipes from `src/styles`, `src/ui/components.tsx`.
5. Checks, all must pass:
   - `npm run typecheck && npm run lint && npm test && npm run build`
   - UI tickets: run the ticket's `npm run screens -- ...` line (and once with `WIDTH=360`), **open every PNG in `/tmp/screens/` with Read** and fix anything clipped, overflowing, overlapping or unreadable. Page errors fail the check.
6. Commit on `main` with message `AP <id>: <what changed>` (end with the attribution lines your session gives you), tick the box in this file in the same commit, then `git push origin main` (this redeploys the site; data is reused from cache, 0 API calls).
7. If the ticket changed the pipeline, dispatch a refresh and read the summary (commands in CLAUDE.md "Actions"). Record new facts in CLAUDE.md "Facts learned".
8. At the end of each **phase**: update the BUILD_PLAN.md status table (row "M9/Autopilot"), add new files to CLAUDE.md "Where things are", and add the phase's phone-review checklist to the Waiting list.
9. Do as many tickets as fit. Stop at a clean point (everything pushed) when the conversation is getting long, or after 5 tickets. Finish with a short message to Joseph: what's new on the site, what to try on his phone, anything waiting on him.

**Stop and ask Joseph (one short question) only if:** a step would spend money or need a new provider or account; an eBird/ORS terms rule would be bent; real personal data would leave the phone or enter git; the same check fails 3 times after honest attempts; or a change would delete or rewrite people's saved records without a migration. Otherwise make the sensible choice, write it in the commit message, and carry on.

**Never:** commit real exports (use `private-data/`, gitignored); publish observer names, GPS or private locations; let public reports or demo data award progress; turn unknown drive times into 0; put keys in client code; add a paid service.

---

## 1. Waiting on Joseph (non-blocking; keep this list current)

- [ ] Lewis's eBird export ("Download My Data" on ebird.org) to test B1 for real. Until then use synthetic fixtures.
- [ ] Which app Lewis mainly logs in (eBird, Merlin, BirdTrack).
- [ ] Bird art batches 01–10 (`bird-batches.md`) and game art sets 1–5 (`game-art-brief.md`). Process with R1 whenever a ZIP is uploaded.
- [ ] Lewis to sanity-check the Location 2 warden sites and signature birds after D2.
- [ ] Phone reviews (added at the end of each phase).

---

## 2. Checklist (tick as you go)

**Phase A: foundations**
- [ ] A1 Encounter fields: site, time, outside-Dex birds, source
- [ ] A2 Log sheet fills site and time; edit an existing sighting
- [ ] A3 Game data loaders (traits, duel cards) with zod
- [ ] A4 Art intake script and data-driven portrait list

**Phase B: Lewis's history and lists**
- [ ] B1 eBird CSV import (preview, idempotent, outside-Dex, needs-review)
- [ ] B2 Pasted list import
- [ ] B3 Import history with undo
- [ ] B4 Year list and Life list views; first-of-the-year reveal

**Phase C: Field Bond**
- [ ] C1 Bond engine
- [ ] C2 Ranks on cards and profile; rank-up reveal
- [ ] C3 Nicknames

**Phase F: day route planner** (Lewis's "that would be huge"; done before the wardens on purpose)
- [ ] F1 Pipeline: site-to-site drive matrix
- [ ] F2 Route planner engine
- [ ] F3 "Plan a day" sheet

**Phase D: Reserve Wardens and badges**
- [ ] D1 Site character
- [ ] D2 Warden draft task and wardens.v1.json
- [ ] D3 Badge engine
- [ ] D4 Badge case screen, warden panel in the site sheet, warden pennants on the map

**Phase E: Field Duels**
- [ ] E1 Duel engine
- [ ] E2 Squad screen
- [ ] E3 Duel screen
- [ ] E4 Gold badges from duel wins

**Phase G: Rivals**
- [ ] G1 Squad share codes and rival link
- [ ] G2 Rival duel and result sharing
- [ ] G3 Patch race (optional; do last)

**Phase H: map polish**
- [ ] H1 List view of sites
- [ ] H2 Adventure skin (BUILD_PLAN T4.1–T4.3)

**Phase I: polish and hand-over**
- [ ] I1 First run
- [ ] I2 Credits screen
- [ ] I3 Accessibility pass
- [ ] I4 Hand-over note for Lewis

**Recurring**
- R1 Art intake (whenever a ZIP arrives; not ticked, repeat as needed)

---

## 3. Shared definitions (use these exactly; put them in `src/domain/time.ts` unless said otherwise)

- **Time band** from "HH:MM": dawn 04:00–08:59, day 09:00–16:59, dusk 17:00–20:59, night 21:00–03:59. No time means no band.
- **Season**: winter Dec–Feb, spring Mar–May, summer Jun–Aug, autumn Sep–Nov.
- **Outside-Dex species id**: `x-` + scientific name lowercased, spaces to hyphens, everything except a–z and hyphens removed (`Regulus ignicapilla` → `x-regulus-ignicapilla`). Put `outsideId(sciName)` in `src/domain/taxon.ts`. The existing species-id regex already accepts this.
- **Dex matching**: move `isNotASpecies` and `dexIdFor` from `pipeline/build.ts` to `src/domain/taxon.ts` and import them back into the pipeline (one source of truth; pipeline already imports from `src/`).
- **Site key** for Bond: `siteId` if present, else the place label lowercased and trimmed, else `"unknown"`.
- **Seeded random**: `mulberry32(hash(str))` where `hash` is FNV-1a 32-bit over the string. Put both in `src/domain/random.ts` with tests (same seed gives the same sequence).

---

## 4. Ticket specs

### Phase A: foundations

**A1 Encounter fields.** In `src/data/personal-schema.ts` add optional fields to `EncounterSchema` (all `.optional()`, so old records and backups still parse):
`siteId` (`/^L\d+$/`, nullable), `time` (`/^\d{2}:\d{2}$/`, nullable), `name` and `sciName` (strings ≤ 80, for outside-Dex birds), `source` (`'log' | 'ebird' | 'list'`), `importBatchId` (string ≤ 64), `importKey` (string ≤ 200).
Collection derivation (`src/domain/collection.ts`) must ignore `x-` ids for Starter Dex progress. Backup schema stays `schema: 1`.
Tests: old encounter without the fields parses; outside-Dex encounter parses and doesn't count toward Dex progress; backup round-trip keeps the new fields.

**A2 Log sheet site and time; editing.** `LogSheet` gets optional `siteId` from callers: `SiteSheet` "I saw it" and the profile "Reported nearby" rows pass the site. When the date is today, prefill `time` with the current HH:MM; show a small optional time input. Logging a bird from Find a bird for an outside-Dex result is allowed: store `speciesId = outsideId(sciName)`, `name`, `sciName`. Journal: tapping an entry opens `LogSheet` in edit mode (same fields, "Save changes", existing delete stays). Editing never triggers the catch reveal.
Screens: `npm run screens -- "#/map >> click:View spot >> click:I saw it" "#/journal"`.

**A3 Game data loaders.** `src/data/game.ts`: zod schemas and typed exports for `traits.v1.json` (`traitsById(id)`) and `duel-cards.v1.json` (`DUEL_CARDS`). Fail loudly at import if data is invalid (same pattern as the Dex catalogue). Keep `tests/game-data.test.ts`; add a test that every card rule key is a trait key.

**A4 Art intake.** Move the hard-coded `DRAFT_PORTRAITS` list in `src/art/portraits.ts` into `src/art/draft-portraits.json` (array of Dex ids) and import it. Write `scripts/art/import_batch.py <zip-or-folder> <batch-name>`: copies originals to `research/art-drafts/bold-pixel/<batch-name>/` (keeping file names), and for each `bird_<dex-id>_bold_pixel_v1.png` whose id is in the Starter Dex runs `prepare_sprite.py` to `public/assets/birds/<id>/adult-portrait-draft.png` and adds the id to `draft-portraits.json`; unknown ids are listed and skipped; prints a summary. Update `tests/art-assets.test.ts` to read the JSON.

### Phase B: Lewis's history and lists

**B1 eBird CSV import.** Pure parser `src/data/importers/ebird-csv.ts` (papaparse, already installed), UI in `src/features/journal/ImportFlow.tsx`, opened from Journal "Import".
- Columns are matched by header name, case-insensitive. Required: `Common Name`, `Scientific Name`, `Date`. Optional: `Submission ID`, `Time`, `Location ID`, `Location`, `Count`. **Ignore** `Latitude`, `Longitude` and any observer, comment or checklist-detail columns (never stored).
- Date `YYYY-MM-DD` (also accept `DD/MM/YYYY`). Time `07:30 AM` or `07:30` → 24-hour `HH:MM`; missing → null. Never invent a date: rows without a valid date are listed as "needs review".
- Species: `isNotASpecies` rows (sp., slashes, hybrids, domestic) go to "needs review" and are not imported. `dexIdFor(sciName)` match → Dex id; otherwise `outsideId(sciName)` with `name`/`sciName` kept.
- `importKey` = `ebird:<Submission ID>:<sciName>`, or `ebird:<date>:<location>:<sciName>` without a Submission ID. Rows whose key already exists on the phone are "already imported" and skipped, so re-importing a newer export only adds new rows.
- `siteId` = `Location ID` if it matches `/^L\d+$/`; `place` = `Location` (cut to 120 chars); `mode` = `'seen'` (eBird doesn't say; the preview explains this in one line); `source` = `'ebird'`; `importBatchId` = new id.
- Flow: pick file → parse (show a progress line for big files; parse with `worker: true` or in chunks so 30,000 rows don't freeze the phone) → preview counts: Starter Dex birds (N species, M sightings), other birds, already imported, needs review (expandable list) → "Import" → write in chunks of 500 → toast with totals. Store a batch record (`importBatches`: id, source, file name, row count, imported count, date) in IndexedDB.
- The catch reveal does **not** run for imports. Instead, one summary screen: "Imported 12,431 sightings: 98 Starter Dex birds, 143 others." Bond (phase C) will rank them.
- Tests on synthetic CSV only (`tests/fixtures/ebird-sample.csv`, invented ids `S900000001…`, `L900001…`): header variants, AM/PM times, date-less row, sp./slash/hybrid rows, outside-Dex row, idempotency (import twice → second adds 0), 20,000-row synthetic parse completes under 3 s in vitest.
Screens: `npm run screens -- "#/journal >> click:Import"`.

**B2 Pasted list import.** In the same flow, a "Paste a list" tab: one bird per line, optional `, YYYY-MM-DD`. Match by Dex name (and eBird English name variants already in reports), case-insensitive; unmatched lines listed for review. No date → `date: null`. `source = 'list'`, key `list:<name>:<date|nodate>`.

**B3 Import history.** Journal shows past imports (file, date, counts) with "Undo this import" (confirm; deletes encounters with that `importBatchId`). Backup includes `importBatches`, as an optional field.

**B4 Year and Life lists; first of the year.** BirdDex screen gets a segmented control at the top: `Starter Dex | <this year> | Life list`.
- Year: every species (Dex and outside) with an encounter dated this calendar year, newest first, count in the progress pill ("63 this year").
- Life list: every species ever, Dex first in Dex order, then outside-Dex alphabetically. Outside-Dex cards show the name and a generic placeholder (template `songbird`, silhouette colours) and no Dex number.
- Logging a species already recorded before but not yet this year shows a second reveal beat: "First of <year>!" (reuse `Reveal`; reduced-motion safe).
Tests: year filter at year boundaries, null dates excluded from year, outside-Dex appear only in Year/Life.
Screens: `npm run screens -- "#/dex" "#/dex >> click:Life list"`.

**Phase B phone review (add to Waiting):** import a real eBird export on Lewis's phone; compare totals with eBird's life list; check year list.

### Phase C: Field Bond

**C1 Bond engine** `src/domain/bond.ts`:
`computeBond(encounters): Map<speciesId, Bond>` where `Bond = { points, rank, nextRankAt: number | null, firstDate, sightings, sites: number, months: number, bands: number, heard: boolean }`.
Process encounters sorted by date (null last), then time (null last), then `createdAt`. For each species keep sets of site keys, months (1–12), bands, years, and a "used" set of `species|siteKey|date` (date null → `species|siteKey|nodate`). A sighting whose used-key is already present earns 0. Otherwise:
- first ever sighting of the species: +10 and nothing else;
- else sum of: new site key +5; new month (needs a date) +4; new time band (needs a time) +3; first heard-only (`mode === 'heard'`) +3; first of a new calendar year (needs a date) +3;
- if that sum is 0: +1.
Ranks by points: Spotted 0+, Known 15+, Familiar 40+, Seasoned 80+, Old Friend 150+. `rankIndex` 0–4.
`rankUps(before, after)`: species whose rank rose (for the reveal).
Tests: each rule; daily cap per site; two sites same day both count; import of 1,000 synthetic sightings is fast (< 200 ms); deleting encounters lowers points (pure recompute).

**C2 Ranks in the UI.**
- Dex card: rank emblem bottom-left (fallback: 1–5 small pips drawn with CSS) and a frame class per rank (`frame-spotted` … `frame-oldfriend`; fallback CSS borders: plain, double, dashed "stitched" brown, brown with corner squares, gold with a slow shimmer that respects reduced motion). When `public/assets/ranks/` art exists, use it via `border-image`.
- Profile: rank name and emblem, progress bar to the next rank ("23 / 40 Bond to Familiar"), a collapsible "How Bond grows" list (the rules above in plain English), stats (sightings, sites, months, first seen).
- Known+: "Field notes" panel from traits in words (e.g. "Small · eats insects · resident · sings at dawn").
- Old Friend: summary line "First seen <date> at <place>, <N> sightings across <M> sites."
- Rank-up reveal after saving a sighting: a lighter overlay than the catch reveal (emblem pops, "Robin is now Familiar!"), skippable, chiptune sting if sound is on, crossfade only with reduced motion.
Screens: use the demo collection is not enough (no encounters). Add a dev-only route `#/dev/bond` that seeds an in-memory set of encounters and renders cards at each rank. `npm run screens -- "#/dev/bond" "#/bird/european-robin"`.

**C3 Nicknames.** At Familiar or above, profile shows "Give it a nickname" (≤ 24 chars, trimmed). Stored in prefs as `nicknames: Record<speciesId, string>`; shown in quotes under the species name on the profile and on the Dex card (small, truncated). Included in backups (add optional `nicknames` to `BackupSchema`).

**Phase C phone review:** look at the Dex after an import; try logging a bird at a new site and watch the rank bar move.

### Phase F: day route planner

**F1 Site-to-site matrix.** In `pipeline/run.ts`, after the start-point matrices: take the 40 sites with the most Dex species reported (per region), one ORS matrix request with all 40 as both sources and destinations, `metrics: ["duration"]`. Publish as optional `between: { ids: string[], s: (number | null)[][] }` on `RegionSchema` (seconds, rounded; null = unknown, never 0). Validate square and ids ⊂ sites. Budget: +1 ORS request per region per refresh (still far under 500/day). Dispatch a refresh, check the summary, record the facts.

**F2 Planner engine** `src/domain/routePlan.ts`:
`planDay(region, { startId, recorded, wanted: 'new' | string[] /* bird keys */, budgetMin, stopMin = 40, maxStops = 4 }) → { stops: { site, arriveMin, birds: string[] }[], totalMin, returnMin, uncovered: string[] }`.
Wanted birds: the given keys, or every unrecorded Dex species reported in the region when `'new'`. Greedy: from the start point, repeatedly choose the unvisited site (in `between.ids`) with the highest `(newly covered wanted birds) / (travel + stopMin)` such that elapsed + travel + stopMin + drive back to start ≤ budget. Travel from the start uses `drive.byStart`; between sites uses `between`; drive back uses the site's `byStart` time (approximation, label it so). Unknown travel → site not eligible. Stop when nothing adds a bird or `maxStops` is reached.
Tests: budget respected; unknown travel skipped; targets prioritised; picks a two-site plan that covers more than the best single site; empty result when nothing is reachable.

**F3 "Plan a day" sheet.** Map controls get a "Plan a day" chip (next to Find a bird). Sheet: what to look for (chips: "Most new birds", or each of your targets reported in the region; multi-select), time (2 h / 4 h / 6 h), result as an ordered list (site, arrive after N min, birds to look for with portraits), totals, and **Open in Google Maps**:
`https://www.google.com/maps/dir/?api=1&origin=<lat>,<lng>&destination=<lat>,<lng>&waypoints=<lat>,<lng>%7C<lat>,<lng>&travelmode=driving` with origin and destination = the start point and waypoints = the stops in order (note lat,lng order here). Copy under it: "A plan from recent reports, not a guarantee. Birds move; check access before you go." Credit: openrouteservice/OSM. If `between` is missing (old data), say "Route planning arrives with the next data update."
Screens: `npm run screens -- "#/map >> click:Plan a day"` (add a tiny `between` to the demo data so it renders).

**Phase F phone review:** plan a 4-hour day from Location 2 for Lewis and open it in Google Maps.

### Phase D: Reserve Wardens and badges

**D1 Site character** `src/domain/siteCharacter.ts`: `siteCharacter(site) → SetId[]`: count the site's reported Dex species per set (a species counts in each of its sets); sort sets by count, keep those with ≥ 25% of the site's Dex species, at most 2; fallback `['garden']`. Tests with synthetic sites.

**D2 Wardens.**
1. Add an Actions task `warden-draft` to `deploy.yml` running `tsx pipeline/warden-draft.ts` on the cached data (reuse step only; 0 API calls). It prints JSON to the job log and step summary.
2. Algorithm per region: candidates = sites with ≥ 12 Dex species reported and a known drive time ≤ 90 min. Primary character = first of `siteCharacter`. Pick the best candidate (most Dex species) for each of wetland, coast, woodland, farmland-upland, garden (if one exists), then fill to 8 by most Dex species, skipping any site within 2 km of an already chosen one. Signature = up to 8 Dex species reported at the site whose sets include the primary character, rarest in the region first (fewest sites reporting), filled with the site's other rarest Dex species if fewer than 8. Boss = the rarest signature bird.
3. Read the job log, write `src/data/wardens.v1.json`: `{ schema: 1, version: "wardens-v1", locations: { "<regionId>": [ { id, persona, siteId, siteName, habitat, signature: string[], boss } ] } }` with a zod schema in `src/data/game.ts`. `habitat` = primary character, except `night` when the boss is an owl, and `raptors` when the boss is a raptor.
4. Personas (ids match the art files `warden_<persona>.png`): wetland → `maud`, `reg`; coast → `bev`, `tomasz`; woodland → `rowan`, `agnes`; farmland-upland → `harold`, `sunita`; garden → `pat`, `fran`; raptors → `fergus`; night → `olu`. Use each persona once per location; if a habitat needs a third persona, borrow the closest unused one (wetland↔coast, woodland↔garden, farmland↔raptors). Persona display names: Maud the Marsh Warden, Reg the Reedcutter, Bev the Bait-digger, Tomasz the Tideline Counter, Rowan the Woodland Ranger, Agnes "Old Acorn", Harold the Hedgelayer, Sunita the Stubble-field Surveyor, Pat the Park Keeper, Feeder Fran, Fergus the Raptor Watcher, Olu "Owl-light". Each gets a one-line greeting you write in their voice (friendly, British, no jokes at anyone's expense).
5. Add "Lewis to sanity-check Location 2 wardens" to the Waiting list. The draft is good enough to build on.

**D3 Badge engine** `src/domain/badges.ts`:
- Warden badge tier: **bronze** = at least 5 signature birds including the boss logged with `siteId === warden.siteId` (any dates); **silver** = every signature bird logged there; **gold** = silver and a duel win against that warden (prefs `duelWins[wardenId]`, set in E4). Returns tier, logged signature ids, whether the boss is logged.
- Set badges: one per set (Garden, Woodland, Wetland, Coast, Raptors, Farmland), earned when every Starter Dex bird in that set is recorded.
- Year badges: 50 / 100 / 150 species recorded this calendar year (Dex and outside).
- Demo collection never earns anything (it has no encounters; also guard explicitly).
Tests for each rule, including logs at a different site not counting.

**D4 Badge UI.**
- `#/badges` "Badge case" screen, linked from the BirdDex banner and Journal: three sections (Reserve Wardens for the current location, Sets, This year). Warden pins show the boss bird in the centre; locked pins are silhouettes with "3 / 5 birds". Pin art file names use `farmland` for the `farmland-upland` habitat. Fallback pin art: `pixelSprite` shapes per habitat (shield, roundel, leaf, hexagon, flower, feather, moon) in bronze/silver/gold; real art from `public/assets/badges/` when present (file names in `game-art-brief.md`).
- Site sheet: if the site has a warden, a "Reserve Warden" panel near the top: portrait (fallback: `warden_silhouette` drawn as a pixel silhouette), name, greeting, signature birds as a strip (recorded-there in colour, not yet as silhouettes, boss marked with a crown icon), tier, and a "Challenge" button (disabled with "Coming soon" until E3).
- Map: warden sites get a small pennant on their pin (CSS, both skins) and the label includes "Reserve Warden".
- Badge earned after a save: a short "Badge earned!" overlay (like rank-up).
Screens: `npm run screens -- "#/badges" "#/map >> click:View spot"`.

**Phase D phone review:** Lewis checks the Location 2 wardens and signature lists; Joseph checks the badge case.

### Phase E: Field Duels

**E1 Duel engine** `src/domain/duel.ts` (pure, heavily tested):
- Cards: `DUEL_CARDS` from A3. **Fit**(bird, card) = (+1 if `card.sets` is empty or the bird's sets intersect `card.sets`) + (+1 per rule the bird's traits satisfy; a rule `{diet: [...]}` matches if the bird's diet is in the list, `{songster: true}` if it's a songster). Max 3.
- **Affinity**(species, card, encounters, siteCharacterById) = count of the player's encounters of that species that match the card: if `card.affinity === 'heard'` an encounter matches when its mode is `heard` or `both`; otherwise it matches when (card.sets empty or the encounter's site character intersects card.sets) and (card.months null or the encounter's month is in it) and (card.band null or the encounter's band equals it). Encounters without a `siteId` in the current region data only match cards with empty sets. Count 0 → 0, 1–2 → 1, 3+ → 2.
- **Bond point**: rank Seasoned or Old Friend → 1.
- **Score** = fit + affinity + bond point (0–6).
- **Draw**: seed = `hash(siteId + YYYY-MM-DD)` (rival duels: `hash(rivalName + date)`). Deck = cards valid this month whose sets are empty or intersect the site's character (rival duels: all month-valid cards). If fewer than 5, add other month-valid cards. If one card's band matches the current time band, it is round 1. Draw 5 without repeats.
- **Warden squad**: boss (always) + the 5 species reported at the site in current data with the highest total fit over the 5 drawn cards (fewer if fewer are reported). Warden birds get affinity 1 on every card (home ground); the boss gets +1 more.
- **Warden choice**: each round, the unused bird with the best score for this card, never the boss unless it's round 5 or the warden is behind by 2 or more after round 3. Ties → bigger size, then lower Dex number.
- **Rounds**: higher score wins the round; equal scores share it (no point). Best of 5 by rounds won; equal → draw.
- **Player squad**: up to 6 recorded Starter Dex species (prefs `squad: string[]`; default = top 6 by Bond points). Needs at least 3 to play.
Tests: fit per rule; affinity counting and caps; draw is deterministic for the same seed and valid for every month; warden holds the boss back; a full scripted duel; ties.

**E2 Squad screen** `#/squad` (from Badge case and the warden panel): your recorded birds sorted by Bond, tap to add or remove (max 6), each showing rank and its two best cards for today (card name + score). "Pick for me" = top 6 by Bond.

**E3 Duel screen** `#/duel/<wardenId>`:
- Intro: warden portrait and greeting, the site's habitat scene (`art/scenes.ts`) as the arena, "5 rounds. Best fit to the conditions wins each round."
- Each round: the condition card flips (card art from `public/assets/duel/cond_<id>.png`, fallback: card name on a habitat-coloured panel with a pixel icon), its flavour line, then your unused birds as a row of cards with that round's score shown; tap one; both birds slide in; scores tick up; one line of field-guide flavour ("Snipe probes the mud at dusk: right at home") built from the matched rules; round result.
- End: banner (win / draw / next time; fallback text), rounds summary, "Duel again tomorrow" (same day = same cards, so a rematch is allowed but noted), back to the warden.
- Under 30 s total with animations; every step skippable by tap; reduced motion = no slides, instant swaps; sounds only if sound is on.
Screens: seed a dev route `#/dev/duel` with fixed encounters and a fixed warden, step through with clicks. `npm run screens -- "#/dev/duel" "#/dev/duel >> click:Start >> click:Robin"`.

**E4 Gold badges.** A win against a warden stores `duelWins[wardenId] = date` in prefs (and backups). Badge engine gold rule now active; badge overlay on first gold.

**Phase E phone review:** play three duels; check they're fun, fair and quick; check reduced motion.

### Phase G: Rivals

**G1 Share codes** `src/domain/shareCode.ts`: payload `{ v: 1, n: name ≤ 20 chars, s: [{ d: dexNo, b: bondPoints, a: number[12] /* affinity 0–2 per card in DUEL_CARDS order */ }] }` (max 6 birds) → JSON → base64url. Decode with zod; reject anything malformed or oversized (> 1 KB). No dates, places or photos in the code. Settings: "Your birder name" (prefs `playerName`, default "Birder"). Squad screen: "Share my squad" uses the Web Share API with a link `https://joneillio.github.io/Bird-Dex/#/rival/<code>` (copy-to-clipboard fallback).

**G2 Rival duel.** `#/rival/<code>` shows the rival's name and squad, then runs a duel with the same engine: rival birds use their coded affinities and Bond; the deck is drawn from all month-valid cards with seed `hash(rival name + date)`. The rival side picks with the warden rule but has no boss. Result screen: "Share result" → text like "I won 3–2 against Lewis in a BirdQuest Field Duel" plus a link to my own squad code.

**G3 Patch race (optional).** Settings: choose "My patch" (a site from the current data). Journal shows this month's patch count (species logged with that `siteId` this month). "Share my patch month" code: `{ v: 1, n, site: siteId, m: YYYY-MM, c: count, s: speciesIds[] }`. Opening a patch code compares the two lists (shared, only theirs, only yours). No server.

### Phase H: map polish

**H1 List view.** BUILD_PLAN T3.5: a "List" toggle on the map shows the same filtered sites as a list (name, minutes, new-to-you count, featured bird, NEW badges), tap to open the site sheet. Also the fallback when the map fails to load.

**H2 Adventure skin.** BUILD_PLAN T4.1–T4.3 as written there, using the converted patterns in `public/assets/map/patterns/` when present (water, woodland and reeds tiles come from game art Set 1) and `pixelSprite` fallbacks otherwise. Segmented control Adventure | Field in map controls; switching keeps camera, selection, sheet and filters. Phone review needed for the look (the sandbox can't load tiles).

### Phase I: polish and hand-over

**I1 First run** (BUILD_PLAN T8.2): pick location → "Import from eBird" or "Start fresh" → map. One screen each, skippable, shown once (prefs `onboarded`).
**I2 Credits** (T8.3): eBird, OpenFreeMap/OpenMapTiles/OpenStreetMap, openrouteservice by HeiGIT (CC BY-SA 4.0 routing), fonts (OFL), art (AI-assisted drafts, reviewed by Joseph). Linked from Settings.
**I3 Accessibility** (T8.4): contrast ≥ 4.5:1 for text, labels on every icon button, focus order in sheets, reduced motion everywhere including duels and reveals, nothing conveyed by colour alone (ranks, badges, NEW and Rare have text or shape too). Run screens at `WIDTH=360` for every main route.
**I4 Hand-over note**: `docs/for-lewis.md` and a matching Settings → "How to use" screen: add to home screen, import from eBird, back up monthly, what the badges and duels are, how to share a squad.

### R1 Art intake (whenever Joseph uploads a ZIP)

- Bird batch: `python scripts/art/import_batch.py <zip> batch-NN`, then `npm run build && npm run screens -- "#/dev/art"`, open the screenshots and check each new bird at 64 px and as a silhouette. If a bird looks wrong for its species (wrong colours or missing a field mark listed in `bird-batches.md`), keep the old placeholder for that id and tell Joseph which ones to redo and why. Commit `AP R1: bird batch NN`.
- Game art set: follow "Notes for Claude when a set arrives" at the end of `game-art-brief.md`; swap fallbacks for the art via the lookups named in the tickets above.

---

## 5. Definition of done for the whole plan

All boxes ticked; `npm run typecheck && npm run lint && npm test && npm run build` green; the live site works on Joseph's and Lewis's phones; BUILD_PLAN acceptance list (Part G) still holds; no key in the bundle (`grep -r "EBIRD\|ORS_API" dist` finds only attribution text); every phone review in the Waiting list done or consciously deferred by Joseph.
