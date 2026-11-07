// Short display names for birding sites. eBird hotspot names carry designations and county tails
// ("Rainham Marshes RSPB Reserve", "Pennington Flash CP (Lancashire)") that make the map card huge.
// The card shows the short form; the full name and designation live in the expanded details.

const WORDS = ['local nature reserve', 'national nature reserve', 'nature reserve', 'country park', 'rspb', 'wwt', 'lnr', 'nnr', 'sssi', 'cp', 'nr', 'reserve']
const ALT = WORDS.map((w) => w.replace(/ /g, '\\s+')).join('|')
const LEADING = new RegExp(`^(?:${ALT})\\b[\\s,:-]*`, 'i')
const TRAILING = new RegExp(`[\\s,:-]*\\b(?:${ALT})$`, 'i')

export const MAX_SHORT_NAME = 28

/** "Rainham Marshes RSPB Reserve, Essex" -> "Rainham Marshes". Never returns an empty or one-letter name. */
export function shortSiteName(full: string, max: number = MAX_SHORT_NAME): string {
  const original = full.trim()
  let s = original.replace(/\s*\([^)]*\)/g, '') // "(Lancashire)" tails
  s = s.split(',')[0].trim() // ", Essex" tails
  for (let i = 0; i < 4; i++) {
    const next = s.replace(LEADING, '').replace(TRAILING, '').trim()
    if (next === s) break
    s = next
  }
  if (s.length < 4) s = original.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim() || original
  if (s.length > max) {
    const cut = s.slice(0, max + 1)
    const space = cut.lastIndexOf(' ')
    s = (space > 12 ? cut.slice(0, space) : s.slice(0, max)).trimEnd() + '…'
  }
  return s
}

/** The full name when it says more than the short one (shown in the expanded details), else null. */
export function fullDesignation(full: string): string | null {
  const t = full.trim()
  return shortSiteName(t) === t ? null : t
}
