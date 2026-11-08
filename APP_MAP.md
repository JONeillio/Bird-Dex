# App map: how every screen links together (draft, 8 Nov 2026)

One page that joins the approved canvas (rows 1–4), the engines (AUTOPILOT phase P) and the screen tickets. **Draft for Joseph to correct before the UI phase starts.** Where this disagrees with a ticket in `AUTOPILOT.md`, this page wins once Joseph approves it, and the ticket is updated.

## Tabs (bottom bar, always visible except inside full-screen encounters)
| Tab | Route | What it is |
| --- | --- | --- |
| Explore | `#/` (alias `#/map`) | The map. Opens here every time. |
| Dex | `#/dex` | Collection. Sub-tabs Dex · Year · Life · Patch (`#/dex/year`, `/life`, `/patch`). |
| Journal | `#/journal` | Your trips: new parcels, past outings, imports, backup. |
| Folk | `#/folk` | People: wardens, story NPCs, Call it, satchel. |

Settings is a button in the header of every tab (`#/settings`), not a tab. The Log button stays where it is today.

## Every screen, where it comes from, where it goes
| Screen | Route | Reached from | Links onward to |
| --- | --- | --- | --- |
| Explore map | `#/` | Tab; "driving from" chip | Site card → site sheet; News chip → News; Plan a day; warden pennant → warden page; NPC marker → encounter |
| Bird News | `#/news` | Chip in the Explore header (shows a dot when there is something rare or a target reported) | Bird → Find a bird; site → Explore with that site selected |
| Find a bird | `#/find/:birdId` | Bird profile "Find it"; News; Dex "close to rank up" | Site → Explore with that site selected; "Plan a day for this bird" |
| Plan a day | `#/plan` | Sheet from Explore | Google Maps hand-off; stop → site sheet |
| Dex | `#/dex` | Tab | Bird card → profile |
| Bird profile | `#/bird/:id` | Any bird anywhere | Find it; Bond and "your year with it"; nickname |
| Journal | `#/journal` | Tab; Explore banner | Parcels; outing card; Imports; Backup |
| Parcels → report | `#/journal/parcels` → `#/report/:id` | Journal, Explore banner | Report → What levelled up → Outing card (saved to Journal); every bird → profile |
| Folk | `#/folk` | Tab | People, Wardens, Call it, Satchel |
| Encounter | `#/folk/npc/:id` | Folk; NPC marker on the map | Back to Folk; keepsake goes in the Satchel |
| Warden page | `#/folk/warden/:id` | Folk; pennant on the map | Trust, monthly jobs, weekly note, Call it |
| Call it | `#/folk/callit/:wardenId` | Warden page | Pick 5 → pending; settled by your next logged visit (within 7 days) → result banner |
| Badge case | `#/badges` | Dex header; Warden page | Pin → its warden or set |
| Settings, First run | `#/settings`, `#/welcome` | Header button; first launch only | — |

## Tab dots (one small coral dot, never a number)
- **Journal:** unopened parcels (new checklists imported, not yet opened).
- **Folk:** someone is waiting at a spot near your start point you have not met; or a Call it has been settled and not seen.
- **Dex:** a rank-up you have not seen.
- **News chip (Explore header):** a rare bird or a target reported near you in the last day.
Opening the thing clears the dot. Nothing pops up over what you are doing.

## Flows
1. **Back from a trip.** Import (or log) → Journal dot + a banner on Explore ("3 new checklists") → Journal → open a parcel → Field Report → What levelled up → Outing card → back to Journal. Never forced: the banner can be dismissed and the parcels stay.
2. **Chasing a bird.** Dex or profile → Find it → pick a site → Explore with that site selected → Plan a day if wanted.
3. **Meeting people.** Log or import a visit at an NPC's spot → the NPC marker turns to "here" next time you open Explore → tap → encounter → keepsake to the Satchel. Wardens work the same way at their reserve, plus trust and jobs.
4. **Call it.** Warden page → predict 5 birds → "pending" → next logged visit within 7 days settles it → banner → gold badge on a win.

## States every screen must handle
- **Demo data** (before any real import): everything works and is labelled "Demo"; nothing earns anything.
- **Nothing yet:** friendly empty text and one button (Import, Log a sighting), never a blank page.
- **Data is old / history is still filling:** "updated 3 h ago", "about N of 14 days, since 8 Nov".
- **Unknown drive time:** shown as "unknown", never 0.
- **Art missing:** the built-in fallback, so a screen never waits for art.

## Rules that hold everywhere
- Public reports never award progress. Only import or logging does. Sample/demo data never earns badges.
- Every bird links to its profile; every site opens the same site sheet; every person opens the same encounter or warden page.
- Back always goes where you came from; tabs reset to their first screen when tapped twice.
- Phone first: 390 px wide, thumb-reach controls, 44 px minimum targets, reduced motion respected.

## Build order this implies
1. Shell: four tabs, routes above (stubs for the new ones), dots. Dialogue and sheet components (U0).
2. Journal parcels → report → levelled up → card (N5), with the Dex rank frames (B4/N6/C2).
3. Explore additions: News chip, Find a bird, Plan a day, explored/unexplored (N7).
4. Folk: encounters (needs P12b scripts), warden page, Call it, Satchel, Badge case.
5. First run, credits, accessibility, hand-over note.
