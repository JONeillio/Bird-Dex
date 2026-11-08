// "Paste a list": one bird per line, with an optional date ("Eurasian Wren, 2026-10-12").
// Matches Starter Dex birds by name only. Anything else is listed for review, never guessed or half-imported.
import type { DexSpecies } from '../schema'
import { parseEbirdDate, type EbirdParsed, type ImportRow, type ReviewRow } from './ebird-csv'

export const MAX_LIST_LINES = 2000

/** Lower case, no apostrophes, hyphens and punctuation become spaces: "Eurasian  Wren" = "eurasian wren". */
export function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Dex names, eBird names and the plain "Robin"-style names that differ only in case or hyphens all map to one id. */
export function buildNameIndex(species: readonly DexSpecies[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const s of species) {
    for (const n of [s.name, s.ebirdName]) {
      const k = normaliseName(n)
      if (k && !index.has(k)) index.set(k, s.id)
    }
  }
  return index
}

/** Strip list decoration: "- ", "• ", "1. ", "2) ". */
const stripBullet = (l: string) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()

export interface PastedListOptions {
  species: readonly DexSpecies[]
  /** Today as YYYY-MM-DD; dates after it need review. */
  today: string
}

export function parsePastedList(text: string, opts: PastedListOptions): EbirdParsed {
  const index = buildNameIndex(opts.species)
  const rows: ImportRow[] = []
  const review: ReviewRow[] = []
  let total = 0
  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = i + 1
    const t = stripBullet(raw)
    if (!t) return
    if (total >= MAX_LIST_LINES) {
      if (total === MAX_LIST_LINES) review.push({ line, name: '(rest of the list)', date: '', reason: `Only the first ${MAX_LIST_LINES} lines are read` })
      total++
      return
    }
    total++
    const comma = t.indexOf(',')
    const name = (comma < 0 ? t : t.slice(0, comma)).trim()
    const dateRaw = comma < 0 ? '' : t.slice(comma + 1).trim()
    const flag = (reason: string) => review.push({ line, name: name.slice(0, 60) || '(no name)', date: dateRaw.slice(0, 20), reason })

    const id = index.get(normaliseName(name))
    if (!id) return flag('Not a Starter Dex bird name')
    let date: string | null = null
    if (dateRaw) {
      date = parseEbirdDate(dateRaw)
      if (!date) return flag('Date not understood (use YYYY-MM-DD)')
      if (date > opts.today) return flag('Date is in the future')
    }
    rows.push({ speciesId: id, date, time: null, siteId: null, place: '', importKey: `list:${id}:${date ?? 'nodate'}` })
  })
  return { rows, review, totalRows: total }
}
