// Data pipeline. Usage: tsx pipeline/run.ts --task=deploy|refresh
//   refresh  fetch eBird reports and drive times for every preset location, write pipeline/out and the cache
//   deploy   reuse the cached data (0 requests); if there is none yet and keys are present, fetch once
// The cache (.cache/bq-data) is restored and saved by the workflow with actions/cache, so the data never
// enters git. If a refresh fails and a cache exists, the old data is deployed and the run says so.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { timedFetch, redact } from './lib/http.ts'
import { cleanHotspot, mergeNotable, pickBetweenSites, rankHotspots, toBetween, toDrive, toReports, toSite, unmatched, type CleanHotspot, type RawHotspot, type RawObs } from './build.ts'
import { IndexSchema, RegionRefSchema, RegionSchema, type PublishedIndex, type RegionData, type Site } from '../src/data/published-schema.ts'
import { StarterDexSchema } from '../src/data/schema.ts'

const OUT = 'pipeline/out'
const CACHE = '.cache/bq-data'
const EBIRD = 'https://api.ebird.org/v2'
const ORS = 'https://api.heigit.org/openrouteservice/v2'

interface Config {
  windowDays: number
  hotspotRadiusKm: number
  maxSites: number
  /** Extra hotspots allowed in just because they had a rarity. */
  maxRaritySites?: number
  regions: PublishedIndex['regions'][number][]
}

const task = process.argv.find((a) => a.startsWith('--task='))?.split('=')[1] ?? 'deploy'
const ebirdKey = process.env.EBIRD_API_KEY
const orsKey = process.env.ORS_API_KEY
const summary: string[] = []
const say = (s: string) => {
  console.log(redact(s))
  summary.push(redact(s))
}

class StopRun extends Error {}
let ebirdCalls = 0
let orsCalls = 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function eb(path: string): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(300) // be gentle: well under any reasonable limit
    ebirdCalls++
    const r = await timedFetch(`${EBIRD}${path}`, { headers: { 'X-eBirdApiToken': ebirdKey ?? '' } })
    if (r.status === 401 || r.status === 403 || r.status === 429) throw new StopRun(`eBird said ${r.status}; stopping this run`)
    if (r.ok) return r.json
    if (r.status !== 0) return null // a real HTTP error: skip this item, don't retry
  }
  return null
}

async function fetchRegion(cfg: Config, region: Config['regions'][number], dexBySci: Map<string, string>): Promise<RegionData> {
  const [lng, lat] = region.centre
  const raw = await eb(`/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=${cfg.hotspotRadiusKm}&back=${cfg.windowDays}&fmt=json`)
  const active = (Array.isArray(raw) ? (raw as RawHotspot[]) : []).map(cleanHotspot).filter((h): h is CleanHotspot => !!h)
  const chosen = rankHotspots(active, cfg.maxSites)

  let sites: Site[] = []
  for (const h of chosen) {
    const obs = await eb(`/data/obs/${encodeURIComponent(h.id)}/recent?back=${cfg.windowDays}&sppLocale=en_GB`)
    sites.push(toSite(h, toReports(Array.isArray(obs) ? (obs as RawObs[]) : [], dexBySci)))
  }

  // Rarities: one call for the whole area. Added before routing so new hotspots get drive times too.
  const rawNotable = await eb(`/data/obs/geo/recent/notable?lat=${lat}&lng=${lng}&dist=${cfg.hotspotRadiusKm}&back=${cfg.windowDays}&detail=simple&sppLocale=en_GB`)
  const notable = Array.isArray(rawNotable) ? (rawNotable as RawObs[]) : []
  const merged = mergeNotable(sites, notable, dexBySci, cfg.maxRaritySites ?? 30)
  sites = merged.sites
  const unconfirmed = notable.filter((o) => o.obsValid !== true).length
  say(`- ${region.label} rarities: ${notable.length} records (${unconfirmed} not yet confirmed), ${merged.skippedPrivate} at private locations left out, ${merged.added} extra hotspots added`)

  const byStart: RegionData['drive']['byStart'] = {}
  let computedAt: string | null = null
  for (const sp of region.startPoints) {
    if (!orsKey || sites.length === 0) break
    orsCalls++
    const res = await timedFetch(`${ORS}/matrix/driving-car`, {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [sp.point, ...sites.map((s) => s.point)], // [lng, lat]
        sources: [0],
        destinations: sites.map((_, i) => i + 1),
        metrics: ['duration', 'distance'],
      }),
    })
    const j = (res.json ?? {}) as { durations?: (number | null)[][]; distances?: (number | null)[][] }
    if (!res.ok) say(`- Drive times for ${sp.label}: openrouteservice returned ${res.status}; all marked unknown`)
    byStart[sp.id] = toDrive(sites.map((s) => s.id), j.durations?.[0], j.distances?.[0])
    if (res.ok) computedAt = new Date().toISOString()
    if (res.headers['x-ratelimit-remaining']) say(`- openrouteservice requests left today: ${res.headers['x-ratelimit-remaining']}`)
  }

  // Site-to-site drive times for the day planner: one more matrix request per region (the busiest sites, both ways).
  let between: RegionData['between']
  if (orsKey && sites.length >= 2) {
    const picked = pickBetweenSites(sites)
    orsCalls++
    const res = await timedFetch(`${ORS}/matrix/driving-car`, {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: picked.map((s) => s.point), metrics: ['duration'] }), // [lng, lat]; all sources and destinations
    })
    if (res.ok) {
      between = toBetween(picked.map((s) => s.id), (res.json as { durations?: (number | null)[][] } | null)?.durations)
      const known = between.s.flat().filter((v) => v !== null).length - picked.length // not counting the diagonal
      say(`- ${region.label} site-to-site: ${picked.length} sites, ${known} of ${picked.length * (picked.length - 1)} drive times known`)
    } else say(`- Site-to-site times for ${region.label}: openrouteservice returned ${res.status}; left out (the planner says it is not ready)`)
  }

  const now = new Date().toISOString()
  return RegionSchema.parse({
    schema: 1,
    regionId: region.id,
    generatedAt: now,
    isDemo: false,
    windowDays: cfg.windowDays,
    coverage: {
      hotspotsListed: active.length,
      hotspotsActive: active.length,
      reportsFetchedFor: sites.length,
      truncated: active.length > sites.length,
      note: `Showing the ${sites.length} busiest birding sites within ${cfg.hotspotRadiusKm} km that had reports in the last ${cfg.windowDays} days.`,
    },
    sites,
    drive: { computedAt, byStart },
    unmatchedSpecies: unmatched(sites),
    ...(between ? { between } : {}),
  } satisfies RegionData)
}

async function refresh(): Promise<void> {
  if (!ebirdKey) throw new Error('EBIRD_API_KEY is not available to this run')
  const cfg = JSON.parse(readFileSync('pipeline/config/regions.json', 'utf8')) as Config
  cfg.regions.forEach((r) => RegionRefSchema.parse(r)) // fail before spending any requests
  const dex = StarterDexSchema.parse(JSON.parse(readFileSync('src/data/catalogue/starter-dex.v1.json', 'utf8')))
  const dexBySci = new Map(dex.species.map((s) => [s.sciName, s.id]))
  const t0 = Date.now()

  const tmp = `${OUT}.tmp`
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(join(tmp, 'region'), { recursive: true })
  for (const region of cfg.regions) {
    const data = await fetchRegion(cfg, region, dexBySci)
    writeFileSync(join(tmp, region.file), JSON.stringify(data))
    const reports = data.sites.reduce((n, s) => n + s.reports.length, 0)
    const dexSpecies = new Set(data.sites.flatMap((s) => s.reports.map((r) => r.speciesId).filter(Boolean))).size
    const unknown = Object.values(data.drive.byStart).flatMap((m) => Object.values(m)).filter((d) => d.status === 'unknown').length
    say(`- ${region.label}: ${data.sites.length} sites (of ${data.coverage.hotspotsActive} active), ${reports} reports, ${dexSpecies} Starter Dex species, ${data.unmatchedSpecies.length} other species, ${unknown} unknown drive times`)
  }
  const index = IndexSchema.parse({ schema: 1, generatedAt: new Date().toISOString(), isDemo: false, regions: cfg.regions } satisfies PublishedIndex)
  writeFileSync(join(tmp, 'index.json'), JSON.stringify(index))

  // Only replace the published data once everything validated (never a half-built set).
  rmSync(OUT, { recursive: true, force: true })
  cpSync(tmp, OUT, { recursive: true })
  rmSync(tmp, { recursive: true, force: true })
  rmSync(CACHE, { recursive: true, force: true })
  mkdirSync('.cache', { recursive: true })
  cpSync(OUT, CACHE, { recursive: true })
  say(`- Requests: eBird ${ebirdCalls}, openrouteservice ${orsCalls}. Took ${Math.round((Date.now() - t0) / 1000)} s.`)
}

function reuse(): boolean {
  if (!existsSync(join(CACHE, 'index.json'))) return false
  rmSync(OUT, { recursive: true, force: true })
  cpSync(CACHE, OUT, { recursive: true })
  const idx = IndexSchema.parse(JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8')))
  say(`- Reused cached data from ${idx.generatedAt} (0 requests).`)
  return true
}

async function main(): Promise<void> {
  say(`# Data (${task})`)
  if (task === 'refresh') {
    try {
      await refresh()
    } catch (e) {
      say(`- Refresh failed: ${e instanceof Error ? e.message : String(e)}`)
      if (!reuse()) throw e
      say('- Deploying the previous data instead; the app shows how old it is.')
    }
  } else if (!reuse()) {
    if (ebirdKey) {
      say('- No cached data yet: fetching once.')
      await refresh()
    } else say('- No cached data and no keys: the app will fall back to its labelled demo data.')
  }
  const out = process.env.GITHUB_STEP_SUMMARY
  if (out) appendFileSync(out, summary.join('\n') + '\n')
}

main().catch((e) => {
  console.error(redact(e instanceof Error ? e.message : String(e)))
  process.exit(1)
})
