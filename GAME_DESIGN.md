# BirdQuest game design: Field Bond, Reserve Wardens and Field Duels

> Build order, exact numbers and file contracts are in `AUTOPILOT.md` (phases C, D, E, G), which wins where the two differ. Curated data: `src/data/catalogue/traits.v1.json` and `duel-cards.v1.json`.

Written 8 Nov 2026 with Joseph, after Lewis asked for "gym badges" and Joseph asked how battles could fit. Our influences are Pokémon (collect, badges) and Top Trumps (compare cards), but the mechanics here come from things birders already do: patch lists, bird races, year lists and knowing which bird turns up where. Avoid borrowed terms: no gyms, trainers, HP, types or attacks.

## Principles

1. **Going outside is the only way to get stronger.** Everything grows from your own logged or imported sightings. Public eBird reports never award progress (hard rule), demo data never counts.
2. **Repeat sightings matter.** Your 30th Robin is worth something. Value comes from variety (new sites, seasons, times of day, heard vs seen), not from spamming the Log button.
3. **Expertise wins.** Battles reward knowing which bird fits which place and moment, so an experienced birder like Lewis has a real edge and a beginner learns by playing.
4. **Never reward disturbance.** No points for getting close, photos at nests, flushing, or chasing sensitive species. Nothing asks for precise GPS.
5. **Everything runs on the phone.** No server, no accounts. Rivals swap a share code.

## 1. Field Bond (repeat sightings)

Each species you've recorded has a **Bond**: how well you know that bird. Bond points come from sightings:

| A sighting that… | Bond |
|---|---|
| is the first ever | +10 (and the existing catch reveal) |
| is at a site where you've not logged it before | +5 |
| is in a month you've not logged it before | +4 |
| is in a time band you've not logged it in (dawn, day, dusk, night) | +3 |
| is heard only, the first time | +3 ("knows its call") |
| is your first of the year | +3 |
| is any other sighting | +1 |

Caps: one sighting per species per site per day earns Bond (more logs are kept but earn nothing). Imports earn Bond the same way, so Lewis's history arrives with real ranks on day one.

**Ranks**, shown on the Dex card and profile: Spotted (first sighting) → Known (15) → Familiar (40) → Seasoned (80) → Old Friend (150). Rank-ups get a small reveal of their own (lighter than the catch reveal), a chiptune sting if sound is on, and something you can see on the card:
- **Known**: the card shows the bird's field notes (habitat, diet, resident or migrant).
- **Familiar**: the card frame turns from plain to stitched leather.
- **Seasoned**: a second plumage appears where art exists (winter/summer, male/female, juvenile).
- **Old Friend**: foil frame, and the profile shows "first seen [date] at [place], [N] sightings across [M] sites".

**Nicknames**: once a bird is Familiar you can give your record of it a nickname ("Sergeant Heron"). It names your bond with the species, not an individual bird.

## 2. Traits and affinities (what makes a bird strong)

**Traits** come from the species and never change. Add them to the Starter Dex as new fields: habitat sets (already there), `size` (tiny/small/medium/large/huge), `diet` (seeds, insects, fish, inverts, plants, carrion, prey, omnivore), `status` (resident, winter visitor, summer visitor, passage), `active` (diurnal, crepuscular, nocturnal). Local scarcity comes from the published data (how many sites reported it).

**Affinities** come from your own sightings, which is what links duels to repeat sightings. Every sighting adds affinity for the conditions it happened in:
- the **site's character**: worked out from the birds reported at that site (lots of wetland birds means a wetland site). No new API needed. This needs an optional `siteId` on encounters when you log from a site sheet (an eBird hotspot id, which is public, never GPS);
- the **time band**, from an optional `time` on the encounter (filled in automatically when you log on the day);
- the **season**, from the date.

So a Snipe you've logged ten times at estuaries at dusk is far stronger in an "estuary at dusk" round than one you've logged once. Affinity is capped per condition so no single bird is unbeatable.

## 3. Reserve Wardens (the badges)

Each preset location has about 8 **Reserve Wardens**: NPCs who look after real, well-known sites (for Location 2 the obvious candidates are the big Thames marshes and reserves nearby; pick from the busiest hotspots in the data). Each warden has:
- a name and a pixel portrait (original characters: a reedbed warden in waders, a woodland ranger with a flask, an estuary bait-digger);
- a **signature list**: 6–10 birds that define the site, chosen from its eBird history;
- a **boss bird**: the hardest of those to find;
- a **live team**: the birds reported at the site in the last 14 days, so the challenge changes week to week.

**Earning the badge**: bronze = log at least 5 of the signature birds, including the boss, at that site (any number of visits); silver = log every signature bird there; gold = silver plus a Field Duel win against that warden. Badges are pixel enamel pins in a Badge case screen. (Exact rules: AUTOPILOT.md D3.)

**Territory overlay** (an option on the Adventure skin, M4): warden sites show banners; beaten ones show your pin; rivals' patches show their colour.

## 4. Field Duels (the battle)

A duel is **best of 5 rounds** between your squad of up to 6 recorded birds and a warden's team (or a rival's squad).

Each round reveals a **condition card** drawn from the duel's site and moment, for example:
- **Dawn chorus** (woodland, early, spring–summer): favours songbirds and birds you've logged by call;
- **Low tide** (estuary/coast): favours waders and gulls;
- **Cold snap** (winter, any): favours winter visitors and birds you've logged in December–February;
- **Feeder rush** (garden): favours small seed-eaters and tits;
- **Reedbed at dusk** (wetland, evening): favours crepuscular wetland birds;
- **Thermals** (farmland/upland, midday): favours raptors;
- **Fog** (any): favours birds you've logged heard-only (you know their calls).

Both sides pick one bird face-down, then reveal. Each bird scores for the condition:
`fit` (0–3, from traits matching the condition) + `affinity` (0–2, from your own sightings in those conditions) + `bond` (0–1, from rank). Higher score takes the round; a tie goes to the locally scarcer bird. Each bird plays once per duel, so choosing *when* to play your best bird is the tactic.

The warden picks by a simple rule (best fit for the round, holds the boss back for the last round), so it's predictable but not trivial. Win a duel against a warden to earn a bonus star on that badge. Losing costs nothing.

Presentation: pixel arena showing the site's backdrop (the existing habitat scenes), the condition card flips over, birds slide in, scores tick up, a short line of field-guide flavour ("Snipe probes the mud at dusk: right at home"). Under 30 seconds a duel; skippable; reduced-motion version.

## 5. Rivals (Lewis vs Joseph)

**Share a squad** as a short code or QR (species, rank and affinities only: no dates, places or photos). The other phone runs the duel against it and gets a result to send back. A friendly monthly **patch race** (most species at one chosen site this month) can work the same way, with a share code at the end of the month. No server and no accounts, so it fits the GitHub Pages setup.

## Data changes needed

- Encounter: optional `siteId` (eBird hotspot id) and `time` (HH:MM). Backup schema stays compatible (both optional).
- Starter Dex v2: `size`, `diet`, `status`, `active` per species (curated, checked by a stronger model).
- Wardens: `pipeline/config/wardens.json` per location (site id, name, signature list, boss) curated once from the data, plus a site-character summary computed in the pipeline.
- All derived on the phone: Bond, ranks, affinities, badges, duel results (pure functions in `src/domain/`, unit-tested like `collection.ts`).

## Order of work

1. **G1 Field Bond + ranks**, alongside the import (T9.3), so imported history shows up as ranks straight away.
2. **G2 Reserve Wardens + Badge case** (T9.4): signature-list badges, no duels yet.
3. **G3 Field Duels** against wardens (T9.6).
4. **G4 Rivals**: share codes and the patch race (T9.7).

## Open questions

- Which 8 sites per location get wardens? Ask Lewis for Location 2; he'll know the local favourites.
- Should a duel use the conditions at the site *today* (real season and time) or a random card from that site? Today is more grounded; random is more replayable. Start with today plus one random card.
- Squad size 6 or 5? Five rounds with six birds leaves one on the bench, which adds a choice.
