# Bird-Dex (BirdQuest): notes for Claude sessions

Owner: Joseph (manages everything from his phone via the Claude app). Plain English, UK spelling. The app is for his brother; the demo area is Chorlton, Manchester, and the brother's real location and logging app are NOT confirmed.

## Product in one line
"Where could I go today, within my driving limit, to look for birds missing from my collection?" Pixel-art map, real species, illustrated BirdDex, nearby reports, drive-time filter. Visual target: `research/design/BirdQuest_Concept_Board.png` (Map / BirdDex / Bird profile, bottom tabs Map · BirdDex · Journal).

## Where things are
- `PLAN.md`: the sequenced build plan and open decisions. Start here.
- `research/BirdQuest_Build_Handoff.md`: the active consolidated brief (terms-of-use findings, architecture, acceptance criteria). Takes precedence over anything older.
- `research/art-rendering/`: art contract, asset manifest (22 planned, 0 made), map theme rules, agent briefs, read-only validator. Specification only: not a renderer.
- `skills/`: copied from JONeillio/Evens-model on 7 Nov 2026. Read the relevant one before starting that kind of work (`free-api-budgeting`, `phone-first-pwa`, `github-pages-data-pipeline`, `validate-model-before-trusting`). Only `github-pages-data-pipeline` depends on the hosting decision in PLAN.md.
- App code does not exist yet. When it does, add layout, request costs and run/test commands here.

## Hard rules (from the handoff)
- Provider keys (`EBIRD_API_KEY`, `ORS_API_KEY`) stay server-side. Never in client bundles (no `VITE_` variables), never in git, chat, logs, screenshots or manifests. This repo is public. Never write raw account/status payloads to disk.
- GitHub Actions secrets are set for this repo, but they only reach workflows that explicitly read them. They do not configure a deployed app.
- eBird: personal, non-commercial use; show attribution with source links at the point of display; do not commit or publish raw eBird responses or bulk datasets.
- Routing: use `https://api.heigit.org/openrouteservice/v2` (not the old openrouteservice.org host). Attribution: "© openrouteservice by HeiGIT | Data from OpenStreetMap". Do not send precise home/GPS coordinates to the hosted router: routing starts from a selected public point, labelled "driving from [start point]".
- Public reports never award collection progress. Only explicit import or logging does. Demo data is labelled and never counts toward real achievements.
- Unknown or failed routes are "unknown", never 0 minutes. GeoJSON/routing is `[longitude, latitude]`.
- Real personal exports go in `private-data/` (gitignored), never in the repo.
- Don't create paid subscriptions, domains or a public launch as a side effect. Ask Joseph before switching providers or spending beyond a free plan.

## Working rules
- Test art inventory: `python research/art-rendering/tools/validate_assets.py --root research/art-rendering` (must report 0 production images until real art is approved; that is not an art QA pass).
- Build against demo fixtures first, probe real APIs cheaply before designing around them, and record what each endpoint really returns and costs here.
- Joseph often can't run commands: prefer GitHub Actions `workflow_dispatch` tasks (probe, rebuild) he can tap from his phone.
