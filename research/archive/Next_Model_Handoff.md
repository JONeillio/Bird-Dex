# BirdQuest — next model handoff

Read `BirdQuest_Foundation_Plan.md` first. The user has asked for foundation and planning now, intending to hand implementation to a later model. This package is the result of planning; it is not an existing app or live service.

## User intent, preserved

The user wants an app for his birdwatching brother, with a map of the local area, nearby birds and driving limits. He wants it to feel like Pokémon: a cartoony pixel-art local overworld, an illustrated Pokédex-like bird collection, toggles, groups of birds, and possibly sounds. The app should be delightful enough to use for pleasure and useful enough to choose a birdwatching trip. He has not confirmed the brother's location or actual logging app; Merlin is a possibility.

## Recommended product

Working name BirdQuest. Mobile-first web app/PWA. Primary loop: map → choose drive limit → find an unrecorded/target bird → inspect a birding site and recent reports → directions → deliberate personal log → BirdDex reveal. Manchester/Chorlton is an editable demonstration region only.

Use real geographic vector data with an adventure style, not an AI-painted navigation map. Keep an Adventure/Field toggle. Collection uses original pixel portraits of actual bird species. A generated visual concept, if provided in the conversation, is aesthetic reference; its illustrative map, counts and reports are not data.

## Settled planning decisions

- Use public eBird reports as the first candidate data source, with a local coverage check before committing to a large UI build.
- Use app-owned taxonomy IDs mapped to provider IDs. Provider/display names are not durable join keys.
- Personal history starts with export/import plus explicit manual logging. No supported complete Merlin/eBird OAuth connection was found; do not invent one.
- Public reports and private personal records are different datasets. Public reports never automatically award collection progress.
- Use “unrecorded” rather than “never seen” when personal history may be incomplete.
- MapLibre + OpenFreeMap is the first style approach. Pixel trees, water textures, outlines and bird/site sprites; real roads/water stay in place.
- Route to entrances where reviewed. A sighting/hotspot coordinate is not necessarily a suitable car destination.
- openrouteservice one-to-many matrix is the initial driving approach. No live traffic promise.
- Start with browser-local personal storage and backup/restore. Public provider keys belong in a small backend; no real credentials or personal exports in git.
- Audio is optional: original menu effects and licensed real bird calls are separate systems. No new sound-recognition engine.
- Ship a small consistent sprite set; missing art must not exclude other birds from the data catalogue.

## First task on an implementation handoff

Perform the feasibility stage, then build the smallest complete slice. Do not restart open-ended brainstorming or add many providers.

1. Confirm the target region and logging app when available; otherwise work with a clearly marked Manchester demo.
2. Read current official eBird API docs through normal authorised access. The linked Postman documentation did not render in the previous research environment. Candidate endpoint paths and provisional limits in the plan are not tested contracts.
3. With user-supplied secrets configured through the environment, verify current query semantics and actual site/report coverage. Inspect a private export locally if supplied; do not upload its raw contents unnecessarily.
4. Verify one origin-to-entrances matrix. Include a valid, an unroutable and a failure response state. Check `[lon,lat]` and seconds/minutes.
5. Build a small genuine geographic style experiment on a phone before promising exact pixel-overworld rendering.
6. Implement map → site → bird → log → collection with local persistence, then connect the live adapters. Demo mode remains explicit and separate.

Where credentials are missing, complete the adapter interfaces, fixture-backed journey and setup instructions; say which live checks remain. Never present demo records or guessed travel times as live findings.

## Scope guardrails

No App Store release, accounts/database, trading, battles, currency, global leaderboards, AI ID, weather, historical migration forecasting or multi-source aggregation is required for the first version. No schedule/automation has been requested. Keep provider-sensitive locations generalised. Start as a private non-commercial prototype; Cornell's published terms require attribution and commercial permission if the use changes.

The chosen implementation environment may have its own mandatory starter/deployment workflow. Respect it; the plan's React/Vite/Worker stack is a portable recommendation, not permission to override environment requirements.

## Repository and status

No remote GitHub repo exists from this work. The available GitHub CLI was not logged in. This folder contains planning documents, a TypeScript domain contract proposal and JSON design tokens; it has no package installation, running app, provider authentication or deployment.

If the user next authorises the build, a private `birdquest` repo is a sensible default. Convert these docs into repo documentation; add provider keys only through local/hosted secret controls. Do not ask for passwords or full tokens in chat.

## Definition of done

Use the acceptance criteria in the plan. In particular, test import idempotency/mapping, derived collection totals, public/private separation, time/coordinate units, routed filters, data freshness, map-mode persistence, demo isolation and backup restoration. Verify the layout on a narrow mobile viewport. Clearly report real live checks versus fixtures and unresolved provider limitations.

