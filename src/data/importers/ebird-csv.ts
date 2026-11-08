// Reads the file eBird gives you under "Download My Data" (MyEBirdData.csv) into sightings for this phone.
// Pure and synchronous apart from the file streaming in parseEbirdFile; nothing leaves the phone.
//
// Privacy: only the species, date, time, eBird site id and site name are read. Latitude, longitude, comments,
// observer details and checklist details are never looked at, so they cannot be stored or backed up.
import Papa from 'papaparse'
import { validSiteId, type Encounter } from '../personal-schema'
import { dexIdFor, isNotASpecies, outsideId } from '../../domain/taxon'

export interface ImportRow {
  speciesId: string
  /** Names for birds outside the Starter Dex only (Dex birds use the catalogue name). */
  name?: string
  sciName?: string
  /** YYYY-MM-DD. eBird rows without a valid date are never imported; pasted lists may have none (null, never invented). */
  date: string | null
  /** HH:MM, or null. */
  time: string | null
  siteId: string | null
  place: string
  importKey: string
}

export interface ReviewRow {
  /** Line number in the file (the header is line 1). */
  line: number
  name: string
  date: string
  reason: string
}

export interface EbirdParsed {
  rows: ImportRow[]
  review: ReviewRow[]
  /** Data rows read, including ones that need review. */
  totalRows: number
}

export const REQUIRED_COLUMNS = ['common name', 'scientific name', 'date'] as const

const clean = (v: string | undefined) => (v ?? '').trim()

/** The calendar date if it really exists, as YYYY-MM-DD. Accepts YYYY-MM-DD and DD/MM/YYYY (1 or 2 digit day and month). */
export function parseEbirdDate(raw: string): string | null {
  const s = raw.trim()
  let y: number, m: number, d: number
  let a = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (a) [y, m, d] = [Number(a[1]), Number(a[2]), Number(a[3])]
  else if ((a = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) [d, m, y] = [Number(a[1]), Number(a[2]), Number(a[3])]
  else return null
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(y, 4)}-${p(m)}-${p(d)}`
}

/** "07:30 AM", "7:30 pm" or "07:30" to 24-hour HH:MM. Anything else is null (a time is never guessed). */
export function parseEbirdTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/.exec(raw.trim())
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  if (min > 59) return null
  if (m[3]) {
    if (h < 1 || h > 12) return null
    const pm = m[3].toLowerCase() === 'pm'
    h = (h % 12) + (pm ? 12 : 0)
  } else if (h > 23) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** "Brent Goose (Dark-bellied)" -> "Brent Goose"; the form in brackets is not a different bird for a life list. */
const plainName = (n: string) => n.replace(/\s*\([^)]*\)\s*$/, '').trim() || n

/** "Branta bernicla bernicla" -> "Branta bernicla": sub-species count as the species. */
const binomial = (s: string) => s.split(/\s+/).slice(0, 2).join(' ')

export interface EbirdImportOptions {
  /** Starter Dex scientific name to Dex id. */
  dexBySci: ReadonlyMap<string, string>
  /** Today as YYYY-MM-DD; rows dated after it need review. */
  today: string
}

/** Collects rows one at a time so a big file can be streamed in chunks without freezing the phone. */
export function createEbirdImport(opts: EbirdImportOptions) {
  const rows: ImportRow[] = []
  const review: ReviewRow[] = []
  let total = 0
  return {
    /** Header names are matched case-insensitively. Returns a plain-English problem, or null when the file looks right. */
    checkHeaders(fields: readonly string[]): string | null {
      const have = new Set(fields.map((f) => f.trim().toLowerCase()))
      const missing = REQUIRED_COLUMNS.filter((c) => !have.has(c))
      if (missing.length === 0) return null
      return `This does not look like an eBird "Download My Data" file. It has no ${missing.map((m) => `"${m}"`).join(', ')} column.`
    },
    /** `row` is keyed by lower-case header name. */
    addRow(row: Record<string, string | undefined>, line: number): void {
      total++
      const comName = clean(row['common name'])
      const sciRaw = clean(row['scientific name'])
      const dateRaw = clean(row['date'])
      const flag = (reason: string): void => {
        review.push({ line, name: comName || sciRaw || '(no name)', date: dateRaw, reason })
      }

      if (!comName && !sciRaw) return flag('No bird name')
      const date = parseEbirdDate(dateRaw)
      if (!date) return flag(dateRaw ? 'Date not understood' : 'No date')
      if (date > opts.today) return flag('Date is in the future')
      if (!sciRaw) return flag('No scientific name')
      if (isNotASpecies(sciRaw, comName)) return flag('Not a single species (sp., slash, hybrid or domestic)')

      const sci = binomial(sciRaw)
      const dexId = dexIdFor(sciRaw, opts.dexBySci)
      const submission = clean(row['submission id'])
      const place = clean(row['location']).slice(0, 120)
      const importKey = (submission ? `ebird:${submission}:${sciRaw}` : `ebird:${date}:${place}:${sciRaw}`).slice(0, 200)
      rows.push({
        speciesId: dexId ?? outsideId(sci),
        ...(dexId ? {} : { name: plainName(comName || sci).slice(0, 80), sciName: sci.slice(0, 80) }),
        date,
        time: parseEbirdTime(clean(row['time'])),
        siteId: validSiteId(clean(row['location id'])),
        place,
        importKey,
      })
    },
    result(): EbirdParsed {
      return { rows, review, totalRows: total }
    },
  }
}

export type ParseOutcome = { ok: true; parsed: EbirdParsed } | { ok: false; error: string }

const transformHeader = (h: string) => h.replace(/^﻿/, '').trim().toLowerCase()

/** Parse CSV text (small files, tests). Big files go through parseEbirdFile. */
export function parseEbirdCsv(text: string, opts: EbirdImportOptions): ParseOutcome {
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader })
  const imp = createEbirdImport(opts)
  const problem = imp.checkHeaders(res.meta.fields ?? [])
  if (problem) return { ok: false, error: problem }
  res.data.forEach((row, i) => imp.addRow(row, i + 2))
  const parsed = imp.result()
  if (parsed.totalRows === 0) return { ok: false, error: 'That file has no sightings in it.' }
  return { ok: true, parsed }
}

/**
 * Stream a file in chunks so the screen stays responsive and a 30,000-row export does not freeze the phone.
 * `onProgress` gets 0-1.
 */
export function parseEbirdFile(file: File, opts: EbirdImportOptions, onProgress?: (fraction: number) => void): Promise<ParseOutcome> {
  return new Promise((resolve) => {
    const imp = createEbirdImport(opts)
    let line = 1
    let problem: string | null = null
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader,
      chunkSize: 1024 * 512,
      chunk: (res, parser) => {
        if (line === 1) {
          problem = imp.checkHeaders(res.meta.fields ?? [])
          if (problem) {
            parser.abort()
            return
          }
        }
        for (const row of res.data) imp.addRow(row, ++line)
        if (file.size > 0) onProgress?.(Math.min(1, res.meta.cursor / file.size))
      },
      complete: () => {
        if (problem) return resolve({ ok: false, error: problem })
        const parsed = imp.result()
        resolve(parsed.totalRows === 0 ? { ok: false, error: 'That file has no sightings in it.' } : { ok: true, parsed })
      },
      error: () => resolve({ ok: false, error: 'Could not read that file.' }),
    })
  })
}

export interface ImportPlan {
  toAdd: ImportRow[]
  /** Rows skipped because the same sighting is already on this phone (or repeats inside the file). */
  alreadyImported: number
  review: ReviewRow[]
  dexSpecies: number
  dexSightings: number
  otherSpecies: number
  otherSightings: number
}

/** What an import would do: nothing is written until you confirm. Re-importing a newer export only adds new rows. */
export function planEbirdImport(parsed: EbirdParsed, existingKeys: ReadonlySet<string>): ImportPlan {
  const seen = new Set(existingKeys)
  const toAdd: ImportRow[] = []
  let already = 0
  for (const r of parsed.rows) {
    if (seen.has(r.importKey)) already++
    else {
      seen.add(r.importKey)
      toAdd.push(r)
    }
  }
  const dex = new Set<string>()
  const other = new Set<string>()
  let dexSightings = 0
  let otherSightings = 0
  for (const r of toAdd) {
    if (r.speciesId.startsWith('x-')) {
      other.add(r.speciesId)
      otherSightings++
    } else {
      dex.add(r.speciesId)
      dexSightings++
    }
  }
  return { toAdd, alreadyImported: already, review: parsed.review, dexSpecies: dex.size, dexSightings, otherSpecies: other.size, otherSightings }
}

/**
 * Turn rows into saved sightings. eBird does not say whether a bird was seen or heard, so every row is "seen".
 * `newId` makes the record ids; `createdAt` is the time of the import. `source` is 'sample' only for the made-up history and 'list' for a pasted list.
 */
export function rowsToEncounters(rows: readonly ImportRow[], batchId: string, createdAt: string, newId: () => string, source: 'ebird' | 'sample' | 'list' = 'ebird'): Encounter[] {
  return rows.map((r) => ({
    id: newId(),
    speciesId: r.speciesId,
    date: r.date,
    place: r.place,
    mode: 'seen' as const,
    notes: '',
    photo: null,
    createdAt,
    siteId: r.siteId,
    time: r.time,
    ...(r.name ? { name: r.name, sciName: r.sciName } : {}),
    source,
    importBatchId: batchId,
    importKey: r.importKey,
  }))
}
