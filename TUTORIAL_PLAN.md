# Tutorial plan: Pearl, Keeper of the Dex

Written 9 Nov 2026, revised 10 Nov after Joseph's first phone run. Covers how Pearl teaches the game: the welcome tour (built), the short "first time" moments that follow it (to build), her voice, and the tickets. Wording lives in `src/data/tours.v1.json`; this file is the why and the order.

Lewis asked for it (8 Nov): "a pop up when you first open the page and you can say don't show this again." Joseph's brief: an older guide NPC, speech that types in letter by letter like old Pokémon, a tap shows the whole line, and some personality.

**Changes on 10 Nov (Joseph):** renamed from Dot Lau to **Pearl**; six everyday poses added so the sketchbook is saved for birds; tour cut from 17 steps to 9; more charm, a South East London feel; bird names said properly ("someone saw a barn owl", not "Barn Owl was seen"); the confusing "gem means scarce" line and the held-up icons are gone; speech blips, button clicks and a Sound switch in the tour bar.

---

## 1. What is built

**Art and type.** 14 poses, head icon and sketching cels in `public/assets/guide/dot/` (files keep the packs' `dot-lau` / `dot-tour` names), lookup `src/art/guide.ts`. Her name is `GUIDE_NAME` there. The Fieldhand bitmap font in two states (falling and stamped) plus the paper and gold bubble skins in `public/assets/ui/fieldhand/`. Masters and the kits' own READMEs: `research/art-drafts/game-art/set-f-dot-lau/` (sketchbook poses), `set-g-fieldhand-dialogue/` (font, bubbles, reference player), `set-h-dot-tour-poses/` (everyday poses).

**Speech engine.** `src/ui/fieldhand/`:
- `layout.ts` (pure, tested): word wrap to the bubble (about 19 characters a line), 4 lines a page, letter timing, punctuation pauses, `{token}` filling with fallbacks.
- `FieldDialogue.ts`: canvas renderer ported from the kit. Each letter **falls 16 px from above** (accelerating, fading in), sits in the kit's tilted landing pose for 88 ms, then stamps upright. A letter starts every 42 ms. The tail aims at her mouth for each pose. `onLetter` fires as each letter starts to fall.
- `GuideSpeech.tsx`: React wrapper. **Tap once** = whole page; **tap again** = next page or line. Reduced motion = whole line at once. Speech blips on every other letter when Sound is on. Screen readers get each line once through a live region. If the art can't load, a plain text bubble says the same thing.

**Tour layer.** `src/features/tour/TourOverlay.tsx`, state `src/state/tour.ts`, schema `src/data/tours.ts`. Dims the app, spotlights one thing (`data-tour="id"` or a CSS selector), docks the bubble on the other half of the screen, can wait for you to tap the spotlit thing, ends with choice buttons. Always visible: Skip tour, the step count (or the hint on "tap it" steps), Sound on/off, Next. Starts by itself on a first open; "Not now" snoozes until the app is reopened; "Don't show this again", Skip and finishing store `prefs.toursDone`. Settings → Help → "Take the tour with Pearl" replays it. `#/dev/dot` shows every pose.

**Live facts** the screens publish for her lines: `siteName`, `aBird` / `theBird` ("a barn owl", "an avocet", "a Canada goose": `src/domain/speech.ts`), `when`, `minutes`, `newCount`, `recorded`, `dexSize`.

**Tests** (`tests/guide-tour.test.ts`): layout and timing; art sizes; every spotlight id exists in the code; every line draws in Fieldhand and fits one bubble with long live values; every `{token}` has a fallback; bird-name grammar; the welcome tour stays at 10 steps or fewer and only shows her drawing in its last step; speech blip pitches.

Tools: `TOUR=1 npm run screens -- "#/"`; `node scripts/dev/tour-walk.mjs` (and `WIDTH=360`) walks the whole tour into `/tmp/tour/`.

## 2. The welcome tour (9 steps, about 2 minutes)

| # | Step | Screen | Spotlight | Poses | Teaches |
|---|---|---|---|---|---|
| 1 | hello | any | none | chat, aside, over-to-you | Greets the new player and offers a tour (no backstory dump). Go on then / Not now / Don't show this again |
| 2 | site-card | Explore | site card | introduce, compare, aside, chat | **Live example:** today's pick, how many new birds, what was seen and when, the drive; tap pins to swap |
| 3 | drive | Explore | 30/60/90 | aside | Drive limit |
| 4 | find | Explore | Find a bird | introduce, clarify | Search for one species |
| 5 | try-view | Explore | View spot | over-to-you | **You tap it** |
| 6 | sheet | Site sheet | report list | introduce, clarify, aside | Dated reports; other people's birds don't go in your Dex |
| 7 | dex | Dex | progress | introduce, aside | Your count; grey = still to find |
| 8 | journal | Journal | Import and + Log | compare, clarify | Two ways to fill the Dex; only your own sightings |
| 9 | bye | Explore | none | sketching, talking, over-to-you (gold) | She'll draw your new birds (all wrens); where to find her |

Moved out of the tour into first-time moments (§3): Plan a day, area switch, map icons and rarity marks, Folk. The tour never logs anything.

## 3. First-time moments (to build)

The welcome tour shows *where things are*. The rest is taught **the first time it matters**, in 1–3 lines, at that moment. Each is a tour in `tours.v1.json` with a `trigger` instead of `auto`, plays once, and can be replayed from Settings.

| Moment | Trigger | Where | Poses / skin | Gist |
|---|---|---|---|---|
| first-lifer | the catch reveal for your first ever log | after the reveal | sketching → delighted, **gold** | "Your first {bird}. I drew it for you." … "Bit wren-ish. They all are, love. I'll put the date under it." |
| new-bird | each later new Dex bird (1 in 3, never twice in a row) | after the reveal | delighted, gold | Short variants: "Another one for the book.", "Is that still the same wren? Don't answer that." |
| first-import | an eBird import finishes | Journal | delighted | "That's years of notebooks. Each trip's a parcel: open them when you've a minute." |
| first-parcel | first Field Report | Report | introduce, compare | Points come from rare birds, new birds and firsts of the year; par is what others saw there lately |
| first-find | first open of Find a bird | Find | clarify | The strip shows how many of the last 14 days it was reported |
| first-plan | first open of Plan a day | Plan | compare | Pick what you're after and how long you've got; a plan from reports, not a promise |
| first-area | first open of the area picker | Area sheet | chat | Where the drive starts; public spots only, never your home |
| first-news | first open of Bird News | News | introduce | Scarce birds near you, and your targets turning up |
| first-target | first target starred | Profile | over-to-you | A flag on the map now means your target was reported there |
| first-rankup | first Bond rank-up | after it | sketching | Seeing a bird again in new places and seasons is how you get to know it |
| first-warden | first warden page | Warden | chat | Wardens, trust and jobs; one per big reserve |
| first-callit | first Call it | Call it | over-to-you | Pick 5 before a visit; your next logged visit settles it |
| first-npc | first story NPC met | after it | aside | Folk turn up where you've actually been birding |
| first-badge | first badge | Badge case | delighted, gold | What the three metals mean |
| nothing-near | no new birds within the drive limit | Explore | sympathy | "Quiet fortnight. Try ninety minutes, or go and enjoy the ones you've got." |
| call-it-lost | first Call it lost | result | missed-sighting | "Got the back half of him. Next time." |

Rarity marks get explained by first-news or first-parcel, at the moment one is on screen, in words: "That little mark means not many people round here have seen it lately." Never "gem" or "tier".

**Rules for moments:** one at a time and never on top of a sheet, reveal, import or tour (600 ms of quiet first); at most one a session apart from new-bird moments; three lines at most; a tap outside closes it (no dimming); Settings → "Pearl's tips" on/off; sample or demo data may trigger them, but she says "sample" when quoting a number.

## 4. Pearl's voice

Pearl is a semi-retired British Chinese signwriter from Deptford, been birding round South East London for decades. Warm, quick, a bit cheeky, proud of her drawings and rude about them. Think a favourite auntie at the bus stop, not a Cockney caricature.

- **One idea a line**, about 70 characters at most (four short rows). Two or three lines a step.
- **Charm comes from specifics**: the bus, a flask, chips and gulls, squinting at a phone with her glasses on her head, the spelling of "café" on a shop sign. One small joke every two or three lines, never at the player's expense.
- **Light local voice**: "love", "go on then", "have a nose", "mind", "fair warning", "ta". No dropped aitches, no rhyming slang, no "innit".
- **Bird names in a sentence go through `aBird` / `theBird`**: lower case with an article ("a barn owl"), capitals kept for places and people ("a Canada goose", "a Cetti's warbler"). Never start a sentence with a token.
- **Plain words for game things.** Say what it means ("not many people round here have seen it lately"), never the system's name for it (tier, gem, rarity points).
- **Honest about data.** Reports are other people's, days old; drive times can be unknown.
- **Never says** "Pokémon", "gym", "trainer", "tutorial", "click", "user", "simply" or "just".
- **Characters:** only those in Fieldhand (ASCII plus £ ’ “ ” – — … · × é). Tests check this.

**Poses: which one when.** Change pose when the purpose of a line changes.
- Everyday (no sketchbook), use these for almost everything: `chat` (hello, ordinary lines) · `introduce` (open hand towards a card, list or screen) · `clarify` (over her glasses: a detail that's easy to miss, a rule) · `compare` (counting on fingers: two values, two ways) · `aside` (hand to cheek: the joke) · `over-to-you` (arms folded: a choice, "go on", goodbye).
- Sketchbook, **only for birds**: `sketching` (drawing your new bird; animates) · `delighted` (a new bird, with the gold bubble) · `talking`, `explaining`, `pointing`, `thinking` (showing or discussing a drawing or a field mark). The drawing is always the same wren, and that is the running joke: "They all come out looking like this wren."
- Feelings: `sympathy` (nothing found, a loss) · `missed-sighting` (something got away).

## 5. Tickets

Same session routine as `AUTOPILOT.md` §0.

- [x] **T0 Welcome tour and engine** (9 Nov; cut to 9 steps and revoiced 10 Nov).
- [ ] **T1 Moment triggers.** Add `trigger` (moment id) and `mode: "tour" | "moment"` to `TourSchema`. `src/state/tour.ts`: `fire(event)` queues the matching unseen moment; a `useTourQueue` hook in `App.tsx` plays the head of the queue when idle (no `useUi` sheet, reveal, toast or import open; 600 ms quiet). Moments render without the dim layer, with a light ring only, and close on an outside tap. Prefs `guideTips: boolean` (default true). Tests: queue order, idle gating, once only, tips off, at most one a session apart from new-bird.
- [ ] **T2 First week moments**: first-lifer (with fact `aBird`; she "draws" it: sketching pose for line 1, then delighted on gold), new-bird variants, first-import, first-parcel, nothing-near. Add the `data-tour` ids they spotlight.
- [ ] **T3 "Ask Pearl" in Settings**: the tour plus every moment you've seen, each replayable; tips on/off.
- [ ] **T4 Practice sighting (ask Joseph first)**: in the journal step, "Try it" logs a robin into the demo collection (`birdquest-demo`), plays the real reveal and her drawing joke, then throws it away. Never touches real records or Bond.
- [ ] **T5 Remaining moments** with their screens (table in §3).
- [x] **T6 Sound** (10 Nov): speech blips, button clicks, page turns; Sound switch in the tour bar. Ambience is AUTOPILOT S2.
- [ ] **T7 Phone review with Lewis and his colleague** on a fresh phone: time the tour, note where they skip, and which lines they reread.

## 6. Decisions for Joseph

1. **Story NPCs in Fieldhand too?** One look for all speech; Pearl keeps the only gold bubble. Recommended.
2. **Practice sighting (T4)**: worth it?
3. **Her name**: Pearl for now; change `GUIDE_NAME` in `src/art/guide.ts` and the lines in `tours.v1.json`.
