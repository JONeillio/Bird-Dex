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

- [ ] Lewis's eBird export ("Download My Data" on ebird.org) to test B1 for real. Until then use the in-app sample history (Journal → Import → Try a sample history). Joseph agreed 8 Nov to prove the concept on made-up data first.
- [ ] Which app Lewis mainly logs in (eBird, Merlin, BirdTrack).
- [ ] Bird art batches 01–10 (`bird-batches.md`) and game art sets 1–5 (`game-art-brief.md`). Process with R1 whenever a ZIP is uploaded. **Done 8 Nov:** game art Set A (stamps and rarity tier marks, `src/art/marks.ts`) and the NPC pack (`src/art/npcs.ts`); use `STAMPS` and `tierMarkFor` in N5/N7 instead of drawing fallbacks. Game art Sets B-E also arrived 8 Nov (NPC map sprites, expressions, keepsake icons, dialogue kit): see `research/art-drafts/game-art/README.md` and `src/art/{npcs,keepsakes,dialogueKit}.ts` for any NPC encounter or dialogue screen. Astra's ZIP export failed (phone storage), so on 8 Nov four wardens (Maud, Reg, Agnes, Harold) and two marsh scenes were cut from Joseph's screenshots instead; the other 8 wardens, badges, ranks, duel cards and terrain tiles are still to come, in any form (ZIP, or more screenshots).
- [ ] Lewis to sanity-check the Location 2 warden sites and signature birds (`src/data/wardens.v1.json`, drafted 8 Nov). Things to ask: do the sites make sense as local landmarks, are the signature birds the ones he would look for there, and is Rainham Marshes as "wetland" right. The draft puts several Location 2 sites under "garden" (Walthamstow Wetlands, Richmond Park, Beddington Farmlands) because they report a lot of woodland and garden birds, so some may deserve a different habitat.
- [ ] Phone check of B1b/B2: Journal → Import → choose `samples/MyEBirdData-sample.zip` (download it from the repo) and try Paste a list with a few bird names.
- [ ] Joseph's redesigned visual assets (from another app). The UI phase waits for them. **8 Nov 16:34:** Sets B–E arrived (NPC map sprites, expressions, keepsakes, dialogue kit), enough for the Folk screens and the Field Report sheet. Still missing for the rest of the canvas: 8 warden portraits (and talk/delight for all 12 wardens if they are to speak like the NPCs), badge pins, rank frames and emblems, water/woodland/reeds map tiles, and scene backdrops for the NPC encounters (not yet briefed). Ask Joseph whether the UI phase can start now with what exists.
- [ ] Val's talk and delight portraits: ask for a redraw with the red tie and light-blue collar, or accept neutral-only for Val (R2).
- [ ] After N4: Joseph opens `#/dev/engine` with the sample history loaded and says whether the scores feel right.
- [ ] Phone reviews (added at the end of each phase).

---

## 2. Checklist (tick as you go)

**Order decided with Joseph, 8 Nov 14:05: engines first, UI later.** Joseph is redesigning the visuals in another app and will bring the assets over, so do not spend effort on styled UI until then. Build every game rule as pure, tested logic now; the only new screen is a plain dev readout (N4) so the numbers can be checked on a phone. **Model:** every ticket below is written for Sonnet. Use Opus only to change a design decision or when a check fails 3 times.

**Done**
- [x] A1 Encounter fields · [x] A2 Log sheet site/time, editing · [x] A3 Game data loaders · [x] A4 Art intake script
- [x] B1 eBird CSV import · [x] B1c Sample history · [x] B3 Import history with undo

**Phase N: engines (do these first, in this order)**
- [x] C1 Bond engine (spec under Phase C)
- [x] N1 Outings and rarity values
- [x] N2 Field Report engine (points, lifers, rank-ups, par, explorer bonus)
- [x] N3 Stats and exploration engines
- [x] N4 Engine readout page `#/dev/engine` (plain text, no styling work)
- [x] D1 Site character
- [x] D3 Badge engine (set and year badges now; warden tiers work once D2 exists)
- [x] E1 Duel engine
- [x] F1 Pipeline: site-to-site drive matrix (+1 ORS request per region per refresh)
- [x] F2 Route planner engine
- [x] D2 Warden draft task and wardens.v1.json
- [x] B1b Accept eBird's ZIP directly
- [x] B2 Pasted list import

**Phase P: engines for the design canvas (agreed with Joseph 8 Nov 15:31; do these next, in this order)**
Joseph approved rows 1–4 of the design canvas (https://claude.ai/artifact/H8SAi6yZ2Wb6S3KTfSHKSw; summary in the Claude project doc `claude/birdquest-design-concepts.md`). Row 5 (alternative visual styles) was not chosen: don't build themes. Specs are under "Phase P" in section 4. P1 goes first because its history only starts filling from the day it ships.
- [x] P1 Pipeline: report history (days reported, time of day) kept in the Actions cache, 0 extra API calls
- [x] P2 Encounter v3 fields (count, checklist, duration) and the importer keeping them
- [x] P3 Game store (IndexedDB v3) and backup schema 2
- [x] P4 Outings v2: checklists, start time, duration, card number, "opened" parcels
- [x] P5 Field Report v2 additions (nearly levelled, most counted, extras by name)
- [x] P6 Bond record: months, time bands and field notes for the profile
- [x] P7 Reliability and Find a bird v2
- [ ] P8 Bird News engine (with sunrise and sunset worked out on the phone)
- [ ] P9 Warden jobs and trust
- [ ] P10 Warden notes (a weekly line in each warden's voice)
- [ ] P11 Call it engine (replaces duels as the warden contest)
- [ ] P12 Folk: NPC data, home sites, meetings, challenges and keepsakes
- [ ] P12b NPC dialogue scripts with expressions (Opus)
- [ ] P13 Year race in share codes; storage persistence check
- [ ] P14 Engine readout additions on `#/dev/engine`

**UI phase (waits for Joseph's new visual design; build with his assets)**
Screens follow the design canvas. Bottom tabs become **Explore · Dex · Journal · Folk** (Folk holds NPCs, wardens and Call it). Art for NPCs, keepsakes, dialogue and the Field Report sheet arrived 8 Nov (game art Sets B–E), so U0 can be built as soon as Joseph says the UI phase can start.
- [ ] U0 Shared dialogue and sheet components from the dialogue kit (spec under Phase P, after P14)
- [ ] N5 Field Report flow: new checklists as parcels → report → what levelled up → outing card (canvas 2a–2d; engines N2, P4, P5)
- [ ] U1 Bird News screen (canvas 1b; P8)
- [ ] U2 Find a bird as a wanted poster with reliability strips (canvas 1c; P7)
- [ ] B4 + N6 BirdDex tabs: Dex | <year> | Life | Patch, rank frames, "about now" and "close to rank up" filters (canvas 4a)
- [ ] C2 Ranks on cards and profile; rank-up reveal; profile "your year with it" (canvas 4b; P6)
- [ ] C3 Nicknames
- [ ] N7 Exploration on the map (explored / unexplored sites, region %, nearest unexplored) (canvas 1a)
- [ ] F3 "Plan a day" sheet (canvas 1d)
- [ ] D4 Badge case, warden page (trust, jobs, note), warden pennants (canvas 3b, 4c; P9, P10)
- [ ] U3 Call it screen (canvas 3c; P11)
- [ ] U4 Folk tab: people met, encounter screens, satchel (canvas 3a, 3d; P12)
- [ ] ~~E2 Squad screen · E3 Duel screen~~ **parked 8 Nov**: Call it replaces duels. Keep `src/domain/duel.ts` and its tests; don't build its screens unless Joseph asks.
- [ ] E4 Gold badges, now earned by winning a Call it (see P11)
- [ ] G1 Share codes (with the year race, P13) · [ ] G2 Rival Call it (optional) · [ ] G3 Patch race (optional)
- [ ] H1 List view · [ ] H2 Adventure skin
- [ ] I1 First run · [ ] I2 Credits · [ ] I3 Accessibility · [ ] I4 Hand-over note

**Recurring**
- R1 Art intake (whenever art arrives; not ticked, repeat as needed)
- [ ] R2 Expression colour match: a script (`scripts/art/match_palette.py`) that remaps each runtime `<id>_talk` and `<id>_delight` PNG (256 and 512) onto the colours of that NPC's neutral PNG, so swapping while text types doesn't flicker (Set C review note: about 2% colour drift). Keep the masters as they are. Val's tie and collar are a different colour in her expressions, so a remap won't fix her: use `neutral` only for Val until a redraw arrives.

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

**B1 notes (built 8 Nov).** Parser `src/data/importers/ebird-csv.ts` (streams a File in 512 KB chunks; `parseEbirdCsv` for text and tests), `ImportFlow.tsx`, `records.addMany` (chunks of 500), IndexedDB v2 with an `importBatches` store. Choices made: sub-species rows (`Branta bernicla bernicla`) count as the species (two-word name) for outside-Dex ids, and a bracketed form such as "(Dark-bellied)" is dropped from the name; rows dated in the future need review; the `Count` column is not stored (no field for it). The Journal list shows 100 at a time and the profile 20, so a 12,000-sighting import does not freeze the phone. The screens script has `upload:<selector>|<path>`.

**B1c Sample history (built 8 Nov).** `src/data/importers/sample-history.ts` writes a made-up export in eBird's own columns (seeded, so the same every time): about 240 checklists at 12 invented "Sample …" sites (`L99…`, submission ids `SMP…`, so nothing can match a real checklist), January 2024 to today, 84 of the 104 Dex birds plus 17 outside the Dex, 14 Dex birds deliberately never seen (bittern, dipper, goldeneye…) so there are always targets, and a few sp./slash/domestic rows for the needs-a-look list. It goes through `parseEbirdCsv` and `planEbirdImport` exactly like a real file; records and the batch carry `source: 'sample'`. Labelled "Sample history" in the Journal and "Includes sample history" on the BirdDex. **Rule for later phases:** sample data drives lists, Bond, duels and rivals so they can be seen working, but must never earn Reserve Warden badges or any other achievement (D3, E, G: ignore `source === 'sample'` when awarding). **Also as files (8 Nov):** `samples/MyEBirdData-sample.csv` and `.zip` (same data, zipped like eBird's email; use it to test B1b), rebuilt by `npx tsx scripts/dev/make-sample-export.ts`; `tests/sample-export-files.test.ts` fails if they drift. eBird has no account linking or API for a user's lists, so a download file like this is the only route. Seeded helpers are in `src/domain/random.ts` (`hash`, `mulberry32`, `rngFor`), reuse them for duel draws.

**B1b ZIP support.** eBird emails a ZIP holding `MyEBirdData.csv`. In `ImportFlow`, accept `.zip` too: find the first entry ending `MyEBirdData.csv` (or any `.csv`) with a minimal central-directory reader and `DecompressionStream('deflate-raw')` (stored entries are copied as they are), reject anything over 200 MB uncompressed or with no CSV, then hand the text to the same parser (`parseEbirdCsv`; show the chunked progress line while reading). No new dependency unless the reader proves flaky; test with a ZIP built in the test (use `node:zlib` `deflateRawSync`). Update the pick-step instructions to "choose the ZIP or the CSV".

**B2 Pasted list import.** In the same flow, a "Paste a list" tab: one bird per line, optional `, YYYY-MM-DD`. Match by Dex name (and eBird English name variants already in reports), case-insensitive; unmatched lines listed for review. No date → `date: null`. `source = 'list'`, key `list:<name>:<date|nodate>`.

**B1b and B2 notes (built 8 Nov).** `src/data/importers/zip.ts`: `prepareImportFile(file)` returns a CSV as it is, or, when the first bytes are a ZIP header (the name does not matter), the CSV taken out of it (`extractCsvFromZip`, `chooseCsvEntry`: MyEBirdData.csv first, else the first .csv, folders and `__MACOSX` ignored). It reads only the end of the ZIP, the central directory and the one entry, so a large ZIP does not load into memory; inflating stops at 200 MB even if the ZIP lies about its size. Plain-English errors for no CSV, password protected, ZIP64, too big and damaged ZIPs. The result is a File, so the normal chunked parser and progress bar are used. `ImportFlow` now says "Import your birds", takes `.zip` or `.csv`, and has a "Paste a list" step. `src/data/importers/pasted-list.ts`: `parsePastedList(text, {species, today})` gives the same `EbirdParsed` shape, so the preview, plan, "already imported" skipping and undo all work unchanged. Names match the Dex `name` or `ebirdName` ignoring case, hyphens and apostrophes; bullets and numbering are stripped; a date is optional (YYYY-MM-DD or DD/MM/YYYY), no date is stored as `date: null`; unmatched names, bad or future dates are listed with their line numbers and not imported; first 2,000 lines only. Key `list:<dexId>:<date|nodate>`, `source: 'list'`. Only Starter Dex birds can be pasted for now (an outside-the-Dex bird would need a scientific name). `ImportRow.date` is now `string | null`. **Needs a phone check:** choosing the sample ZIP with the file picker on Joseph's Android phone (`samples/MyEBirdData-sample.zip`); the sandbox tests the reader on hand-built ZIPs and the committed sample, but not the real picker.

**B3 Import history (built 8 Nov).** `ImportsPanel.tsx` in the Journal lists each import with its live count and a two-step "Remove" (`records.undoBatch`, storage `removeMany`); it removes only sightings carrying that `importBatchId`, so your own logged sightings stay, and the same file can be imported again afterwards. Not done: the backup file does not carry `importBatches` yet, so after a restore the panel is empty (records keep their `importBatchId`). Original spec: Journal shows past imports (file, date, counts) with "Undo this import" (confirm; deletes encounters with that `importBatchId`). Backup includes `importBatches`, as an optional field.

**B4 Year and Life lists; first of the year.** BirdDex screen gets a segmented control at the top: `Starter Dex | <this year> | Life list`.
- Year: every species (Dex and outside) with an encounter dated this calendar year, newest first, count in the progress pill ("63 this year").
- Life list: every species ever, Dex first in Dex order, then outside-Dex alphabetically. Outside-Dex cards show the name and a generic placeholder (template `songbird`, silhouette colours) and no Dex number.
- Logging a species already recorded before but not yet this year shows a second reveal beat: "First of <year>!" (reuse `Reveal`; reduced-motion safe).
Tests: year filter at year boundaries, null dates excluded from year, outside-Dex appear only in Year/Life.
Screens: `npm run screens -- "#/dex" "#/dex >> click:Life list"`.

**Phase B phone review (add to Waiting):** import a real eBird export on Lewis's phone; compare totals with eBird's life list; check year list.

### Phase N: engines (the core loop and exploring)

Why (Joseph, 8 Nov): two reasons to open the app. **Exploring**: see what is around you, with places you have not been yet holding something back. **The Field Report**: get home, log or import the day, and see how you did, against your own past visits and against the site's par (what other birders reported there recently). Logging the same bird again levels it up (Bond, C1). All engines are pure functions in `src/domain/` with vitest tests; no styled UI.

**N1 Outings and rarity values.**
`src/domain/outings.ts`:
- `siteKey(e)` as in section 3. `Outing = { key: "<date>|<siteKey>", date, siteKey, siteId: string | null, place, species: string[] /* distinct keys in first-seen order; key = speciesId */, encounters: Encounter[], sample: boolean /* true if every encounter has source 'sample' */, lastCreatedAt }`.
- `groupOutings(encounters): Outing[]`: dated encounters only, grouped by date and site key, newest date first.
- `outingsSince(encounters, sinceCreatedAt: string | null): Outing[]`: outings holding at least one encounter with `createdAt` after `sinceCreatedAt` (null = all). This is how "what's new since I last looked" works for both logging and re-importing.
`src/domain/rarity.ts` (species-level, per region; a bird's value depends on the area you are in, not the site):
- Key = binomial (first two words of the scientific name): Dex birds use the catalogue `sciName`, outside-Dex birds use the encounter's `sciName`, so both work.
- `buildRarity(region: RegionData): RarityTable`. Counted sites = sites with at least one report. `share` = sites reporting the species / counted sites. Tier and points: any report of it with `notable` and not `unconfirmed` → **rare 25**; share < 3% → **scarce 10**; < 10% → **uncommon 5**; < 25% → **fairly common 2**; otherwise **common 1**.
- `rarityOf(table, binomial)`: not in the table → **unreported 8** ("not reported nearby lately"). No region data at all → every bird is `unknown 1` (scores still add up, just flat).
- Rarity is recomputed from the current data, so it moves with the seasons; the UI will say "based on the last 14 days of reports".
Tests: tiers at each boundary, notable vs unconfirmed, outside-Dex key, unreported, no region.

**N1 notes (built 8 Nov).** `src/domain/outings.ts` (`groupOutings`, `outingsSince`, `outingKey`; re-exports `siteKey`) and `src/domain/rarity.ts` (`buildRarity`, `rarityOf`, `binomialOf`, `sciNameFor`, `RARITY_POINTS`, `RARITY_LABELS`). Outings on the same date are ordered most recently added first. `rarityOf(table, sciName)` takes a scientific name; use `sciNameFor(speciesId, encounter.sciName)` to get it for Dex and outside-Dex birds. A region with no sites that have reports counts as no data (every bird `unknown`, 1 point).

**N2 Field Report engine** `src/domain/fieldReport.ts`.
`allFieldReports(encounters, ctx: { rarity, region: RegionData | null }): FieldReport[]` in **one chronological pass** (12,000 encounters under 500 ms in vitest), and `fieldReportFor(outingKey, …)`.
`FieldReport = { outingKey, date, place, siteId, sample, speciesCount, birds: { key, name, tier, points, lifer, firstOfYear, rankUp: { from, to } | null }[] /* sorted by points, then name */, points: { rarity, lifers, firstsOfYear, bond, explorer, total }, bestBird: key | null, par: { par, found, extra: string[] } | null, siteBest: { previous: number | null, isNewBest: boolean }, firstVisit: boolean }`.
Rules:
- **Lifer**: no encounter of that species on an earlier date (same date at another site: the earlier `time`, then `createdAt`, gets it). **First of year**: not a lifer and no earlier encounter that calendar year.
- **Points**: rarity = sum of rarity points over the outing's distinct species; lifers +20 each; firsts of year +5 each; bond = Bond points earned by this outing's encounters (C1 rules, so repeat visits still score but less); explorer +15 when `firstVisit`. Total = sum.
- **Rank-ups**: species whose Bond rank rose because of this outing (C1 `rankUps`).
- **Par** (the "NPC" benchmark; the warden voices it later): only when the region data has a site with `id === outing.siteId`. `par` = distinct species reported there in the window; `found` = how many of those you logged on this outing; `extra` = species you logged that are not in the reports (your finds the crowd missed). Null for other sites.
- **Site best**: the most species on any earlier outing at the same site key; `isNewBest` when this beats it (false on a first visit).
- **First visit**: no earlier outing at this site key; the key `unknown` never counts.
- `sample` passes through: sample outings get reports (so the loop can be seen working) but D3/E/G never award anything from them.
Tests: a scripted 5-outing history covering every rule; par present and absent; same-day two-site lifer goes to the earlier one; speed test.

**N2 notes (built 8 Nov).** `src/domain/fieldReport.ts` (`allFieldReports`, `fieldReportFor`, `FieldReport`, `ReportBird`). Reports come back newest outing first (same order as `groupOutings`). Each bird's `points` = rarity + lifer + first of year + the Bond it earned on that outing, so the report total always equals the sum of the birds' points plus the explorer bonus (tested). `par.extra` and `bestBird` are species ids (look names up through `birds`). A rank-up spans from the bird's rank before its first sighting on the outing to its rank after the last, and is never set for a lifer. An unknown place has no first visit, no explorer bonus and no site best. Sample outings carry `sample: true`; D3/E/G must ignore those when awarding.

**N3 Stats and exploration engines.**
`src/domain/stats.ts`: `collectionStats(encounters, reports: FieldReport[], bond, rarity, today)` → `{ totals: { sightings, species, dexSpecies, outings, sites }, mostSeen /* top 10 by sightings */, topBond /* top 10 by Bond points */, coolest /* top 10 recorded birds by rarity points, ties by fewest sightings */, years: { year, species, lifers, outings }[], bestOutings /* top 5 reports by total */, streak: { currentWeeks, bestWeeks } /* ISO weeks with at least one outing, current counts back from this week or last */ }`. Sample records count here (they are only stats), with a `sample` flag on the result if any were used.
`src/domain/explore.ts` (works from eBird imports too: the export carries each checklist's Location ID, so every place Lewis has birded counts):
- `visitedSiteIds(encounters)`: distinct `siteId`s that pass `validSiteId`.
- `exploration(region, visited, startId)` → `{ explored: string[], total, share, nearestUnexplored: { siteId, minutes }[] /* up to 5, known drive times only, nearest first */ }`.
- **Rule (decided):** reports are never hidden; seeing what is about is the main use of the app. What an unexplored site holds back: its warden (shown as a silhouette with "?" until your first outing there), your par history there, and an "Explored" stamp. A first visit gives the Field Report's explorer +15 and raises the region's explored %.
Tests: visited from logs and imports, demo and sample site ids ignored, unknown drive times skipped, share maths.

**N3 notes (built 8 Nov).** `src/domain/stats.ts` (`collectionStats(encounters, reports, bond, rarity, today)`, `streakOf`, `weekIndex`) and `src/domain/explore.ts` (`visitedSiteIds`, `exploration`). `today` is a `YYYY-MM-DD` string so the engine stays clock-free. `years` is newest first; its `species` counts distinct birds with a dated sighting that year, and `lifers`/`outings` come from the Field Reports. `visitedSiteIds` ignores `source: 'sample'` records as well as demo ids, so made-up sites can never explore a real place. `exploration.total` is every site in the region, and unknown or missing drive times are skipped, never 0.

**N4 Engine readout** `#/dev/engine` (linked from Settings next to the art gallery). Plain lists using existing components, no new styling: totals; tier counts; top 5 most seen, top Bond, coolest; the 5 latest Field Reports as text ("2 Nov · Sample Reedbed Reserve · 18 species · 143 pts (rarity 61, lifers 40, firsts 15, bond 27) · best: Water Rail · par —"); exploration % for the current location and the 5 nearest unexplored sites. Header line says whether sample data is in use. Screens: `npm run screens -- "#/journal >> click:Import >> click:Try a sample history >> wait:400 >> click:Add sample >> wait:2500 >> click:Done" "#/dev/engine"`.

**N4 notes (built 8 Nov).** `src/features/dev/DevEngine.tsx`, linked from Settings next to the UI kit and Bird art. It reads your records and the current region's data, and shows totals, streak, birds by rarity tier, years, top 5 most seen / Bond / coolest, the 5 latest Field Reports as text, best outings and exploration for the current location. With the demo region, rarity is based on sparse made-up reports, so most sample birds read as "not reported nearby lately"; the live site will differ. Checked at 412 and 360 px, empty and with the sample history.

**N5 Field Report screen (UI phase).** After an import or a log, a "Your Field Report" sheet for outings since `prefs.lastReportSeenAt` (newest first, swipe between them): headline, best bird, lifers and firsts, rank-ups, points breakdown, par line ("Reported here lately: 31. You found 23, plus 2 nobody else logged."), site best. Then set `lastReportSeenAt`. Journal gets a "Reports" view of past outings. Visual design from Joseph's assets.

**N6 Stats tab (UI phase, with B4).** Fourth BirdDex tab showing N3: totals, most seen, top Bond, coolest birds, years, best outings, streak.

**N7 Exploration on the map (UI phase).** Explored sites get a stamp on their pin; unexplored keep the normal pin with a small "?"; the status line shows "Explored 7 of 80 spots"; a "Somewhere new" chip lists the nearest unexplored spots. Warden silhouettes until visited (with D4).

### Phase P: engines for the design canvas (8 Nov)

Why: Joseph approved the canvas rows for Explore (map, Bird News, Find a bird, Plan a day), the Field Report flow, Folk (NPCs, warden jobs, Call it) and the Collection. Most of it already has an engine (N1–N3, C1, D1–D3, F1–F2). These tickets fill the gaps so the UI phase is only screens. Same rules as phase N: pure functions in `src/domain/`, vitest tests on synthetic data, no styled UI, sample data shows but never earns anything (`source === 'sample'`), public reports never award progress.

**Rule for every new stored thing:** keep only what cannot be worked out again from encounters plus published data (choices you made, notes, opened flags). Trust, job progress, badges, keepsakes earned and Call it results are always recomputed, the way the collection is.

**P1 Pipeline: report history (0 extra API calls).** The recent-observations endpoint gives only the latest report per species per site, so "reported on 9 of the last 14 days" needs memory between runs.
- Keep `.cache/bq-data/history.json` (the cache only, never git, never published raw): `{ schema: 1, since: "YYYY-MM-DD", sites: { [locId]: { [speciesCode]: { d: string[] /* distinct obs dates, newest first, max 30 */, t: string[] /* obs times HH:MM, newest first, max 20 */ } } } }`. Each refresh merges every report it fetched (latest per species per site, plus notable records at listed sites), then drops dates older than 30 days and sites no longer listed. `since` = first day the history existed.
- Publish two optional fields on `ReportSchema`: `days` (integer bitmask over the region window: bit 0 = the region's `generatedAt` date, bit 1 = the day before … bit 13; never larger than 2^14−1) and `bands` (`{ dawn, day, dusk, night }` counts from `t` using `timeBand`). Add optional `historySince` (date) to `RegionSchema` so the app can say "since 9 Nov" while it fills up. Older data without these fields must still validate.
- Honest limits, written in a code comment and in CLAUDE.md "Facts learned": two refreshes a day catch most report days, but a checklist submitted late, after a newer one for the same species and site, is missed, so the UI says "about N of 14 days". Times are only known for reports eBird gives with a time.
- Make sure the workflow saves the cache after a refresh with history (key per run, as now) and that a code-only deploy keeps the old history untouched.
- Tests (synthetic): merge adds a new date once, keeps 30 max, drops old dates; bitmask maths across a month boundary; bands from times; a site leaving the list drops its history; schema accepts old and new region files.
- Then dispatch a refresh, read the summary, and record in CLAUDE.md: history file size, the number of species-site pairs, and that eBird calls did not change.

**P1 notes (built 8 Nov).** `pipeline/history.ts` (pure, tested in `tests/history.test.ts`): `mergeHistory`, `withHistory`, `daysMask`, `countDays`, `bandCounts`, `isPublishable`. The file is `.cache/bq-data/history.json` and sits in the same cache as the published JSON, so `reuse()` in `run.ts` copies the cache into `pipeline/out` with `filter: isPublishable` (the history is never published) and `refresh()` writes it back after rebuilding the cache. It is only written when a refresh succeeds, so a failed refresh or a code-only deploy leaves it untouched. Unconfirmed (awaiting review) records are not remembered. `days` is published on each report with history (bit 0 = the day the data was generated; one day ahead counts as today because eBird dates are local and the generated date is UTC) and `bands` only when a time is known. Use `countDays(report.days)` for "N of 14 days" and say "since <historySince>" until 14 days have passed. UI must say "about N of 14 days".

**P2 Encounter v3 fields.** Add to `EncounterSchema`, all optional (old records and backups still parse): `count` (int ≥ 1, or null when eBird says "X"), `checklistId` (eBird Submission ID such as `S123…`, ≤ 32 chars), `durationMin` (int 0–1440, the checklist's duration). The eBird importer keeps `Count`, `Submission ID` and `Duration (Min)` when present (sample history too: make the seeded generator produce believable counts and durations). Logging by hand: add an optional count field to the log sheet in the UI phase, nothing now. `Count` is still never invented. Tests: CSV with and without these columns, "X" count → null, re-import adds nothing.

**P2 notes (built 8 Nov).** `Encounter` has optional `count` (int ≥ 1, `null` = eBird's "X", absent = unknown), `checklistId` (`^S[A-Za-z0-9]+$`, ≤ 32) and `durationMin` (0–1440). The importer reads `Count`, `Submission ID` and `Duration (Min)` (`parseEbirdCount`, `parseEbirdDuration` are exported): odd values are left out, never guessed, and a file without the columns gives records without the fields. The sample generator already wrote believable counts, SMP ids and durations; it now also marks the first bird of every 23rd checklist "X" (no random draw, so nothing else in the sample moved) and `samples/` was regenerated. Tests in `tests/encounter-v3.test.ts`. `rowsToEncounters` is the only place the fields are copied, so P4 groups by `checklistId` straight from the encounters.

**P3 Game store and backup v2.**
- IndexedDB version 3 adds a `game` store (keyPath `id`), with typed documents validated by zod in `src/data/personal/game-schema.ts`: `opened` (`{ id: 'opened', keys: string[] }`: outing keys whose Field Report was opened), `outingNote` (`{ id: 'note:<outingKey>', text ≤ 500 }`), `call` (P11 records, `id: 'call:<id>'`), `npc` (`{ id: 'npc:<npcId>', choices: Record<string, string> }`: answers you gave in encounters, nothing derivable), `npcHomes` (`{ id: 'npcHomes:<regionId>', homes: Record<npcId, siteId> }`, P12), `prefsExtra` (`{ id: 'prefs', nicknames: Record<speciesId, string>, lastNewsSeenAt: string | null, lastReportSeenAt: string | null, playerName: string }`). Memory fallback like `memoryStorage`. A damaged document is skipped, never fatal.
- `BackupSchema` gains `schema: 2` with optional `importBatches` and `game` (array of game documents). `parseBackup` accepts 1 and 2; `buildBackup` writes 2. Restore merges game documents by id (backup wins only when the phone has none; `opened` keys are unioned).
- `src/state/game.ts`: a small hook like `useRecords` (load once, update optimistically, save).
- Tests: upgrade from v2 keeps encounters and batches; schema 1 backup still restores; round trip keeps game documents; union of opened keys.

**P3 notes (built 8 Nov).** `src/data/personal/game-schema.ts`: `GameDocSchema` (union of `opened`, `note:<outingKey>`, `call:<id>` (loose: id, wardenId, siteId, madeAt, expiresOn, other fields kept, so P11 can tighten it), `npc:<npcId>`, `npcHomes:<regionId>`, `prefs`), `validGameDocs`, `mergeGameDocs` (phone wins, `opened` keys unioned), `openedKeysOf`, type guards `isOpenedDoc`/`isPrefsDoc`/`isNpcDoc` (the union's string ids do not narrow on their own), `DEFAULT_PREFS_EXTRA`. `RecordsStorage` gained `loadGame/putGame/putGameMany/removeGame` (IndexedDB version 3, `game` store; the memory fallback too). `src/state/game.ts`: `useGame` (`docs`, `load`, `put`, `remove`, `restore`, `markOpened`, `setNote`, `setNickname`, `setPrefs`, `setNpcChoice`, `setNpcHomes`), `prefsOf(docs)` and `useOpenedKeys()`; it is loaded in `App.tsx` right after the records and shares their storage (`currentStorage()` from `records.ts`). `BackupSchema.schema` is 1 or 2 with optional `importBatches` and `game` (damaged game documents are dropped on read); `buildBackup(encounters, targets, now, { importBatches, game })` writes 2; `planRestore(..., have)` also returns `addedBatches` and `mergedGame`; Settings passes both and `useRecords.restoreBatches` / `useGame.restore` apply them. Added `fake-indexeddb` as a dev dependency to test the version 2 to 3 upgrade (`tests/idb-upgrade.test.ts`); other tests are `tests/game-store.test.ts`. No UI yet: the screens in the UI phase use `useGame`.

**P4 Outings v2 and parcels.** In `outings.ts`, extend `Outing` (no breaking changes): `checklistIds: string[]`, `startTime: string | null` (earliest `time`), `durationMin: number | null` (sum over distinct checklists; null when none had one), `cardNo: number` (1-based count of real, non-sample outings in that calendar year in date order; sample outings get 0). New `src/domain/parcels.ts`: `unopened(outings, openedKeys, sinceCreatedAt)` lists outings with sightings added after `sinceCreatedAt` and not yet opened, newest first; `markOpened(keys, opened)` returns the new set. A grouping rule stays as now (one outing = one date at one place), so two checklists at one site on one day are one parcel. Tests: card numbers by year, sample excluded from numbering, duration sums per checklist not per sighting, unopened after a re-import.

**P4 notes (built 8 Nov).** `Outing` gained `checklistIds` (distinct, in the order of the day because sightings are chronological), `startTime` (earliest known time), `durationMin` (each checklist's duration counted once; sightings with a duration but no checklist id count once as a group; null when none known) and `cardNo` (real, non-sample outings numbered 1, 2, 3 within their calendar year by date, ties by when added; sample outings are 0). A card number can change if you import an older outing later, so show it as "No. 12 of 2026" computed live and never store it. `src/domain/parcels.ts`: `unopened(outings, opened, sinceCreatedAt)` (newest first; `sinceCreatedAt` null = every unopened outing), `markOpened(keys, opened)` (a new Set) and `unopenedFrom(encounters, ...)`. An outing whose parcel was opened stays closed even if a later import adds a sighting to it; reopening is for the UI to decide (the Journal can still open any outing's report). Tests in `tests/outings-v2.test.ts`.

**P5 Field Report v2 additions.** Add to `FieldReport` (keep existing fields): `extraNames: string[]` (names for `par.extra`), `nearlyLevelled: { key, name, rank, toNext }[]` (species logged on this outing that are within 10 Bond points of their next rank afterwards, closest first, max 3), `mostCounted: { key, name, count } | null` (highest count on the outing, needs P2; null when no counts), `cardNo` (from P4), `durationMin`, `startTime`. Tests extend `field-report.test.ts`.

**P5 notes (built 8 Nov).** `FieldReport` now also has `extraNames`, `nearlyLevelled` (`NEARLY_POINTS` = 10, `NEARLY_MAX` = 3; the rank is the one the bird ended the outing at and `toNext` is measured from its Bond total after its last sighting on that outing, not today's total; a bird already at Old Friend is never listed; ties by name), `mostCounted` (each bird's biggest single count on the outing, so two checklists are not added together; ties by name), `cardNo`, `durationMin` and `startTime` (all from `groupOutings`). Dex names are short ("Robin", "Wren"), so screens should show `name` as it comes. Tests are in `tests/field-report.test.ts` (new "P5" block); the points still sum exactly as before.

**P6 Bond record for the profile.** `computeBond` also returns `monthsSeen: number[]` (1–12, sorted), `bandsSeen: TimeBand[]`, `sitesSeen: string[]` (site keys), `firstPlace: string | null`. New `fieldNotes(speciesId): string` in `src/domain/fieldNotes.ts` builds one plain sentence from `traits.v1.json` (size · diet · status · when active), for example "Small · eats insects · resident all year · sings at dawn"; returns '' for outside-Dex birds. `missingMonths(bond)` lists months never logged. Tests: sets match the rules, notes for three birds, outside-Dex empty.

**P6 notes (built 8 Nov).** `Bond` also has `monthsSeen`, `bandsSeen` (always dawn, day, dusk, night order), `sitesSeen` (site keys in the order you first met the bird there; an unknown place is never listed) and `firstPlace` (the place label of the earliest dated sighting, null when blank). They come from the same sightings the Bond rules counted, so `months`, `bands` and `sites` equal their lengths. `src/domain/fieldNotes.ts`: `fieldNotes(speciesId)` builds "Small · eats insects · resident all year · sings at dawn" from the traits (diet wording: inverts = "eats small invertebrates", prey = "hunts other animals"; songsters "sing at dawn" if diurnal), '' outside the Dex; `missingMonths(bond)`. Tests: `tests/bond-record.test.ts`. **Phase P so far:** P1 to P6 are done; P7 to P12b are next and are still engines and data, no screens.

**P7 Reliability and Find a bird v2.** `src/domain/reliability.ts`: `daysReported(days: number | undefined): number | null` (popcount, null when no history), `reliabilityLabel(n, windowDays)` ("most days" ≥ 9, "often" 5–8, "now and then" 2–4, "once" 1), `bestBand(bands)` (the band with most reports when it has ≥ 50% of them and ≥ 3 reports, else null), `strip(days, windowDays): boolean[]` (oldest first, for the 14-cell bar). `findBird.whereSeen` gains `days` and `bestBand` per sighting and sorts by days reported (desc), then newest report, then drive time; with no history it keeps today's order. Tests.

**P7 notes (built 8 Nov).** `src/domain/reliability.ts`: `daysReported`, `reliabilityLabel(n, windowDays)` (the spec's bands; a shorter window scales them but 1 stays "once"; null for 0), `bestBand(bands)` (needs one clear winner: at least 3 reports in total, the top band has at least 3 and at least half; ties give null), `strip(days, windowDays)` (oldest first, today last). `whereSeen` rows now carry `days` (null = no history) and `bestBand`; with any history they sort by days reported, then newest, then nearest, and places without history count as 0 days; with none at all the order is exactly as before. `Sighting.days` and `bestBand` are optional because `rarities()` does not set them. UI must say "about N of 14 days" and "since <historySince>" while the history is young (see P1 notes). Tests: `tests/reliability.test.ts`.

**P8 Bird News engine.** `src/domain/news.ts`: `birdNews({ region, startId, limitMin, recorded, targets, rarity, lastSeenAt, now })` → `{ newToYou: number /* unrecorded Dex species reported within the limit */, rareScarce: Sighting[] /* tier rare or scarce within the limit, newest first, max 5, unconfirmed flagged */, targetsReported: Sighting[] /* each target's best site by reliability then drive */, sinceLastLook: number /* reports newer than lastSeenAt */, generatedAt }`. Unknown drive times are excluded from "within the limit" but counted in a separate `unknownDrive` number. `src/domain/sun.ts`: `sunTimes(lngLat, date)` → local sunrise and sunset as HH:MM using the standard NOAA solar formula (no API, no network), tested against three known dates for Manchester and London to within 2 minutes (put the reference values from a published almanac in the test with their source in a comment). One-line tip: when a target's `bestBand` exists, "Most <bird> reports here come at <band>".

**P9 Warden jobs and trust.** `src/data/warden-jobs.v1.json` (zod in `game.ts`): job templates per habitat. Kinds: `count` (log species X at the warden's site with a count), `heard` (log X as heard or seen and heard there; optional band), `band` (log any bird there in a band, e.g. dusk), `signature` (log N signature birds there this month), `season` (an outing there in a season you have not visited it in). `src/domain/wardenJobs.ts`: `jobsFor(warden, month /* YYYY-MM */, site)` picks 2 jobs with the seeded random (`rngFor(wardenId + month)`), choosing species that are in the site's current reports or signature list so every job is doable; `jobStatus(job, encounters)` counts only real (non-sample) encounters with `siteId === warden.siteId` dated in that month. `trust(warden, encounters, now)` = number of completed jobs over every month since your first real outing there (recompute each month's jobs from the seed), mapped to levels Newcomer 0, Visitor 1, Regular 3, Local 6, Friend of the reserve 10. Seeds must not depend on today's region data for past months: for past months use the signature list only. Tests: deterministic jobs, completion, sample ignored, other sites ignored, trust levels.

**P10 Warden notes.** `src/data/warden-voices.v1.json`: per persona, 4–6 sentence templates with slots (`{bird}`, `{band}`, `{days}`, `{site}`), in their voice (friendly, British, no jokes at anyone's expense). `wardenNote(warden, site, region, weekKey)` chooses a fact in this order: a rare or scarce bird reported at the site (with its best band from P7 when known), else the most reliable bird on the signature list, else a quiet-week line; picks the template with `rngFor(wardenId + weekKey)`. Never invent numbers: only use counts and days that are in the data. Returns `{ text, basis: string /* e.g. "eBird reports, last 14 days" */ }`. Tests: each branch, no slot left unfilled, deterministic per week.

**P11 Call it engine** `src/domain/callIt.ts` (replaces duels as the warden contest; `duel.ts` stays as it is).
- `wardenCalls(warden, site, region)`: 5 species from the site's current reports with the most days reported (P7; fallback newest), boss included only if reported on ≥ 3 days.
- `callPoints(tier)`: common/fairly-common 1, uncommon 2, scarce 3, rare/unreported 4 (from the region's rarity table at the time of calling; stored with the call so later data can't change it).
- Record (stored in the P3 game store): `{ id, wardenId, siteId, madeAt /* ISO */, expiresOn /* madeAt date + 7 days */, player: { key, name, pts }[] /* 1–5 */, warden: { key, name, pts }[] }`. Player choices may be any species reported in the region or on your life list.
- `settle(call, encounters)`: the first real outing at `siteId` dated on or after the call's date and on or before `expiresOn`, whose sightings were added after `madeAt` (so importing an old checklist can't settle it). Your score = points of your calls you logged on that outing; the warden's score = points of her calls you logged on it (she is betting on what you'll find). Result `win | draw | loss | pending | expired`. Tie → draw.
- Badge rule change: gold = silver plus a Call it win against that warden (replace `duelWins` in `badges.ts` with a `callWins` map derived from settled calls; keep the old option name working for tests until E4).
- Tests: points frozen at calling, settling outing selection, import of an older checklist doesn't settle, expiry, sample ignored, gold rule.

**P12 Folk: NPCs.** Data: convert `research/art-drafts/npc-pack-v1/encounters.json` into `src/data/npcs.v1.json` (zod in `game.ts`): `id, name, role, habitats: SetId[], band: TimeBand | null, skill: 'ear' | 'count' | 'behaviour' | 'colour' | 'patience' | 'spot', opening, returnLine, keepsake, connections, challenge`. Keep the Erith settings only as flavour text for Location 2 (`placeNote`); NPCs must work in any region.
- `challenge` kinds and pure checkers in `src/domain/folk.ts`: `pick-phrase` (choose the matching phrase among 3; until licensed recordings exist, phrases are drawn sonograms plus synthesised tones from `src/audio`), `count-flock` (seeded number of birds crossing, answer ±0), `pick-by-pose` (choose a species from 3 silhouettes), `match-swatch` (choose a colour among 4), `spot` (tap a target area index), `choice` (no wrong answer; stored as a choice). `checkAnswer(challenge, seed, answer)`.
- **Home sites (changed 8 Nov 16:34, because the NPC map sprites arrived).** Each NPC lives at one site per region, so it can stand on the map. `assignHomes(region, npcs, wardens, existing)` picks, for each NPC without a home, the site with the most Starter Dex species whose character (D1) includes one of its habitats, skipping warden sites and anything within 2 km of another NPC's home; seeded tie-break `rngFor(regionId + npcId)`. NPCs with no matching site get no home in that region. Homes are stored once in the game store (`{ id: 'npcHomes:<regionId>', homes: Record<npcId, siteId> }`) so they never move when the published data changes; re-pick only an NPC whose home has left the data.
- **Meetings (still only by going outside):** an NPC is met at your first real outing at its home site (and, when it has a band, with a sighting in that band). Several can be met on one outing. Returns `{ npcId, outingKey, date, place }[]`; the Field Report shows "You met Nell" for that outing. Sample outings never meet anyone.
- **Map presence (rules for the UI, engine helper `npcsOnMap(homes, met, zoom)`):** to respect the map hierarchy Joseph asked for (no clutter), sprites show only from zoom 13, only beside their home site's pin (offset so they never cover it), and never more than 3 on screen (nearest the selected site first). Not yet met: idle animation plus a hint when tapped ("Nell records here at dawn. Log an outing here to meet her."). Met: tapping plays frame 4, then opens the encounter.
- **Scripts with expressions.** Each NPC gets a `script` in `npcs.v1.json`: `intro`, `prompt`, `right`, `wrong`, `return`, `connection` lines, each `{ text, expression: 'neutral' | 'talk' | 'delight' }` (`talk` is swapped in while text types; `delight` on a correct answer, a keepsake and return greetings). Writing these 12 scripts is ticket P12b.
- Progress: `stage(npcId, meetings, choices)`: `met` → `done` (challenge answered) → `returned` (a later real outing at the home site after `done`). Keepsakes = NPCs at `done` or later, shown with `keepsakeFor(npcId)` from `src/art/keepsakes.ts`. Connections from `encounters.json` (Dev ↔ Nell, Val → Nell, Dev/Moss/Ruth → Bea's hide) unlock their `connection` line once both sides are `done`.
- Tests: home assignment (spacing, warden sites skipped, stable when data changes, re-pick when a home leaves), meetings, sample never meets anyone, `npcsOnMap` limits, each checker, stages, keepsakes and connections derived.

**P12b NPC scripts (use Opus: this is writing).** Write the 12 scripts into `npcs.v1.json` from each NPC's story, opening line, return line and keepsake in `research/art-drafts/npc-pack-v1/encounters.json`. Plain British English, warm and dry, no jokes at anyone's expense, every line under 140 characters, real birding facts only (each challenge must be answerable by a beginner from what the scene shows). Keep place names generic ("the brook", "the pier") so they work in both locations; Erith details go only in `placeNote` for Location 2.

**P13 Year race and storage.** Add `y: { year, count }` (species this calendar year) to the G1 share-code payload spec and a pure `yearRace(mine, theirs)`. Add `src/phone/persist.ts`: on first real import or log, call `navigator.storage.persist()` once (guarded; some browsers lack it) and expose `persisted()` for Settings to show "Stored safely on this phone" or "Your browser may clear this: add to home screen and back up". Tests for the share payload with a mocked year.

**P14 Engine readout.** Extend `#/dev/engine` (plain lists, existing components) with: Bird News numbers, the 5 most reliable site-bird pairs, this month's jobs and trust for the current location's wardens, each warden's note, a Call it sandbox (make a call for a warden, settle it against the sample history), NPC meetings and stages, unopened parcels. Screens: `npm run screens -- "#/journal >> click:Import >> click:Try a sample history >> wait:400 >> click:Add sample >> wait:2500 >> click:Done" "#/dev/engine"`.

**U0 Dialogue and sheet components (UI phase).** In `src/ui/dialogue/`: `<Dialogue npcId lines onDone>` (portrait from `npcArt`, swapping `talk` and `neutral` every 150 ms while a line types and `neutral` when it finishes; `nameplate` over the box; `dialogue_next` blinking at 2 frames a second; tap to finish typing, tap again for the next line; reduced motion shows whole lines and no swapping), `<Choices options onPick>` (`choice_button` / `choice_button_pressed`, real buttons, 44 px tall minimum), `<SheetFrame>` (the `sheet_frame` nine-slice with `sheet_handle`, for the Field Report and site sheets) and `<StripSprite src frameW frameH frames fps>` for any strip animation (map sprites, next arrow, thinking dots). Everything at whole-number scales via `nineSliceCss` and `frameOffset` from `src/art/dialogueKit.ts`. Text uses the body font at 16 px or larger inside the box's text insets. A `#/dev/dialogue` page shows Nell's intro with every piece. Screens: `npm run screens -- "#/dev/dialogue" "#/dev/dialogue >> click:Next"`, also at `WIDTH=360`.

**Phase P phone review (add to Waiting):** Joseph opens `#/dev/engine` with the sample history and checks the news, jobs, notes and Call it results read sensibly; Lewis checks a few reliability numbers against what he knows.

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

**C1 notes (built 8 Nov).** `src/domain/bond.ts` (`computeBond`, `bondRun`, `rankUps`, `chronological`) and `src/domain/siteKey.ts` (`siteKey`, shared with outings). `bondRun` also returns `awards`, keyed by encounter id: `{ speciesId, points, total, rankIndex }` for each sighting, which N2 uses for the Field Report's Bond points and rank-ups. Choices made: an unknown place (no site id, no label) cannot earn the new-place bonus and is not counted in `sites`; a species' first-ever sighting also uses up the heard-only bonus if it was heard; a sighting that earns 0 (same bird, place and day) does not update the new-month, band or year sets; a bird new in `after` is not a rank-up (the catch reveal covers it). Sample records count like any others.

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

**F1 notes (built 8 Nov).** `pipeline/build.ts` gained `pickBetweenSites` (top 40 sites by distinct Starter Dex species, ties by id) and `toBetween`; `pipeline/run.ts` makes one ORS matrix request per region (all 40 as sources and destinations, `metrics: ['duration']`) after the start-point matrices. `RegionSchema` has an optional `between: { ids, s }` and a `superRefine` that rejects non-square matrices and ids that are not sites in the region. Seconds are rounded; null, missing or negative values are unknown (null); the diagonal is 0 (the same place). Checked on live data with refresh run 42490902428 (details in CLAUDE.md "Facts learned"). If the request fails, `between` is left out and the run says so; the planner (F3) shows "Route planning arrives with the next data update" when it is missing.

**F2 Planner engine** `src/domain/routePlan.ts`:
`planDay(region, { startId, recorded, wanted: 'new' | string[] /* bird keys */, budgetMin, stopMin = 40, maxStops = 4 }) → { stops: { site, arriveMin, birds: string[] }[], totalMin, returnMin, uncovered: string[] }`.
Wanted birds: the given keys, or every unrecorded Dex species reported in the region when `'new'`. Greedy: from the start point, repeatedly choose the unvisited site (in `between.ids`) with the highest `(newly covered wanted birds) / (travel + stopMin)` such that elapsed + travel + stopMin + drive back to start ≤ budget. Travel from the start uses `drive.byStart`; between sites uses `between`; drive back uses the site's `byStart` time (approximation, label it so). Unknown travel → site not eligible. Stop when nothing adds a bird or `maxStops` is reached.
Tests: budget respected; unknown travel skipped; targets prioritised; picks a two-site plan that covers more than the best single site; empty result when nothing is reachable.

**F2 notes (built 8 Nov).** `src/domain/routePlan.ts` exports `planDay` and `wantedBirds`. Stops are chosen greedily by newly covered wanted birds per minute (travel + stop time); ties go to more birds, then shorter travel, then site id, so the same input always gives the same plan. `arriveMin` is minutes after leaving the start point; `stops[i].birds` are only the birds newly covered at that stop; `returnMin` is the last stop's drive time from the start point (an approximation: label it "about" in the UI); `totalMin` is the whole day including the drive home. Unknown drive times (start leg, between-sites leg or return) make a site ineligible, never 0. An empty plan (no stops, `uncovered` lists every wanted bird) comes back when `between` is missing, the start point is unknown, nothing is wanted or nothing fits the budget. `wanted: 'new'` means unrecorded Starter Dex birds only; explicit keys can also be `ebird:<code>` for birds outside the Dex. F3 needs the "Route planning arrives with the next data update" message when `between` is undefined (an empty plan with `between` missing).

**F3 "Plan a day" sheet.** Map controls get a "Plan a day" chip (next to Find a bird). Sheet: what to look for (chips: "Most new birds", or each of your targets reported in the region; multi-select), time (2 h / 4 h / 6 h), result as an ordered list (site, arrive after N min, birds to look for with portraits), totals, and **Open in Google Maps**:
`https://www.google.com/maps/dir/?api=1&origin=<lat>,<lng>&destination=<lat>,<lng>&waypoints=<lat>,<lng>%7C<lat>,<lng>&travelmode=driving` with origin and destination = the start point and waypoints = the stops in order (note lat,lng order here). Copy under it: "A plan from recent reports, not a guarantee. Birds move; check access before you go." Credit: openrouteservice/OSM. If `between` is missing (old data), say "Route planning arrives with the next data update."
Screens: `npm run screens -- "#/map >> click:Plan a day"` (add a tiny `between` to the demo data so it renders).

**Phase F phone review:** plan a 4-hour day from Location 2 for Lewis and open it in Google Maps.

### Phase D: Reserve Wardens and badges

**D1 Site character** `src/domain/siteCharacter.ts`: `siteCharacter(site) → SetId[]`: count the site's reported Dex species per set (a species counts in each of its sets); sort sets by count, keep those with ≥ 25% of the site's Dex species, at most 2; fallback `['garden']`. Tests with synthetic sites.

**D1 notes (built 8 Nov).** `src/domain/siteCharacter.ts` (`siteCharacter(site)`). Ties between sets go in the order of `SETS` (garden, woodland, wetland, coast, raptors, farmland-upland), so the answer never flips between runs. Only Starter Dex birds count, each bird once however often it is reported.

**D2 Wardens.**
1. Add an Actions task `warden-draft` to `deploy.yml` running `tsx pipeline/warden-draft.ts` on the cached data (reuse step only; 0 API calls). It prints JSON to the job log and step summary.
2. Algorithm per region: candidates = sites with ≥ 12 Dex species reported and a known drive time ≤ 90 min. Primary character = first of `siteCharacter`. Pick the best candidate (most Dex species) for each of wetland, coast, woodland, farmland-upland, garden (if one exists), then fill to 8 by most Dex species, skipping any site within 2 km of an already chosen one. Signature = up to 8 Dex species reported at the site whose sets include the primary character, rarest in the region first (fewest sites reporting), filled with the site's other rarest Dex species if fewer than 8. Boss = the rarest signature bird.
3. Read the job log, write `src/data/wardens.v1.json`: `{ schema: 1, version: "wardens-v1", locations: { "<regionId>": [ { id, persona, siteId, siteName, habitat, signature: string[], boss } ] } }` with a zod schema in `src/data/game.ts`. `habitat` = primary character, except `night` when the boss is an owl, and `raptors` when the boss is a raptor.
4. Personas (ids match the art files `warden_<persona>.png`): wetland → `maud`, `reg`; coast → `bev`, `tomasz`; woodland → `rowan`, `agnes`; farmland-upland → `harold`, `sunita`; garden → `pat`, `fran`; raptors → `fergus`; night → `olu`. Use each persona once per location; if a habitat needs a third persona, borrow the closest unused one (wetland↔coast, woodland↔garden, farmland↔raptors). Persona display names: Maud the Marsh Warden, Reg the Reedcutter, Bev the Bait-digger, Tomasz the Tideline Counter, Rowan the Woodland Ranger, Agnes "Old Acorn", Harold the Hedgelayer, Sunita the Stubble-field Surveyor, Pat the Park Keeper, Feeder Fran, Fergus the Raptor Watcher, Olu "Owl-light". Each gets a one-line greeting you write in their voice (friendly, British, no jokes at anyone's expense).
5. Add "Lewis to sanity-check Location 2 wardens" to the Waiting list. The draft is good enough to build on.

**D2 notes (built 8 Nov).** `pipeline/wardens.ts` (`draftWardens`, pure and tested in `tests/warden-draft.test.ts`) follows the spec; `pipeline/warden-draft.ts` runs it over the cached data, and `npm run warden-draft` (Actions task `warden-draft`, 0 API calls) prints a readable list plus the JSON to the log and step summary. Two additions to the spec: sites whose eBird name says permit, private, members only, no public access or closed never get a warden (the first draft picked "King George V Reservoir (permit only)"), and `habitat` is also `night`/`raptors` from the boss as specified. Warden ids are `<persona>-<regionId>` (e.g. `maud-location-1`), because the same persona appears in both locations; these ids go in badge keys, `#/duel/<wardenId>` routes and `duelWins`. Personas moved to `src/data/personas.ts` (no browser imports, so the pipeline can use them) with a `greeting` line each; `src/art/wardens.ts` re-exports them. `src/data/wardens.v1.json` is checked in (from the draft run on live data of 8 Nov, site names shortened with `shortSiteName`, Rainham Marshes tidied by hand); loaders in `src/data/game.ts`: `wardensFor(regionId)`, `allWardens()`, `wardenById(id)`, which fail loudly on unknown personas, Dex ids, a boss missing from the signature, repeated personas or sites. The draft is good enough to build on; it is data, so a later edit is just a JSON change. Wardens must be re-drafted by hand if the site list changes a lot; the file is not regenerated by the refresh.

**D3 Badge engine** `src/domain/badges.ts`:
- Warden badge tier: **bronze** = at least 5 signature birds including the boss logged with `siteId === warden.siteId` (any dates); **silver** = every signature bird logged there; **gold** = silver and a duel win against that warden (prefs `duelWins[wardenId]`, set in E4). Returns tier, logged signature ids, whether the boss is logged.
- Set badges: one per set (Garden, Woodland, Wetland, Coast, Raptors, Farmland), earned when every Starter Dex bird in that set is recorded.
- Year badges: 50 / 100 / 150 species recorded this calendar year (Dex and outside).
- Demo collection never earns anything (it has no encounters; also guard explicitly).
Tests for each rule, including logs at a different site not counting.

**D3 notes (built 8 Nov).** `src/domain/badges.ts`: `earnedBadges({ encounters, wardens, duelWins, year, demoCollection })`, `wardenBadge`, `badgeKeys`, `newBadges` (the keys for the "Badge earned!" overlay, e.g. `warden:maud:silver`, `set:wetland`, `year:2026:50`). It takes a minimal `WardenLike` (`id`, `siteId`, `signature`, `boss`), so D2 only has to supply `wardens.v1.json`. Sample-history sightings and the demo collection are filtered out inside the engine, and public reports are not an input. Bronze needs min(5, signature length) birds including the boss, all logged at the warden's site id; silver is the whole signature list; gold is silver plus `duelWins[wardenId]`. A tier key set includes the lower tiers.

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

**E1 notes (built 8 Nov).** `src/domain/duel.ts`. The engine is stateless: `setupWardenDuel(...)` returns a `Duel` (or null when fewer than three recorded Dex birds are in your squad); `playRound(duel, results, playerId)` returns the next `RoundResult` (the warden answers by its rule via `chooseOpponent`); `outcome(duel, results)` gives win, lose or draw once every round is played; `bestPlayerPick` is the default for skipping ahead. Choices made: `Duel.rounds` is min(5, cards, your birds, their birds), so a warden with a short live team plays fewer rounds, and the boss counts as "last round" on the final round actually played; a tied round is shared (AUTOPILOT wins over GAME_DESIGN's scarcity tie-break); warden birds have no Bond point; `fitBreakdown` returns the matched rules so E3 can write the flavour line. Rivals (G2) reuse `buildDuel`, `drawCards` (with `siteSets: null`) and `Fighter`s built from coded affinities. Everything is derived from the encounters passed in, sample history included (sample may drive duels, never badges).

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

- Bird batch: `python3 -I scripts/art/import_batch.py <zip> batch-NN` (add `--dry-run` first if unsure), then `npm run build && npm run screens -- "#/dev/art"`, open the screenshots and check each new bird at 64 px and as a silhouette. If a bird looks wrong for its species (wrong colours or missing a field mark listed in `bird-batches.md`), keep the old placeholder for that id and tell Joseph which ones to redo and why. Commit `AP R1: bird batch NN`.
- Art that arrives as phone screenshots instead of a ZIP: crop each piece (check no status bar or button overlay is left in it), make the black background transparent (flood from the edges and clear enclosed near-black gaps), save the master in `research/art-drafts/game-art/screenshot-crops/`, then convert as below. Add the id to `src/art/warden-art.json` for wardens.
- Game art set: follow "Notes for Claude when a set arrives" at the end of `game-art-brief.md`; swap fallbacks for the art via the lookups named in the tickets above.

### Art from screenshots (done 8 Nov) and parked references

- **Warden art, integrated.** Maud, Reg, Agnes and Harold portraits plus two marsh scenes (sunset, waterline beetle) were cut from phone screenshots (black background made transparent; masters in `research/art-drafts/game-art/screenshot-crops/`, runtime PNGs in `public/assets/{wardens,scenes}/`, 96 px and `@2x` 192 px). Code lookup: `src/art/wardens.ts` (`PERSONAS`, `wardenArt(id)` returns null when there is no art, so draw the silhouette; `SCENE_ART`), art list in `src/art/warden-art.json`. D4 and E3 must use these lookups; the habitat scene for a warden's site comes from `SCENE_ART` when one matches, otherwise `art/scenes.ts`. To add more screenshot art: crop, clear the black background, run `prepare_sprite.py` (see R1). Never commit full phone screenshots (public repo), only the cropped art.
- **Field record / account screen (reference only, do not build yet).** A page that sums up a birder's year: a quarterly "field report", habitat pins, and life / year / sites counts. Ideas to borrow later if it is wanted: a Year-in-review view built from encounters (year list, life list, sites visited, habitat mix), shared as an image or file rather than emailed (the app has no server, so no account emails). Revisit after B4 and Phase D when there is real data to show.

---

## 5. Definition of done for the whole plan

All boxes ticked; `npm run typecheck && npm run lint && npm test && npm run build` green; the live site works on Joseph's and Lewis's phones; BUILD_PLAN acceptance list (Part G) still holds; no key in the bundle (`grep -r "EBIRD\|ORS_API" dist` finds only attribution text); every phone review in the Waiting list done or consciously deferred by Joseph.
