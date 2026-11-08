// Prints a draft of the Reserve Wardens for every region in the cached data (AUTOPILOT D2). 0 API calls.
// Usage: tsx pipeline/warden-draft.ts [--dir=.cache/bq-data]
// Read the output, then write src/data/wardens.v1.json by hand. Nothing here is published.
import { appendFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { IndexSchema, RegionSchema } from '../src/data/published-schema.ts'
import { draftWardens } from './wardens.ts'

const config = JSON.parse(readFileSync('pipeline/config/regions.json', 'utf8')) as { regions: { id: string; wardenCount?: number; wardenMaxDriveMin?: number; wardenSpacingKm?: number }[] }

const dir = process.argv.find((a) => a.startsWith('--dir='))?.split('=')[1] ?? '.cache/bq-data'
const index = IndexSchema.parse(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')))
const locations: Record<string, ReturnType<typeof draftWardens>> = {}
const lines = [`# Warden draft (data from ${index.generatedAt}${index.isDemo ? ', DEMO data' : ''})`, '']
for (const ref of index.regions) {
  const region = RegionSchema.parse(JSON.parse(readFileSync(join(dir, ref.file), 'utf8')))
  const c = config.regions.find((r) => r.id === ref.id)
  const wardens = draftWardens(region, { count: c?.wardenCount, maxDriveMin: c?.wardenMaxDriveMin, spacingKm: c?.wardenSpacingKm })
  locations[ref.id] = wardens
  lines.push(`## ${ref.label} (${ref.id}): ${wardens.length} wardens`)
  for (const w of wardens) lines.push(`- ${w.id} at ${w.siteName} [${w.siteId}], ${w.habitat}, ${w.notes.dexSpecies} Dex species, ${w.notes.driveMin} min; boss ${w.boss} (${w.notes.bossSites} sites)`)
  lines.push('')
}
const publishable = Object.fromEntries(Object.entries(locations).map(([id, ws]) => [id, ws.map(({ notes: _notes, ...w }) => w)]))
lines.push('```json', JSON.stringify({ schema: 1, version: 'wardens-v1', locations: publishable }, null, 1), '```')
const text = lines.join('\n')
console.log(text)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n')
