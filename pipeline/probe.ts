// T0.6: what do eBird and openrouteservice really return, and what does it cost?
// Summary-only output: counts, field names, status codes, timings. No keys, no raw payloads,
// no hotspot names or ids (the report is a downloadable artifact on a public repo).
import { timedFetch, writeReport, fieldNames, redact, type Timed } from './lib/http.ts'

// Public landmark used as the routing start (never a home address).
const START = { name: 'Chorlton Green', lat: 53.4412, lng: -2.2735 }
const EBIRD = 'https://api.ebird.org/v2'
const ORS = 'https://api.heigit.org/openrouteservice/v2'

const ebirdKey = process.env.EBIRD_API_KEY
const orsKey = process.env.ORS_API_KEY
const eb = (path: string): Promise<Timed> =>
  timedFetch(`${EBIRD}${path}`, { headers: { 'X-eBirdApiToken': ebirdKey ?? '' } })

type Step = Record<string, unknown>
const report: Record<string, Step> = {}
const lines: string[] = ['# Probe report', '', `Start point: ${START.name} (public landmark). Run: ${new Date().toISOString()}`, '']

function brief(t: Timed): Step {
  return { status: t.status, ms: t.ms, kb: Math.round(t.bytes / 102.4) / 10, ...(t.error ? { error: t.error } : {}), ...(Object.keys(t.headers).length ? { headers: t.headers } : {}) }
}
function log(title: string, s: Step, note = ''): void {
  report[title] = s
  lines.push(`## ${title}`, '```json', JSON.stringify(s, null, 1), '```', note, '')
}

async function main(): Promise<void> {
  log('keys', { ebirdKeyPresent: !!ebirdKey, orsKeyPresent: !!orsKey })

  let hotspots: { lat: number; lng: number; locId: string }[] = []

  if (ebirdKey) {
    // 1. Region lookup: which code is Greater Manchester?
    const regions = await eb('/ref/region/list/subnational2/GB-ENG')
    const list = Array.isArray(regions.json) ? (regions.json as { code: string; name: string }[]) : []
    const gm = list.filter((r) => /manchester/i.test(r.name))
    log('ebird region list (England subnational2)', { ...brief(regions), count: list.length, manchesterMatches: gm }, 'Region codes are public reference data.')

    // 2. Hotspots near the start point, and by region code if we found one.
    const geo = await eb(`/ref/hotspot/geo?lat=${START.lat}&lng=${START.lng}&dist=40&fmt=json`)
    const geoArr = Array.isArray(geo.json) ? (geo.json as Record<string, unknown>[]) : []
    hotspots = geoArr
      .filter((h) => typeof h.lat === 'number' && typeof h.lng === 'number' && typeof h.locId === 'string')
      .map((h) => ({ lat: h.lat as number, lng: h.lng as number, locId: h.locId as string }))
    log('ebird hotspots by geo (40 km)', { ...brief(geo), count: geoArr.length, fields: fieldNames(geoArr) })

    if (gm[0]) {
      const byRegion = await eb(`/ref/hotspot/${gm[0].code}?fmt=json`)
      const arr = Array.isArray(byRegion.json) ? (byRegion.json as unknown[]) : []
      log(`ebird hotspots by region (${gm[0].code})`, { ...brief(byRegion), count: arr.length, fields: fieldNames(arr) })
    }

    // 3. Recent observations at the 3 nearest-looking hotspots (one request each).
    const obsSteps: Step[] = []
    for (const h of hotspots.slice(0, 3)) {
      const o = await eb(`/data/obs/${h.locId}/recent?back=14&detail=full`)
      const arr = Array.isArray(o.json) ? (o.json as Record<string, unknown>[]) : []
      obsSteps.push({ ...brief(o), count: arr.length, fields: fieldNames(arr), hasObsValid: arr.some((r) => 'obsValid' in r), hasLocationPrivate: arr.some((r) => 'locationPrivate' in r) })
    }
    log('ebird recent obs at hotspot (back=14, detail=full)', { samples: obsSteps as unknown as Step })

    // 4. Recent observations around the start point (one request, a whole area).
    const area = await eb(`/data/obs/geo/recent?lat=${START.lat}&lng=${START.lng}&dist=25&back=14&maxResults=200`)
    const areaArr = Array.isArray(area.json) ? (area.json as Record<string, unknown>[]) : []
    const species = new Set(areaArr.map((r) => r.speciesCode))
    log('ebird recent obs by geo (25 km, back=14)', { ...brief(area), records: areaArr.length, distinctSpecies: species.size, fields: fieldNames(areaArr) }, 'Compare with step 3: one geo call vs many per-hotspot calls.')

    // 5. Taxonomy size and fields.
    const tax = await eb('/ref/taxonomy/ebird?fmt=json&locale=en_GB&cat=species')
    const taxArr = Array.isArray(tax.json) ? (tax.json as Record<string, unknown>[]) : []
    log('ebird taxonomy (en_GB, species only)', { ...brief(tax), count: taxArr.length, fields: fieldNames(taxArr) })

    // 6. Gentle burst: 5 quick calls, to see whether any rate headers or 429s appear.
    const burst = await Promise.all([1, 2, 3, 4, 5].map(() => eb('/ref/region/info/GB-ENG-GTM')))
    log('ebird burst of 5 parallel calls', { statuses: burst.map((b) => b.status), maxMs: Math.max(...burst.map((b) => b.ms)) })
  } else {
    log('ebird', { skipped: 'EBIRD_API_KEY not available to this run' })
  }

  // 7. openrouteservice: one-to-many matrix from the start point.
  if (orsKey) {
    const dest = hotspots.length ? hotspots.slice(0, 20) : [{ lat: 53.38, lng: -2.35, locId: 'x' }]
    const body = {
      locations: [[START.lng, START.lat], ...dest.map((h) => [h.lng, h.lat])], // [lng, lat]
      sources: [0],
      destinations: dest.map((_, i) => i + 1),
      metrics: ['duration', 'distance'],
      units: 'km',
    }
    const m = await timedFetch(`${ORS}/matrix/driving-car`, {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = (m.json ?? {}) as { durations?: (number | null)[][]; distances?: (number | null)[][]; metadata?: Record<string, unknown>; error?: unknown }
    const d = j.durations?.[0] ?? []
    const mins = d.filter((x): x is number => typeof x === 'number').map((x) => Math.round(x / 60))
    log('ors matrix one-to-many (driving-car)', {
      ...brief(m),
      destinations: dest.length,
      returned: d.length,
      nullCount: d.filter((x) => x === null).length,
      minutesMin: mins.length ? Math.min(...mins) : null,
      minutesMax: mins.length ? Math.max(...mins) : null,
      topLevelKeys: Object.keys(j).sort(),
      metadataKeys: j.metadata ? Object.keys(j.metadata).sort() : [],
      ...(m.ok ? {} : { errorShape: redact(JSON.stringify(j.error ?? '').slice(0, 200)) }),
    })
  } else {
    log('ors', { skipped: 'ORS_API_KEY not available to this run' })
  }

  writeReport('probe-report', report, lines.join('\n'))
}

main().catch((e) => {
  console.error(redact(e instanceof Error ? e.message : String(e)))
  process.exitCode = 1
})
