# Tutorial plan: Dot Lau, Keeper of the Dex

Written 9 Nov 2026. Covers how Dot teaches the game: the welcome tour (built), the short "first time" moments that follow it (to build), her voice, and the tickets. Wording lives in `src/data/tours.v1.json`; this file is the why and the order.

Lewis asked for it (8 Nov): "a pop up when you first open the page and you can say don't show this again." Joseph's brief: an older guide NPC, speech that types in letter by letter like old Pokémon, a tap shows the whole line, and some personality.

---

## 1. What is built (9 Nov)

**Art and type.** Dot's 8 poses, head icon and sketching cels (`public/assets/guide/dot/`, lookup `src/art/dot.ts`). The Fieldhand bitmap font in two states (falling and stamped) plus the paper and gold bubble skins (`public/assets/ui/fieldhand/`, metrics in `src/art/fieldhand/`). Masters, sources and the kit's own README, preview and reference player: `research/art-drafts/game-art/set-f-dot-lau/` and `set-g-fieldhand-dialogue/`.

**Speech engine.** `src/ui/fieldhand/`:
- `layout.ts` (pure, tested): word wrap to the bubble, 4 lines a page, letter timing, punctuation pauses, `{token}` filling with fallbacks.
- `FieldDialogue.ts`: canvas renderer ported from the kit. Each letter **falls 16 px from above** (accelerating, fading in), sits in the kit's tilted landing pose for 88 ms, then stamps upright. A letter starts every 42 ms, with extra pauses at commas and full stops. The tail aims at Dot's mouth for each pose. A frame loop only runs while letters move.
- `DotSpeech.tsx`: React wrapper. **Tap once** = whole page appears; **tap again** = next page or next line. Reduced motion = whole line at once. The canvas is hidden from screen readers; each line is announced once in a live region. If the art can't load, a plain text bubble says the same thing.

**Tour layer.** `src/features/tour/TourOverlay.tsx` (mounted once in `App.tsx`), state in `src/state/tour.ts`, script schema in `src/data/tours.ts`:
- Dims the app, spotlights one thing (by `data-tour="id"` or a CSS selector) with a pulsing gold ring, and docks Dot's bubble on the opposite half of the screen.
- Steps can change route first, wait for you to tap the spotlit thing (`advance: "target"`), hold up an icon beside the bubble (`exhibit`), and finish with choice buttons.
- Lines can quote live facts the screens publish (`siteName`, `bird`, `when`, `minutes`, `newCount`, `recorded`, `dexSize`) with a fallback when there's no value yet.
- Always visible: **Skip tour**, the step count and **Next**. Escape skips; Enter and Space carry on.
- Starts by itself 0.9 s after a first open (not on dev or settings pages). "Not now" snoozes until the app is reopened; "Don't show this again", "Skip tour" and finishing all store `prefs.toursDone`. Settings → Help → **Take the tour with Dot** replays it.
- `#/dev/dot` shows every pose and the kit's example lines, with replay.

**Tests** (`tests/dot-tour.test.ts`): layout and timing, art sizes, every spotlight target exists in the code, every line can be drawn in Fieldhand and fits one bubble even with long live values, every `{token}` has a fallback, auto-start rules. `TOUR=1 npm run screens -- "#/"` takes screenshots with the tour running (it's switched off by default so it doesn't cover other screenshots).

## 2. The welcome tour (17 steps, about 4 minutes)

Shape: **meet her → one live example → the icons → the controls → follow one real spot through → Dex → Journal → Folk → goodbye.** Every step happens on the real screen, using the area's real data (or labelled demo data before the first refresh).

| # | Step | Screen | Spotlight | Pose | Teaches |
|---|---|---|---|---|---|
| 1 | hello | any | none | talking, explaining | Who she is. Choices: Show me round / Not now / Don't show this again |
| 2 | explore | Explore | none | pointing | Pins are real places; reports come from eBird |
| 3 | site-card | Explore | site card | pointing, explaining | **Live example:** today's pick, its bird, when, how far, how many new |
| 4 | selected-pin | Explore | coral pin | pointing | The card and the coral pin are the same place |
| 5 | icons | Explore | none, icons held up | explaining → delighted | Site pin, target flag, unexplored stamp, rarity gem |
| 6 | drive | Explore | 30/60/90 chips | thinking | Drive limit |
| 7 | find | Explore | Find a bird | explaining | Search one species |
| 8 | plan | Explore | Plan a day | talking | Multi-stop trip to Google Maps |
| 9 | area | Explore | "Driving from" | pointing | Change start point |
| 10 | try-view | Explore | View spot | pointing | **You tap it** (the tour waits) |
| 11 | sheet | Site sheet | report list | explaining, thinking | Reports have dates; other people's sightings don't fill your Dex |
| 12 | dex | Dex | progress | talking, sketching | Your count; grey = still to find, names never hidden |
| 13 | dex-card | Dex | first card | explaining | Tap a bird for its page |
| 14 | import | Journal | Import | talking | Bring eBird history in |
| 15 | log | Journal | + Log | pointing, thinking | Log yourself; only birds you saw count |
| 16 | folk | Folk | Folk tab | talking | Wardens and people |
| 17 | bye | Explore | none | delighted, gold bubble | Where to find her again |

Rule kept from the hard rules: the tour never logs anything. "Show, don't do" for logging until T4 adds a practice that stays out of your records.

## 3. First-time moments (to build)

The welcome tour shows *where things are*. The rest is taught **the first time it matters**, in 1–3 lines, at the moment it happens. Each is a tour in `tours.v1.json` with a `trigger` instead of `auto`, plays once, and can be replayed from Settings.

| Moment | Trigger (event) | Where | Pose / skin | What she says (gist) |
|---|---|---|---|---|
| first-import | an eBird import finishes | Journal | delighted | "That's years of notebooks. Each trip's a parcel: open them when you've a minute." Spotlight the first parcel |
| first-parcel | opening the first Field Report | Report | explaining | Points come from rare birds, lifers and firsts of the year. Par is what others saw there lately; your extras are birds they missed |
| first-lifer | the catch reveal for your first ever log | Reveal, after it | delighted, **gold** | "Your first {bird}. There. I'll put the date under that one." (the kit's line) |
| first-rankup | first Bond rank-up | Rank-up overlay, after it | sketching | Seeing a bird again in new places and seasons is how you get to know it |
| first-find | first open of Find a bird | Find | thinking | The strip shows how many of the last 14 days it was reported; morning or evening |
| first-plan | first open of Plan a day | Plan | pointing | Pick what you're after and how long you've got; it's a plan from reports, not a promise |
| first-news | first open of Bird News | News | explaining | Rare and scarce birds near you, and your targets turning up |
| first-target | first time you star a target | Profile | pointing | Flags on the map now mean "your target was reported here" |
| first-warden | first warden page opened | Warden page | talking | Who wardens are, trust, monthly jobs; one warden per big reserve |
| first-callit | first Call it screen | Call it | thinking | Pick 5 before a visit; your next logged visit settles it; bold calls score more |
| first-npc | first story NPC met | Encounter, after it | delighted | Folk turn up where you've actually been birding; keepsakes go in the satchel |
| first-badge | first badge earned | Badge case | delighted, gold | What the three metals mean |
| nothing-near | no new birds within the drive limit | Explore | sympathy | "Quiet fortnight. Try 90 minutes, or go and enjoy the ones you've got." Spotlight 90 min |
| call-it-lost | first Call it settled as a loss | Call it result | missed-sighting | "Got the back half of him. Next time." |

**Order of build:** first-lifer, first-import, first-parcel and nothing-near come first (they cover Lewis's opening week). The rest follow their screens.

**Rules for moments:**
1. **One at a time, never on top of something.** Moments queue and play only when no sheet, reveal, import or other tour is open, after 600 ms of quiet.
2. **Never more than one a session** unless you ask for it, apart from first-lifer (it's the reward).
3. **Short.** Three lines at most, one idea a line. If it needs more, it belongs in the welcome tour.
4. **Never blocks.** Tapping anywhere outside the bubble closes a moment (unlike the welcome tour, which dims the app).
5. **Settings → Help → "Dot's tips" on/off.** Off stops all moments; the welcome tour can still be started by hand.
6. Moments triggered by sample or demo data are fine to show (they teach), but say "sample" where a number is quoted.

## 4. Dot's voice

Dot is a semi-retired British Chinese signwriter from Deptford. Warm, dry, a little nosy, proud of her drawings and slightly rude about them. She teaches by pointing at one thing.

- **One idea a line, under about 80 characters.** The bubble holds 4 lines; most of her lines use 2–3.
- **Concrete over abstract.** "The coral pin is that spot" not "Selected sites are highlighted".
- **Plain British English, UK spelling.** Short words. No exclamation marks except for a lifer.
- **A light joke every few lines, never at the player's expense**, usually about her drawings, buses or shopkeepers.
- **Honest about data.** Reports are other people's, days old, not live positions; drive times can be unknown.
- **Never says** "Pokémon", "gym", "trainer", "tutorial", "click", "user", "simply" or "just".
- **Live values** only through `{tokens}`, always with a fallback that makes sense on its own.
- **Characters:** only those in Fieldhand (all ASCII plus £ ’ “ ” – — … · × é). The tests check this.

**Poses (which one when):**
- `talking`: openings, plain facts.
- `explaining`: showing how something works (holds the sketchbook up).
- `pointing`: "this one, here"; use with a spotlight.
- `thinking`: a choice the player has to make; caveats.
- `delighted`: lifers, firsts, goodbyes. Pair with the gold `lifer` skin only for real wins.
- `sympathy`: nothing found, a loss, an empty Dex.
- `missed-sighting`: something went away (a bird, a Call it).
- `sketching`: idle and reflective lines; it animates (two cels) unless reduced motion is on.

## 5. Tickets

All use the existing engine. Same session routine as `AUTOPILOT.md` §0 (typecheck, lint, test, build, screens, commit `AP <id>`).

- [x] **T0 Welcome tour and engine** (9 Nov). Everything in §1 and §2.
- [ ] **T1 Moment triggers.** Add `trigger` (one of the moment ids) and `mode: "tour" | "moment"` to `TourSchema`. `src/state/tour.ts`: `fire(event)` queues the matching unseen tour; a `useTourQueue` hook in `App.tsx` plays the queue head when idle (no `useUi` sheet, reveal, toast or import open; 600 ms quiet). Moments render without the dim layer (a light spotlight ring only) and close on an outside tap. Prefs: `dotTips: boolean` (default true). Tests: queue order, idle gating, once-only, tips off, one moment per session except `first-lifer`.
- [ ] **T2 First week moments.** Script and wire `first-lifer` (after `Reveal` closes for the first ever encounter, fact `bird`), `first-import` (after `ImportFlow` completes, facts `checklists`, `species`), `first-parcel` (report screen, facts `points`, `par`), `nothing-near` (Explore, when `filtered.shown` has no site with `newIds` within the limit). Add the `data-tour` ids they spotlight.
- [ ] **T3 "Ask Dot" in Settings.** Replace the single button with a list: "A walk round" plus each moment you've already seen ("About parcels", "About Call it"...), so anything can be replayed. Tips on/off switch here.
- [ ] **T4 Practice sighting (optional, ask Joseph).** In step 15, offer "Try it": opens the Log sheet against the demo collection (`birdquest-demo`), plays the real catch reveal on a Robin, then discards it. Never touches real records or Bond.
- [ ] **T5 Remaining moments**, each with its screen: first-find, first-plan, first-news, first-target, first-rankup, first-warden, first-callit, first-npc, first-badge, call-it-lost.
- [ ] **T6 Sound.** A soft per-letter tick (every third letter, pitch by pose) and a page-turn blip, through `src/audio/sfx.ts`, only when sound is on.
- [ ] **T7 Phone review with Lewis and his colleague** (fresh phone, no data): time the welcome tour, note where they tap Skip, and which lines they reread. Trim anything they skip twice.

## 6. Decisions for Joseph

1. **Story NPCs in Fieldhand too?** The 12 NPCs use the older dialogue box (`src/ui/dialogue/`, plain font, typewriter). The Fieldhand engine can take any portrait once a mouth anchor is measured. Recommendation: yes, one look for all speech; Dot keeps the only gold bubble.
2. **Practice sighting (T4):** worth it, or is "show, don't do" enough?
3. **Tour length:** 17 steps is complete but long. If Lewis's colleague skips half way, cut steps 7–9 (Find, Plan, Area) into first-time moments instead.
