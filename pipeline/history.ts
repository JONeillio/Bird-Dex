// Report history (AUTOPILOT P1). eBird's recent-observations feed gives only the LATEST report per species per site,
// so "reported on 9 of the last 14 days" needs memory between refreshes. This module is that memory: pure functions,
// no network, no disk (run.ts reads and writes the file). The file lives in the Actions cache only: never in git,
// never published. Only dates, HH:MM times, eBird species codes and hotspot ids are kept: no observer names, no counts.
//
// Honest limits: two refreshes a day catch most report days, but a checklist submitted late, after a newer one for
// the same species and site, is never seen, so the app says "about N of 14 days". Reports still awaiting review
// (unconfirmed) are not remembered. Times are only known for reports that eBird gives with a time.
import { z } from 'zod'
import { timeBand } from '../src/domain/time.ts'
import type { Report, Site } from '../src/data/published-schema.ts'

/** Sits in the cache folder next to the published JSON, so every copy of the cache into the site must skip it. */
export const HISTORY_FILE = 'history.json'
export const KEEP_DAYS = 30
export const MAX_TIMES = 20
/** Most days the `days` bitmask can describe (bit 0 to bit 13). */
export const MAX_WINDOW_BITS = 14

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const hhmm = z.string().regex(/^\d{2}:\d{2}$/)

export const HistorySchema = z.object({
  schema: z.literal(1),
  since: isoDate,
  /** hotspot id -> eBird species code -> distinct report dates and times, both newest first. */
  sites: z.record(z.string(), z.record(z.string(), z.object({ d: z.array(isoDate).max(KEEP_DAYS), t: z.array(hhmm).max(MAX_TIMES) }))),
})
export type History = z.infer<typeof HistorySchema>
type Entry = History['sites'][string][string]
export type Bands = NonNullable<Report['bands']>

/** True for files that may be copied into the published site (everything except the history file). */
export const isPublishable = (path: string): boolean => path.split(/[\\/]/).pop() !== HISTORY_FILE

const DAY = 86_400_000
const dayNumber = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY)
/** Whole days from `date` up to `today` (0 = same day, 1 = yesterday, -1 = tomorrow). */
export const daysAgo = (today: string, date: string): number => dayNumber(today) - dayNumber(date)

export function emptyHistory(today: string): History {
  return { schema: 1, since: today, sites: {} }
}

/** Read a history file's text. Anything wrong with it gives null, and the caller starts again (and says so). */
export function parseHistory(text: string): History | null {
  try {
    const r = HistorySchema.safeParse(JSON.parse(text))
    return r.success ? r.data : null
  } catch {
    return null
  }
}

/**
 * Fold every report just fetched into the history, drop dates older than 30 days, and drop every site that is no
 * longer listed. `today` is the date of this refresh. A date already remembered is not added twice, and its time is
 * not added again either, so merging the same data twice changes nothing.
 */
export function mergeHistory(prev: History | null, sites: Site[], today: string): History {
  const next: History['sites'] = {}
  for (const site of sites) {
    const known = next[site.id] ?? Object.fromEntries(Object.entries(prev?.sites[site.id] ?? {}).map(([code, e]) => [code, { d: [...e.d], t: [...e.t] }]))
    next[site.id] = known
    for (const r of site.reports) {
      if (r.unconfirmed) continue
      const age = daysAgo(today, r.obsDate)
      if (age < -1 || age >= KEEP_DAYS) continue // a future date (bad data) or already too old
      const e: Entry = (known[r.ebirdCode] ??= { d: [], t: [] })
      if (e.d.includes(r.obsDate)) continue
      e.d.push(r.obsDate)
      e.d.sort().reverse() // ISO dates sort as text; newest first
      if (r.obsTime) {
        if (e.d[0] === r.obsDate) e.t.unshift(r.obsTime)
        else e.t.push(r.obsTime)
      }
    }
    for (const [code, e] of Object.entries(known)) {
      e.d = e.d.filter((d) => daysAgo(today, d) < KEEP_DAYS).slice(0, KEEP_DAYS)
      e.t = e.t.slice(0, MAX_TIMES)
      if (e.d.length === 0) delete known[code]
    }
    if (Object.keys(known).length === 0) delete next[site.id]
  }
  return { schema: 1, since: prev?.since ?? today, sites: next }
}

/**
 * Bitmask of the days in the window on which the bird was reported: bit 0 = `generatedDate`, bit 1 = the day before.
 * A date one day ahead (eBird dates are local, the generated date is UTC) counts as today.
 */
export function daysMask(dates: readonly string[], generatedDate: string, windowDays: number): number {
  const bits = Math.min(windowDays, MAX_WINDOW_BITS)
  let mask = 0
  for (const d of dates) {
    let k = daysAgo(generatedDate, d)
    if (k === -1) k = 0
    if (k >= 0 && k < bits) mask |= 1 << k
  }
  return mask
}

/** How many days are set in a `days` bitmask. */
export function countDays(mask: number): number {
  let n = 0
  for (let m = mask; m > 0; m >>= 1) n += m & 1
  return n
}

export function bandCounts(times: readonly string[]): Bands {
  const out: Bands = { dawn: 0, day: 0, dusk: 0, night: 0 }
  for (const t of times) {
    const b = timeBand(t)
    if (b) out[b]++
  }
  return out
}

/** The sites with `days` (and `bands`, when any time is known) filled in from the history. Other fields untouched. */
export function withHistory(sites: Site[], history: History, generatedDate: string, windowDays: number): Site[] {
  return sites.map((site) => ({
    ...site,
    reports: site.reports.map((r) => {
      const e = history.sites[site.id]?.[r.ebirdCode]
      if (!e || r.unconfirmed) return r
      const bands = bandCounts(e.t)
      const any = bands.dawn + bands.day + bands.dusk + bands.night > 0
      return { ...r, days: daysMask(e.d, generatedDate, windowDays), ...(any ? { bands } : {}) }
    }),
  }))
}

/** A short line for the run summary. */
export function historyStats(h: History): { sites: number; pairs: number } {
  return { sites: Object.keys(h.sites).length, pairs: Object.values(h.sites).reduce((n, s) => n + Object.keys(s).length, 0) }
}
