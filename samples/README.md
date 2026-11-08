# Sample eBird export (made up)

`MyEBirdData-sample.csv` is an invented "Download My Data" file in eBird's own columns, and `MyEBirdData-sample.zip` is the same file zipped the way eBird emails it (for testing ZIP import, AP B1b). About 2,200 rows over roughly 240 checklists from January 2024 to 8 Nov 2026, at 12 invented "Sample …" sites (`L99…`), with submission ids starting `SMP` so nothing can match a real checklist.

It is the same data as Journal → Import → "Try a sample history". Rebuild with `npx tsx scripts/dev/make-sample-export.ts` (a test fails if the files drift from the generator).

Real exports never go here: use `private-data/` (gitignored).
