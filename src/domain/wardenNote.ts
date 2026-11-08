// The warden's weekly note (AUTOPILOT P10). Pure.
// One fact from the published data, in the warden's own voice. Never invents a number: a count of days appears only when the
// pipeline's report history has it, and every note says what it is based on.
import type { RegionData, Report, Site } from '../data/published-schema'
import { voiceFor, type Warden } from '../data/game'
import { BAND_PHRASE } from './news'
import { bestBand, daysReported } from './reliability'
import { buildRarity, rarityOf, type RarityTable } from './rarity'
import { rngFor } from './random'
import { shortSiteName } from './siteName'

export type NoteKind = 'rare' | 'reliable' | 'seen' | 'quiet'

export interface WardenNote {
  text: string
  /** Where the fact comes from, e.g. "eBird reports, last 14 days". */
  basis: string
  kind: NoteKind
  /** The bird the note is about (its eBird code), when it has one. */
  birdCode: string | null
}

/** ISO week key such as `2026-W45` (weeks start on Monday), from the phone's own calendar date. */
export function weekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day) // the Thursday of this week decides the year
  const year = d.getUTCFullYear()
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const prettyDate = (iso: string): string => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

const stamp = (r: Report): string => `${r.obsDate}T${r.obsTime ?? '23:59'}`

/** "eBird reports, last 14 days", plus "counted since 8 Nov" while the report history is still filling up. */
function basisText(region: RegionData, withHistory: boolean): string {
  let s = `eBird reports, last ${region.windowDays} days`
  if (withHistory && region.historySince) {
    const gen = Date.parse(region.generatedAt.slice(0, 10))
    const since = Date.parse(region.historySince)
    if (!Number.isNaN(gen) && !Number.isNaN(since) && (gen - since) / 86_400_000 < region.windowDays - 1) s += `, days counted since ${prettyDate(region.historySince)}`
  }
  return s
}

function pick<T>(list: readonly T[], seed: string): T {
  return list[Math.floor(rngFor(seed)() * list.length)]
}

const fillText = (text: string, slots: Record<string, string>): string => text.replace(/\{([a-zA-Z]+)\}/g, (_, k: string) => slots[k] ?? '')

/** The note for a warden this week. `site` is the warden's own site in the published data (null when it has left the data). */
export function wardenNote(warden: Warden, site: Site | null, region: RegionData, week: string, rarity?: RarityTable): WardenNote | null {
  const voice = voiceFor(warden.persona)
  if (!voice) return null
  const table = rarity ?? buildRarity(region)
  const seed = `${warden.id}${week}`
  const siteName = shortSiteName(site?.name ?? warden.siteName, 40)
  const slots: Record<string, string> = { site: siteName, window: String(region.windowDays) }
  const reports = site?.reports ?? []

  // 1. A rare or scarce bird at this site (newest report first). Unconfirmed ones get an honest extra line.
  const rareReports = reports
    .filter((r) => {
      const tier = rarityOf(table, r.sciName).tier
      return tier === 'rare' || tier === 'scarce' || r.notable === true
    })
    .sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.name.localeCompare(b.name))
  if (rareReports.length > 0) {
    const r = rareReports[0]
    const band = bestBand(r.bands)
    const branch = band ? 'rareBand' : 'rare'
    const text = fillText(pick(voice[branch], seed), { ...slots, bird: r.name, band: band ? BAND_PHRASE[band] : '' })
    return { text: r.unconfirmed ? `${text} It is still waiting for eBird to review it.` : text, basis: basisText(region, band !== null), kind: 'rare', birdCode: r.ebirdCode }
  }

  // 2. The most reliable signature bird: reported on the most days. Needs the report history.
  const signature = warden.signature
  const sigReports = signature.flatMap((id) => {
    const r = reports.find((x) => x.speciesId === id)
    return r ? [{ r, order: signature.indexOf(id), days: daysReported(r.days) }] : []
  })
  const withDays = sigReports.filter((x) => x.days !== null && x.days > 0)
  if (withDays.length > 0) {
    withDays.sort((a, b) => (b.days ?? 0) - (a.days ?? 0) || a.order - b.order)
    const top = withDays[0]
    return {
      text: fillText(pick(voice.reliable, seed), { ...slots, bird: top.r.name, days: String(top.days) }),
      basis: basisText(region, true),
      kind: 'reliable',
      birdCode: top.r.ebirdCode,
    }
  }

  // 3. No history yet, but a signature bird has been reported: say so without any day count.
  if (sigReports.length > 0) {
    sigReports.sort((a, b) => stamp(b.r).localeCompare(stamp(a.r)) || a.order - b.order)
    const top = sigReports[0]
    return { text: fillText(pick(voice.seen, seed), { ...slots, bird: top.r.name }), basis: basisText(region, false), kind: 'seen', birdCode: top.r.ebirdCode }
  }

  // 4. A quiet week.
  return { text: fillText(pick(voice.quiet, seed), slots), basis: basisText(region, false), kind: 'quiet', birdCode: null }
}
